from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Sum, Max, Q, DurationField, ExpressionWrapper, F
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from djoser.utils import decode_uid
from django.utils import timezone
from datetime import datetime, timedelta
import json
import traceback

# --- IMPORTS ---
from core.services.MQTTService import get_mqtt_service
from core.models import Pico, SensorReading 
from .models import Desk, DeskUsageLog, DeskLog, DeskReport, Reservation
from .services.WiFi2BLEService import WiFi2BLEService
from .serializers import (
    UserRegisterSerializer,
    UserSerializer,
    DeskSerializer,
    ReservationSerializer,
    AdminUserListSerializer,
    DeskLogSerializer,
)

# ================= HELPER FUNCTIONS =================
# These must be defined BEFORE the views that call them.

def cleanup_expired_reservations():
    """Automatically mark no-show reservations as cancelled"""
    now = timezone.now()
    grace_period = timedelta(minutes=10)
    
    no_shows = Reservation.objects.filter(
        status='confirmed',
        checked_in_at__isnull=True,
        start_time__lt=now - grace_period
    )
    
    count = no_shows.update(
        status='cancelled',
        cancelled_at=now,
        cancelled_by=None  # System cancellation
    )
    
    if count > 0:
        print(f"Auto-cancelled {count} no-show reservation(s)")
    
    return count

def cleanup_expired_active_reservations():
    """
    Finds active reservations where end_time has passed.
    Releases the desk, closes usage logs, and marks reservation as completed.
    """
    now = timezone.now()
    
    # Find active reservations that have expired
    expired_reservations = Reservation.objects.filter(
        status='active',
        end_time__lt=now
    ).select_related('desk', 'user') 

    count = 0

    for reservation in expired_reservations:
        desk = reservation.desk
        user = reservation.user
        
        print(f"Auto-completing expired reservation {reservation.id} for Desk {desk.id}")

        # 1. Close the Active Usage Log
        log = DeskUsageLog.objects.filter(
            user=user, 
            desk=desk, 
            ended_at__isnull=True, 
            source="reservation"
        ).order_by("-started_at").first()

        if log:
            log.ended_at = now
            # Calculate final stats
            last_update = log.last_height_change or log.started_at
            elapsed_seconds = (now - last_update).total_seconds()
            
            if desk.current_height < 95:
                log.sitting_time += int(elapsed_seconds)
            else:
                log.standing_time += int(elapsed_seconds)
            log.save()
        
        # 2. Reset the Desk
        # Only reset if the current user is actually the reservation owner
        if desk.current_user == user:
            desk.current_user = None
            desk.current_status = "available"
            desk.save()
            
            # Notify Pico to clear display
            try:
                mqtt_service = get_mqtt_service()
                if Pico.objects.filter(desk_id=desk.id).exists():
                    mqtt_service.notify_desk_available(desk_id=desk.id)
            except Exception as e:
                print(f"Failed to notify MQTT during cleanup: {e}")

        # 3. Mark Reservation as Completed
        reservation.status = 'completed'
        reservation.checked_out_at = now
        reservation.save()

        # 4. Log it
        DeskLog.objects.create(
            desk=desk,
            user=user,
            action="reservation_auto_completed"
        )
        
        count += 1
    
    if count > 0:
        print(f"Successfully auto-completed {count} expired active reservation(s)")

    return count

def _get_recent_reservations(days=30):
    """Helper function to fetch reservations in the last N days (excluding admins)."""
    now = timezone.now()
    since = now - timedelta(days=days)
    return Reservation.objects.filter(start_time__gte=since, user__is_admin=False)

def _bucket_reservation_minutes_by_hour(reservations, day_start, hours_labels):
    """Return list of utilization percentages per hour for a single day."""
    desks_count = Desk.objects.count() or 1
    results = []

    for hour_label, hour_idx in zip(hours_labels, range(len(hours_labels))):
        start = day_start + timedelta(hours=hour_idx)
        end = start + timedelta(hours=1)

        minutes = 0
        for r in reservations:
            if not r.end_time: continue
            overlap_start = max(r.start_time, start)
            overlap_end = min(r.end_time, end)
            if overlap_start < overlap_end:
                minutes += int((overlap_end - overlap_start).total_seconds() / 60)

        utilization = (minutes / (desks_count * 60)) * 100 if desks_count else 0
        results.append(round(utilization, 1))

    return results


# ================= AUTH VIEWS =================

@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = UserRegisterSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        try:
            response = super().post(request, *args, **kwargs)
            tokens = response.data

            access_token = tokens["access"]
            refresh_token = tokens["refresh"]

            res = Response()
            res.data = {"success": True}

            res.set_cookie(
                key="access_token",
                value=str(access_token),
                httponly=True,
                secure=False,
                samesite="Lax",
                path="/",
            )

            res.set_cookie(
                key="refresh_token",
                value=str(refresh_token),
                httponly=True,
                secure=False,
                samesite="Lax",
                path="/",
            )

            return res

        except Exception as e:
            print(e)
            return Response({"success": False}, status=status.HTTP_400_BAD_REQUEST)


class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        try:
            refresh_token = request.COOKIES.get("refresh_token")
            request.data["refresh"] = refresh_token

            response = super().post(request, *args, **kwargs)
            tokens = response.data
            access_token = tokens["access"]

            res = Response()
            res.data = {"refreshed": True}

            res.set_cookie(
                key="access_token",
                value=access_token,
                httponly=True,
                secure=False,
                samesite="Lax",
                path="/",
            )
            return res

        except Exception as e:
            print(e)
            return Response({"refreshed": False}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        res = Response()
        res.data = {"success": True}
        res.delete_cookie("access_token", path="/", samesite="Lax")
        res.delete_cookie("refresh_token", path="/", samesite="Lax")
        return res

    except Exception as e:
        print(e)
        return Response({"success": False}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def is_logged_in(request):
    serializer = UserSerializer(request.user, many=False)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password_confirm(request, uid, token):
    User = get_user_model()
    try:
        user = User.objects.get(pk=uid)
    except User.DoesNotExist:
        return Response(
            {"error": "Invalid user ID."}, status=status.HTTP_400_BAD_REQUEST
        )

    new_password = request.data.get("new_password")
    re_new_password = request.data.get("re_new_password")

    if not new_password or not re_new_password:
        return Response(
            {"error": "Password fields are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if new_password != re_new_password:
        return Response(
            {"error": "Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST
        )

    if not default_token_generator.check_token(user, token):
        return Response(
            {"error": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST
        )

    user.set_password(new_password)
    user.save()
    return Response({"success": "Password has been reset."}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def list_all_users(request):
    """Admin-only list of users with some analytics aggregates."""
    
    User = get_user_model()

    users = (
        User.objects
        .all()
        .annotate(
            reservations_count=Count('reservations', distinct=True),
            cancellations_count=Count(
                'reservations',
                filter=Q(reservations__status='cancelled'),
                distinct=True,
            ),
            total_reservation_duration=Sum(
                ExpressionWrapper(
                    F('reservations__end_time') - F('reservations__start_time'),
                    output_field=DurationField(),
                ),
                filter=Q(reservations__end_time__isnull=False),
            ),
            last_reservation_at=Max('reservations__start_time'),
        )
        .order_by('-created_at')
    )

    serializer = AdminUserListSerializer(users, many=True)
    return Response(serializer.data)


@api_view(["GET", "PATCH"])
@permission_classes([IsAdminUser])
def user_detail_or_update(request, user_id):
    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    if request.method == "GET":
        serializer = AdminUserListSerializer(user)
        return Response(serializer.data)

    if request.method == "PATCH":
        serializer = AdminUserListSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


@api_view(["POST"])
@permission_classes([AllowAny])
def set_initial_password(request, uid, token):
    User = get_user_model()
    try:
        user_id = decode_uid(uid)
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "Invalid user ID."}, status=status.HTTP_400_BAD_REQUEST
        )

    if not default_token_generator.check_token(user, token):
        return Response(
            {"error": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST
        )

    password = request.data.get("password")
    if not password:
        return Response(
            {"error": "Password is required."}, status=status.HTTP_400_BAD_REQUEST
        )

    user.set_password(password)
    user.is_active = True
    user.save()
    return Response(
        {"success": "Password set and account activated."}, status=status.HTTP_200_OK
    )


# ================= DESK MANAGEMENT ENDPOINTS =================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def desk_detail(request, desk_id):
    """Get desk info from database (including current_status)"""
    try:
        desk = Desk.objects.get(id=desk_id)
        serializer = DeskSerializer(desk)
        return Response(serializer.data)
    except Desk.DoesNotExist:
        return Response({"error": "Desk not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_desks(request):
    """Get all desks from database"""
    desks = Desk.objects.all()
    serializer = DeskSerializer(desks, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_desk_live_status(request, desk_id):
    """Get real-time desk status from WiFi2BLE"""
    try:
        desk = Desk.objects.get(id=desk_id)
    except Desk.DoesNotExist:
        return Response({"error": "Desk not found"}, status=status.HTTP_404_NOT_FOUND)

    service = WiFi2BLEService()
    try:
        live_state = service.get_desk_state(desk.wifi2ble_id)
    except Exception as e:
        return Response(
            {"error": f"Failed to get live desk state: {e}"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if not live_state:
        return Response(
            {"error": "Could not get live status"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response(
        {
            "desk_id": desk.id,
            "name": desk.name,
            "current_height": live_state.get("position_mm", 0) / 10,
            "speed": live_state.get("speed_mms", 0),
            "status": live_state.get("status", "unknown"),
            "is_moving": abs(live_state.get("speed_mms", 0)) > 0,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def desk_usage(request, desk_id):
    # 1. RUN CLEANUP FIRST
    # This checks if any reservations have expired right now.
    # If they have, it closes the logs and resets the desk status.
    cleanup_expired_active_reservations()

    """Get desk usage statistics with live sitting/standing time"""
    try:
        desk = Desk.objects.get(id=desk_id)

        # Get active session
        log = DeskUsageLog.objects.filter(
            desk=desk, 
            ended_at__isnull=True
        ).order_by("-started_at").first()

        # If the cleanup function above ran and closed the log, 'log' will now be None.
        # This correctly triggers the "No active session" response below.
        if not log:
            return Response({
                "desk_id": desk.id, 
                "active_session": False,
                "message": "No active session"
            })

        log.refresh_from_db()

        # Calculate elapsed time
        now = timezone.now()
        started_at = log.started_at
        elapsed_seconds = int((now - started_at).total_seconds())

        # Calculate LIVE sitting/standing time
        last_update = log.last_height_change or log.started_at
        time_since_last_change = int((now - last_update).total_seconds())

        current_sitting_time = log.sitting_time
        current_standing_time = log.standing_time

        if desk.current_height < 95:
            current_sitting_time += time_since_last_change
        else:
            current_standing_time += time_since_last_change

        hours = elapsed_seconds // 3600
        minutes = (elapsed_seconds % 3600) // 60
        seconds = elapsed_seconds % 60

        sitting_minutes = current_sitting_time // 60
        standing_minutes = current_standing_time // 60

        total_time = current_sitting_time + current_standing_time
        sitting_percentage = (current_sitting_time / total_time * 100) if total_time > 0 else 0
        standing_percentage = (current_standing_time / total_time * 100) if total_time > 0 else 0

        # --- Add source and reservation_end_time ---
        source = log.source if hasattr(log, "source") else None
        reservation_end_time = None
        if source == "reservation":
            # Find the active reservation for this user/desk
            reservation = Reservation.objects.filter(
                desk=desk,
                user=log.user,
                status__in=["active", "pending_confirmation", "confirmed", "occupied"],
                start_time__lte=now,
                end_time__gte=now,
            ).order_by("-start_time").first()
            if reservation:
                reservation_end_time = reservation.end_time.isoformat()

        response_data = {
            "desk_id": desk.id,
            "active_session": True,
            "started_at": started_at.isoformat(),
            "elapsed_seconds": elapsed_seconds,
            "elapsed_formatted": f"{hours:02d}:{minutes:02d}:{seconds:02d}",
            "sitting_time": current_sitting_time,
            "standing_time": current_standing_time,
            "sitting_minutes": sitting_minutes,
            "standing_minutes": standing_minutes,
            "sitting_percentage": round(sitting_percentage, 1),
            "standing_percentage": round(standing_percentage, 1),
            "position_changes": log.position_changes,
            "current_height": desk.current_height,
            "is_sitting": desk.current_height < 95,
            "source": source,
            "reservation_end_time": reservation_end_time,
        }

        return Response(response_data)

    except Desk.DoesNotExist:
        return Response({"error": "Desk not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def control_desk_height(request, desk_id):
    print(f"\n🔧 CONTROL_DESK_HEIGHT CALLED - Desk ID: {desk_id}")
    print(f"   Request data: {request.data}")
    
    try:
        desk = Desk.objects.get(id=desk_id)
        print(f"   Current desk height in DB: {desk.current_height}")
        
        # Authorization check
        if desk.current_user != request.user:
            return Response(
                {"error": "You are not using this desk"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        target_height = request.data.get('height')
        
        if not target_height:
            return Response(
                {"error": "Height is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate height range
        if target_height < desk.min_height or target_height > desk.max_height:
            return Response(
                {"error": f"Height must be between {desk.min_height} and {desk.max_height} cm"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get active usage log - ORDERING HERE
        log = DeskUsageLog.objects.filter(
            user=request.user,
            desk=desk,
            ended_at__isnull=True
        ).order_by("-started_at").first()  # ADDED ordering
        
        if log:
            log.refresh_from_db()
            now = timezone.now()
            last_update_time = log.last_height_change or log.started_at
            elapsed_seconds = (now - last_update_time).total_seconds()
            
            current_height = desk.current_height
            
            if current_height < 95:
                log.sitting_time += int(elapsed_seconds)
            else:
                log.standing_time += int(elapsed_seconds)
            
            log.position_changes += 1
            log.last_height_change = now
            
            log.save()
        
        # Send command to WiFi2BLE simulator
        wifi2ble = WiFi2BLEService()
        success = wifi2ble.set_desk_height(desk.wifi2ble_id, target_height)
        
        if success:
            desk.current_status = 'moving'
            desk.current_height = target_height
            desk.save()

            print(f"Desk height updated in database to: {desk.current_height}")

            mqtt_service = get_mqtt_service()
            has_pico = Pico.objects.filter(desk_id=desk.id).exists()
            
            if has_pico:
                user_name = request.user.get_full_name() or request.user.username
                mqtt_service.notify_desk_moving(
                    desk_id=desk.id,
                    target_height=target_height,
                    is_moving=True,  # Pico will pulse yellow + beep
                    user_name=user_name
                )
            
            return Response({
                "success": True,
                "target_height": target_height,
                "status": "moving"
            })
            
    except Desk.DoesNotExist:
        return Response({"error": "Desk not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def poll_desk_movement(request, desk_id):
    """
    Frontend polls this while desk is moving.
    Backend checks WiFi2BLE and notifies Pico of current state.
    """
    try:
        desk = Desk.objects.get(id=desk_id)
        
        # Get live state from WiFi2BLE simulator
        wifi2ble = WiFi2BLEService()
        live_state = wifi2ble.get_desk_state(desk.wifi2ble_id)
        
        if not live_state:
            return Response(
                {"error": "Could not get desk state"}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Extract movement data
        current_height = live_state.get("position_mm", 750) / 10
        speed = live_state.get("speed_mms", 0)
        is_moving = abs(speed) > 0
        
        # Update database
        desk.current_height = current_height
        if not is_moving:
            desk.current_status = 'occupied'
        desk.save()
        
        # Notify Pico with current movement status
        mqtt_service = get_mqtt_service()
        has_pico = Pico.objects.filter(desk_id=desk.id).exists()
        
        if has_pico and desk.current_user:
            user_name = desk.current_user.get_full_name() or desk.current_user.username
            mqtt_service.notify_desk_moving(
                desk_id=desk.id,
                target_height=int(current_height),
                is_moving=is_moving,  # False = stop buzzer, blue LED
                user_name=user_name
            )
        
        return Response({
            "height": current_height,
            "is_moving": is_moving,
            "speed": speed,
            "status": desk.current_status
        })
        
    except Desk.DoesNotExist:
        return Response({"error": "Desk not found"}, status=status.HTTP_404_NOT_FOUND)

# ================= OTHER ENDPOINTS (LED, SENSORS, ETC) =================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def control_pico_led(request, pico_id):
    try:
        pico = Pico.objects.get(id=pico_id)
        on = request.data.get("on", False)
        mqtt_service = get_mqtt_service()
        mqtt_service.control_led(pico.mac_address, on)
        return Response(
            {"success": True, "message": f"LED turned {'on' if on else 'off'}"}
        )
    except Pico.DoesNotExist:
        return Response(
            {"error": "Pico device not found"}, status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        print("LED Control Error:", e) 
        traceback.print_exc() 
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_pico_sensor_data(request, pico_id):
    """Get recent sensor readings from Pico"""
    try:
        pico = Pico.objects.get(id=pico_id)
        readings = pico.sensor_readings.order_by("-timestamp")[:10]

        data = [
            {
                "temperature": r.temperature,
                "light_level": r.light_level,
                "timestamp": r.timestamp,
            }
            for r in readings
        ]

        return Response({"readings": data})
    except Pico.DoesNotExist:
        return Response(
            {"error": "Pico device not found"}, status=status.HTTP_404_NOT_FOUND
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_available_hot_desks(request):
    """Get all desks available for hot-desking"""
    now = timezone.now()
    desks = Desk.objects.filter(current_status="available").exclude(
        reservations__start_time__lte=now,
        reservations__end_time__gte=now,
        reservations__status__in=["confirmed", "active"],
    )

    # Annotate each desk with whether it has a Pico (requires confirmation)
    desk_data = []
    for desk in desks:
        serialized = DeskSerializer(desk).data
        serialized["requires_confirmation"] = Pico.objects.filter(desk=desk).exists()
        desk_data.append(serialized)

    return Response(desk_data)


# ================= ADMIN ANALYTICS VIEWS =================

@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_dashboard_analytics(request):
    """Return summary metrics and small charts for the admin dashboard."""
    now = timezone.now()

    # Top-line metrics
    User = get_user_model()
    total_users = User.objects.filter(is_admin=False).count()
    active_users = User.objects.filter(is_active=True, is_admin=False).count()

    total_desks = Desk.objects.count()
    available_desks = Desk.objects.filter(current_status="available").count()
    desks_in_use_online = Desk.objects.filter(
        current_status__in=["occupied", "moving", "pending_verification"]
    ).count()

    has_desk_errors = Desk.objects.filter(last_error__isnull=False).exists()
    from core.models import Pico as PicoModel  # avoid shadowing
    has_pico_errors = PicoModel.objects.filter(status='error').exists()
    system_status = "operational" if not (has_desk_errors or has_pico_errors) else "issues"

    # Today reservations
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    todays_reservations = Reservation.objects.filter(
        start_time__gte=start_of_day,
        start_time__lt=end_of_day,
        user__is_admin=False,
    )

    # Hourly utilization (e.g. 6AM–6PM)
    hours_labels = [
        "6AM", "7AM", "8AM", "9AM", "10AM", "11AM",
        "12PM", "1PM", "2PM", "3PM", "4PM", "5PM", "6PM",
    ]
    day_start = start_of_day + timedelta(hours=6)
    hourly_values = _bucket_reservation_minutes_by_hour(
        todays_reservations, day_start, hours_labels
    )

    # Active users by department over recent window (last 30 days)
    recent_reservations = _get_recent_reservations(days=30)
    dept_stats = (
        recent_reservations
        .values('user__department')
        .annotate(active_users=Count('user', distinct=True))
        .order_by('user__department')
    )
    active_users_by_department = [
        {
            "department": d["user__department"] or "Unassigned",
            "active_users": d["active_users"],
        }
        for d in dept_stats
    ]

    # Today booking timeline
    timeline_slots = [6, 8, 10, 12, 14, 16, 18]  # hours
    slot_labels = ["6AM", "8AM", "10AM", "12PM", "2PM", "4PM", "6PM"]
    slot_counts = [0 for _ in slot_labels]
    for r in todays_reservations:
        hour = r.start_time.hour
        for i, h in enumerate(timeline_slots):
            # for the last slot, include up to 23:59
            upper = timeline_slots[i + 1] if i + 1 < len(timeline_slots) else 24
            if h <= hour < upper:
                slot_counts[i] += 1
                break

    # Recent bookings list (reservations + hot-desk sessions)
    recent_reservations = (
        Reservation.objects
        .select_related('user', 'desk')
        .filter(user__is_admin=False)
        .order_by('-start_time')[:5]
    )

    recent_hotdesks = (
        DeskUsageLog.objects
        .select_related('user', 'desk')
        .filter(user__is_admin=False, source='hotdesk')
        .order_by('-started_at')[:5]
    )

    combined = []
    for r in recent_reservations:
        combined.append({
            "type": "reservation",
            "user": f"{r.user.first_name} {r.user.last_name}".strip() or r.user.email,
            "desk": r.desk.name,
            "start": r.start_time,
        })
    for log in recent_hotdesks:
        combined.append({
            "type": "hotdesk",
            "user": f"{log.user.first_name} {log.user.last_name}".strip() or log.user.email,
            "desk": log.desk.name,
            "start": log.started_at,
        })

    combined.sort(key=lambda x: x["start"], reverse=True)
    combined = combined[:5]

    recent_bookings = [
        {
            "type": item["type"],
            "user": item["user"],
            "desk": item["desk"],
        }
        for item in combined
    ]

    data = {
        "total_users": total_users,
        "active_users": active_users,
        "total_desks": total_desks,
        "available_desks": available_desks,
        "desks_in_use_online": desks_in_use_online,
        "system_status": system_status,
        "hourly_utilization": {
            "labels": hours_labels,
            "values": hourly_values,
        },
        "active_users_by_department": active_users_by_department,
        "today_bookings_timeline": {
            "labels": slot_labels,
            "values": slot_counts,
        },
        "recent_bookings": recent_bookings,
    }

    return Response(data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_full_analytics(request):
    """Return aggregated analytics for the full AnalyticsPage."""
    now = timezone.now()

    days = 12 # last N days for heatmap and daily usage
    all_reservations = _get_recent_reservations(days=days + 2)

    # Build date labels (oldest -> newest)
    date_labels = [
        (now.date() - timedelta(days=i)) for i in range(days - 1, -1, -1)
    ]
    date_str_labels = [d.strftime("%b %d") for d in date_labels]

    hours_labels = [
        "6AM", "7AM", "8AM", "9AM", "10AM", "11AM",
        "12PM", "1PM", "2PM", "3PM", "4PM", "5PM", "6PM",
    ]

    # Heatmap matrix per day
    heatmap_matrix = []
    for d in date_labels:
        day_start = datetime.combine(d, datetime.min.time()).replace(tzinfo=now.tzinfo)
        day_end = day_start + timedelta(days=1)
        day_reservations = all_reservations.filter(
            start_time__lt=day_end,
            end_time__gt=day_start,
        )
        row = _bucket_reservation_minutes_by_hour(day_reservations, day_start + timedelta(hours=6), hours_labels)
        heatmap_matrix.append(row)

    # Desk usage per day (hours)
    from django.db.models import F, ExpressionWrapper, DurationField, Sum

    daily_usage = (
        all_reservations
        .annotate(
            duration=ExpressionWrapper(
                F('end_time') - F('start_time'),
                output_field=DurationField(),
            )
        )
        .values('start_time__date')
        .annotate(total_duration=Sum('duration'))
    )
    duration_by_date = {row['start_time__date']: row['total_duration'] for row in daily_usage}
    desk_usage_week_values = []
    for d in date_labels:
        dur = duration_by_date.get(d, None)
        hours = (dur.total_seconds() / 3600.0) if dur else 0.0
        desk_usage_week_values.append(round(hours, 2))

    # Desk usage by department
    dept_usage = (
        all_reservations
        .annotate(
            duration=ExpressionWrapper(
                F('end_time') - F('start_time'),
                output_field=DurationField(),
            )
        )
        .values('user__department')
        .annotate(total_duration=Sum('duration'))
    )
    desk_usage_by_department_labels = []
    desk_usage_by_department_values = []
    for row in dept_usage:
        dept = row['user__department'] or 'Unassigned'
        dur = row['total_duration']
        hours = (dur.total_seconds() / 3600.0) if dur else 0.0
        desk_usage_by_department_labels.append(dept)
        desk_usage_by_department_values.append(round(hours, 2))

    # Used desks chart – count reservations per desk
    desk_counts = (
        all_reservations
        .values('desk__name')
        .annotate(count=Count('id'))
        .order_by('desk__name')
    )
    used_desks_labels = [row['desk__name'] for row in desk_counts]
    used_desks_values = [row['count'] for row in desk_counts]

    # System health – number of desks with errors per day based on error_timestamp
    system_labels = []
    system_values = []
    for d in date_labels:
        day_start = datetime.combine(d, datetime.min.time()).replace(tzinfo=now.tzinfo)
        day_end = day_start + timedelta(days=1)
        count = Desk.objects.filter(
            error_timestamp__gte=day_start,
            error_timestamp__lt=day_end,
        ).count()
        system_labels.append(d.strftime("%b %d"))
        system_values.append(count)

    # Booking types – hot desk vs reservations in last 30 days
    last_30_start = now - timedelta(days=30)

    # (Ad-hoc = hot desk sessions here)
    adhoc = (
        DeskUsageLog.objects
        .filter(
            source="hotdesk",
            started_at__gte=last_30_start,
            user__is_admin=False,
        )
        .count()
    )

    # (Recurring = reservation-based bookings in the same window)
    recurring = (
        Reservation.objects
        .filter(
            start_time__gte=last_30_start,
            user__is_admin=False,
        )
        .exclude(status='cancelled')
        .count()
    )

    # Cancellation rate per week (last 4 weeks)
    last_28_start = now - timedelta(days=28)
    cancelled = Reservation.objects.filter(
        status='cancelled',
        cancelled_at__gte=last_28_start,
        user__is_admin=False,
    )
    # Weeks: 0..3 (0 = oldest week)
    week_labels = ["Week 1", "Week 2", "Week 3", "Week 4"]
    week_values = [0, 0, 0, 0]
    for r in cancelled:
        delta_days = (r.cancelled_at - last_28_start).days
        idx = min(delta_days // 7, 3)
        if idx >= 0:
            week_values[idx] += 1

    # Leaderboard – top users by total reservation hours and booking count
    User = get_user_model()
    leaderboard_qs = (
        User.objects
        .filter(is_admin=False)
        .annotate(
            bookings=Count('reservations'),
            total_duration=Sum(
                ExpressionWrapper(
                    F('reservations__end_time') - F('reservations__start_time'),
                    output_field=DurationField(),
                ),
                filter=Q(reservations__end_time__isnull=False),
            ),
        )
        .filter(bookings__gt=0)
        .order_by('-total_duration')[:5]
    )
    leaderboard = []
    for u in leaderboard_qs:
        dur = u.total_duration
        hours = (dur.total_seconds() / 3600.0) if dur else 0.0
        name = f"{u.first_name} {u.last_name}".strip() or u.email
        leaderboard.append({
            "name": name,
            "hours": round(hours, 1),
            "bookings": u.bookings,
        })

    data = {
        "heatmap": {
            "dates": date_str_labels,
            "hours": hours_labels,
            "matrix": heatmap_matrix,
        },
        "desk_usage_week": {
            "labels": date_str_labels,
            "values": desk_usage_week_values,
        },
        "desk_usage_by_department": {
            "labels": desk_usage_by_department_labels,
            "values": desk_usage_by_department_values,
        },
        "used_desks": {
            "labels": used_desks_labels,
            "values": used_desks_values,
        },
        "system_health": {
            "labels": system_labels,
            "values": system_values,
        },
        "booking_types": {
            "labels": ["Hot desk", "Reservations"],
            "values": [adhoc, recurring],
        },
        "cancellation_rate": {
            "labels": week_labels,
            "values": week_values,
        },
        "leaderboard": leaderboard,
    }

    return Response(data)


# ================= HOT DESK & RESERVATION ENDPOINTS =================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_hot_desk(request, desk_id):
    print(f"\n START_HOT_DESK CALLED - Desk ID: {desk_id}")
    print(f"   User: {request.user.username}")

    try:
        # 1. GLOBAL CHECK: Is this user already occupying ANY desk?
        # We exclude the current desk_id just in case of a retry, but generally, 
        # if they have any desk assigned, we block them.
        existing_desk = Desk.objects.filter(current_user=request.user).first()
        
        if existing_desk:
            # If they are already on THIS desk, handle gracefully (idempotency)
            if str(existing_desk.id) == str(desk_id):
                return Response(
                    {"error": "You are already using this desk"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # If they are on a DIFFERENT desk, BLOCK THEM.
            else:
                return Response(
                    {"error": f"You are already using {existing_desk.name}. Please release it first."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # 2. Get the requested desk
        desk = Desk.objects.get(id=desk_id)
        
        if desk.current_status not in ["available", "Normal"]:
            return Response(
                {"error": "Desk not available"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Sync desk height from WiFi2BLE simulator
        wifi2ble = WiFi2BLEService()
        try:
            live_state = wifi2ble.get_desk_state(desk.wifi2ble_id)
            if live_state:
                current_height = live_state.get("position_mm", 750) / 10
                desk.current_height = current_height
        except Exception as e:
            print(f"Could not sync desk height: {e}")

        # 4. Set desk to pending verification
        desk.current_user = request.user
        desk.current_status = "pending_verification"
        desk.save()

        # 5. Check if desk has a Pico
        has_pico = Pico.objects.filter(desk_id=desk.id).exists()
        
        # 6. Create Logs
        usage_log = DeskUsageLog.objects.create(
            desk=desk,
            user=request.user,
            started_at=timezone.now(),
            last_height_change=timezone.now(),
            source="hotdesk",
        )
        
        DeskLog.objects.create(
            desk=desk,
            user=request.user,
            action="hotdesk_started"
        )

        if has_pico:
            mqtt_service = get_mqtt_service()
            # ... (MQTT logic omitted for brevity, keep your existing logic here) ...
            if mqtt_service.connected:
                topic = f"/desk/{desk.id}/display"
                message = {
                    "action": "show_confirm_button",
                    "desk_id": desk.id,
                    "desk_name": desk.name,
                    "user": request.user.get_full_name() or request.user.username,
                }
                mqtt_service.publish(topic, json.dumps(message))
        else:
            # Auto-confirm if no Pico
            desk.current_status = "occupied"
            desk.save()

        return Response(
            {"success": True, "desk": desk.name, "requires_confirmation": has_pico}
        )
        
    except Desk.DoesNotExist:
        return Response({"error": "Desk not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def confirm_hot_desk(request, desk_id):
    try:
        desk = Desk.objects.get(id=desk_id)
        if desk.current_status != "pending_verification":
            return Response(
                {"error": "Desk not pending verification"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Mark desk as occupied
        desk.current_status = "occupied"
        desk.save()

        # Notify Pico to update OLED display
        mqtt_service = get_mqtt_service()
        topic = f"desk/{desk.id}/display"
        message = {
            "action": "show_in_use",
            "desk_id": desk.id,
            "desk_name": desk.name,
            "user": request.user.get_full_name() or request.user.username,
        }
        mqtt_service.publish(topic, json.dumps(message))

        return Response({"success": True, "desk": desk.name})
    except Desk.DoesNotExist:
        return Response({"error": "Desk not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cancel_pending_verification(request, desk_id):
    try:
        desk = Desk.objects.get(id=desk_id)
        if desk.current_status == "pending_verification":
            # Revert any reservation that was pending confirmation for this desk
            pending_reservation = Reservation.objects.filter(
                desk=desk,
                user=request.user,
                status="pending_confirmation"
            ).first()
            
            if pending_reservation:
                pending_reservation.status = "confirmed"
                pending_reservation.checked_in_at = None
                pending_reservation.save()
                print(f"Reverted reservation {pending_reservation.id} from pending_confirmation to confirmed")
            
            desk.current_user = None
            desk.current_status = "available"
            desk.save()

            # Notify Pico that pending verification is cancelled
            mqtt_service = get_mqtt_service()
            has_pico = Pico.objects.filter(desk_id=desk.id).exists()
            if has_pico:
                # Send a message to clear pending verification state
                topic = f"/desk/{desk.id}/display"
                message = {
                    "action": "cancel_pending_verification",
                    "desk_id": desk.id
                }
                mqtt_service.publish(topic, json.dumps(message))
                print(f"Notified Pico: Cancelled pending verification for Desk {desk.id}")

            return Response({"success": True})
        return Response(
            {"error": "Desk not pending verification"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Desk.DoesNotExist:
        return Response({"error": "Desk not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def end_hot_desk(request, desk_id):
    try:
        desk = Desk.objects.get(id=desk_id)
        if desk.current_user != request.user:
            return Response(
                {"error": "You are not using this desk"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # End usage log
        log = DeskUsageLog.objects.filter(
            user=request.user, desk=desk, ended_at__isnull=True, source="hotdesk"
        ).first()
        if log:
            log.ended_at = timezone.now()
            log.save()

        # desk log entry for tracking
        DeskLog.objects.create(
            desk=desk,
            user=request.user,
            action="hotdesk_ended"
        )

        desk.current_user = None
        desk.current_status = "available"
        desk.save()
        return Response({"success": True})
    except Desk.DoesNotExist:
        return Response({"error": "Desk not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def hotdesk_status(request):
    # Cleanup no-shows before listing
    cleanup_expired_reservations()
    
    date_str = request.GET.get("date")
    if not date_str:
        return Response({"error": "Date parameter required"}, status=400)

    date = timezone.datetime.strptime(date_str, "%Y-%m-%d").date()
    desks = Desk.objects.all()
    result = []
    now = timezone.now()

    for desk in desks:
        # Check if desk has a Pico (requires confirmation)
        requires_confirmation = Pico.objects.filter(desk_id=desk.id).exists()
        
        # Check active usage/check-in session
        if desk.current_user:
            active_session = (
                DeskUsageLog.objects.filter(
                    desk=desk,
                    ended_at__isnull=True
                )
                .order_by("-started_at")
                .first()
            )
            reserved_time_iso = (
                active_session.started_at.isoformat() if active_session else now.isoformat()
            )

            result.append({
                "id": desk.id,
                "desk_name": desk.name,
                "reserved": True,
                "reserved_by": desk.current_user.id,
                "reserved_time": reserved_time_iso,
                "reserved_start_time": reserved_time_iso,
                "reserved_end_time": None,
                "occupied": True,
                "current_status": desk.current_status,
                "locked_for_checkin": desk.current_status in [
                    "pending_verification",
                    "occupied",
                ],
                "requires_confirmation": requires_confirmation,
            })
            continue

        # Check next reservation for given date
        reservation = (
            Reservation.objects.filter(
                desk=desk,
                start_time__date=date,
                status__in=["confirmed", "active"],
            )
            .order_by("start_time")
            .first()
        )

        if reservation:
            start_time = reservation.start_time
            end_time = reservation.end_time
            reserved_by = reservation.user.id

            # Lock the desk starting 30 minutes before the reservation
            is_locked = (
                now >= start_time - timedelta(minutes=30)
                and now <= end_time
            )

            result.append({
                "id": desk.id,
                "desk_name": desk.name,
                "reserved": True,
                "reserved_by": reserved_by,
                "reserved_time": start_time.isoformat(),
                "reserved_start_time": start_time.isoformat(),
                "reserved_end_time": end_time.isoformat(),
                "locked_for_checkin": is_locked,
                "occupied": False,
                "requires_confirmation": requires_confirmation,
            })
        else:
            result.append({
                "id": desk.id,
                "desk_name": desk.name,
                "reserved": False,
                "locked_for_checkin": False,
                "requires_confirmation": requires_confirmation,
            })

    return Response(result)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_user_reservations(request):
    cleanup_expired_reservations()
    cleanup_expired_active_reservations()

    user = request.user
    date_str = request.GET.get("date")

    reservations = Reservation.objects.filter(user=user)

    if date_str:
        try:
            date = timezone.datetime.strptime(date_str, "%Y-%m-%d").date()
            start_dt = timezone.make_aware(timezone.datetime.combine(date, timezone.datetime.min.time()))
            end_dt = timezone.make_aware(timezone.datetime.combine(date, timezone.datetime.max.time()))

            reservations = reservations.filter(
                start_time__lt=end_dt,
                end_time__gt=start_dt
            )
        except ValueError:
            return Response({"error": "Invalid date format"}, status=400)

    reservations = reservations.order_by("-start_time")
    serializer = ReservationSerializer(reservations, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_reservation(request):
    """Create a new reservation - let serializer handle datetime parsing"""
    user = request.user
    data = request.data.copy()
    data["user"] = user.id
    
    # Use serializer to parse and validate
    serializer = ReservationSerializer(data=data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # Get the parsed datetime values from validated data
    start_time = serializer.validated_data['start_time']
    end_time = serializer.validated_data['end_time']
    
    # Check for overlapping reservations
    overlapping = Reservation.objects.filter(
        user=user,
        status__in=['confirmed', 'active', 'pending_confirmation'],
        start_time__lt=end_time,
        end_time__gt=start_time
    ).first()
    
    if overlapping:
        return Response({
            "error": "You already have a reservation during this time.",
            "conflict": {
                "desk": overlapping.desk.name,
                "start": overlapping.start_time.isoformat(),
                "end": overlapping.end_time.isoformat()
            }
        }, status=status.HTTP_409_CONFLICT)
    
    # Save the reservation
    serializer.save(status="confirmed")
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def check_in_reservation(request, reservation_id):
    try:
        reservation = Reservation.objects.get(id=reservation_id, user=request.user)
        now = timezone.now()

        if reservation.status != "confirmed":
            return Response(
                {"error": "Reservation not confirmed or already active"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Allow check-in within 30 minutes before and 10 minutes after start time
        allowed_window_start = reservation.start_time - timedelta(minutes=30)
        allowed_window_end = reservation.start_time + timedelta(minutes=10)

        if not (allowed_window_start <= now <= allowed_window_end):
            return Response({
                "error": f"You can only check in 30 minutes before or up to 10 minutes after your reservation starts. Check-in available from {allowed_window_start.strftime('%H:%M')}."
            }, status=status.HTTP_403_FORBIDDEN)

        # Check if desk has a Pico (requires physical confirmation)
        desk = reservation.desk
        has_pico = Pico.objects.filter(desk_id=desk.id).exists()

        if has_pico:
            # For desks requiring confirmation, mark reservation as "pending_confirmation"
            reservation.status = "pending_confirmation"
            reservation.checked_in_at = now
            reservation.save()

            desk.current_user = request.user
            desk.current_status = "pending_verification"
            desk.save()

            # Notify Pico to show confirmation prompt
            mqtt_service = get_mqtt_service()
            
            import time
            max_wait = 3
            wait_interval = 0.1
            elapsed = 0
            
            while not mqtt_service.connected and elapsed < max_wait:
                time.sleep(wait_interval)
                elapsed += wait_interval
            
            if mqtt_service.connected:
                topic = f"/desk/{desk.id}/display"
                message = {
                    "action": "show_confirm_button",
                    "desk_id": desk.id,
                    "desk_name": desk.name,
                    "user": request.user.get_full_name() or request.user.username,
                }
                mqtt_service.publish(topic, json.dumps(message))
                print(f"Published show_confirm_button for reservation to {topic}")
        else:
            # For desks without Pico, complete check-in immediately
            reservation.status = "active"
            reservation.checked_in_at = now
            reservation.save()

            desk.current_user = request.user
            desk.current_status = "occupied"
            desk.save()

            # Create usage log
            DeskUsageLog.objects.create(
                user=request.user,
                desk=desk,
                started_at=now,
                source="reservation",
            )

            # Desk log entry for tracking check-in
            DeskLog.objects.create(
                desk=desk,
                user=request.user,
                action="reservation_checked_in"
            )

        return Response({
            "success": True,
            "requires_confirmation": has_pico
        })

    except Reservation.DoesNotExist:
        return Response(
            {"error": "Reservation not found"}, status=status.HTTP_404_NOT_FOUND
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def check_out_reservation(request, reservation_id):
    try:
        reservation = Reservation.objects.get(id=reservation_id, user=request.user)
        if reservation.status != "active":
            return Response(
                {"error": "Reservation not active"}, status=status.HTTP_400_BAD_REQUEST
            )

        # End reservation
        reservation.status = "completed"
        reservation.checked_out_at = timezone.now()
        reservation.save()

        # End usage log
        log = DeskUsageLog.objects.filter(
            user=request.user,
            desk=reservation.desk,
            ended_at__isnull=True,
            source="reservation",
        ).first()
        if log:
            log.ended_at = timezone.now()
            log.save()

        # Free the desk
        desk = reservation.desk
        desk.current_user = None
        desk.current_status = "available"
        desk.save()

        # desk log entry for tracking check-out
        DeskLog.objects.create(
            desk=desk,
            user=request.user,
            action="reservation_checked_out"
        )

        return Response({"success": True})
    except Reservation.DoesNotExist:
        return Response(
            {"error": "Reservation not found"}, status=status.HTTP_404_NOT_FOUND
        )
    
    
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cancel_reservation(request, reservation_id):
    try:
        reservation = Reservation.objects.get(id=reservation_id, user=request.user)

        if reservation.status in ["cancelled", "completed"]:
            return Response(
                {"error": "Reservation already finished or cancelled"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mark as cancelled
        reservation.status = "cancelled"
        reservation.cancelled_at = timezone.now()
        reservation.cancelled_by = request.user
        reservation.save()

        return Response({"success": True, "message": "Reservation cancelled successfully"})

    except Reservation.DoesNotExist:
        return Response({"error": "Reservation not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def edit_reservation(request, reservation_id):
    try:
        reservation = Reservation.objects.get(id=reservation_id, user=request.user)

        if reservation.status != "confirmed":
            return Response({"error": "Only confirmed reservations can be edited."}, status=400)

        new_start = request.data.get("start_time")
        new_end = request.data.get("end_time")

        if new_start and new_end:
            reservation.start_time = new_start
            reservation.end_time = new_end
            reservation.save()
            return Response({"success": True})

        return Response({"error": "Missing start or end time."}, status=400)

    except Reservation.DoesNotExist:
        return Response({"error": "Reservation not found."}, status=404)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def available_desks_for_date(request):
    """Get available desks for a specific date/time slot"""
    cleanup_expired_reservations()
    
    # Get query parameters
    date_str = request.GET.get("date")
    start_time_str = request.GET.get("start_time")
    end_time_str = request.GET.get("end_time")
    
    if not all([date_str, start_time_str, end_time_str]):
        return Response({
            "error": "Date, start_time, and end_time are required"
        }, status=400)
    
    # Parse datetime strings
    try:
        start_dt = timezone.make_aware(
            datetime.strptime(f"{date_str} {start_time_str}", "%Y-%m-%d %H:%M")
        )
        end_dt = timezone.make_aware(
            datetime.strptime(f"{date_str} {end_time_str}", "%Y-%m-%d %H:%M")
        )
    except ValueError:
        return Response({"error": "Invalid date or time format"}, status=400)
    
    # Get all desks
    all_desks = Desk.objects.all()
    
    # Find desks with conflicting reservations using correct overlap logic
    # Two time ranges overlap if: start1 < end2 AND end1 > start2
    conflicting_reservations = Reservation.objects.filter(
        status__in=["confirmed", "active"],
        start_time__lt=end_dt,  # Existing reservation starts before our end time
        end_time__gt=start_dt   # Existing reservation ends after our start time
    )
    
    # Get unique desk IDs that have conflicts
    conflicting_desk_ids = set(conflicting_reservations.values_list('desk_id', flat=True))
    
    # Filter out conflicting desks
    available_desks = all_desks.exclude(id__in=conflicting_desk_ids)
    
    # Serialize and add extra info
    result = []
    for desk in available_desks:
        desk_data = DeskSerializer(desk).data
        
        # Check if desk requires physical confirmation (has Pico)
        desk_data["requires_confirmation"] = Pico.objects.filter(desk_id=desk.id).exists()
        
        # Find next reservation after requested time slot
        next_reservation = Reservation.objects.filter(
            desk=desk,
            status__in=["confirmed", "active"],
            start_time__gte=end_dt,
            start_time__date=start_dt.date()
        ).order_by('start_time').first()
        
        if next_reservation:
            desk_data["available_until"] = next_reservation.start_time.isoformat()
            desk_data["free_all_day"] = False
        else:
            desk_data["available_until"] = None
            desk_data["free_all_day"] = True
        
        result.append(desk_data)
    
    return Response(result)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def release_desk(request, desk_id):
    """Release a desk and finalize usage tracking"""
    try:
        desk = Desk.objects.get(id=desk_id)
        
        # Check if user has an active usage log for this desk
        log = DeskUsageLog.objects.filter(
            user=request.user, 
            desk=desk, 
            ended_at__isnull=True
        ).order_by("-started_at").first()
        
        # If no active log AND desk.current_user doesn't match, deny access
        if not log and desk.current_user != request.user:
            return Response(
                {"error": "You are not using this desk"},
                status=status.HTTP_403_FORBIDDEN,
            )
        
        # If there's an active log, finalize it
        if log:
            now = timezone.now()
            log.ended_at = now
            
            # Add final time segment based on current height
            last_update = log.last_height_change or log.started_at
            elapsed_seconds = (now - last_update).total_seconds()
            
            if desk.current_height < 95:
                log.sitting_time += int(elapsed_seconds)
            else:
                log.standing_time += int(elapsed_seconds)
            
            log.save()

        # desk log entry for tracking desk release
        DeskLog.objects.create(
            desk=desk,
            user=request.user,
            action="desk_released"
        )

        # Release the desk
        desk.current_user = None
        desk.current_status = "available"
        desk.save()

        # Notify Pico that desk is now available
        mqtt_service = get_mqtt_service()
        has_pico = Pico.objects.filter(desk_id=desk.id).exists()
        
        if has_pico:
            mqtt_service.notify_desk_available(desk_id=desk.id)
            print(f"Notified Pico: Desk {desk.id} is now available")

        return Response({"success": True})
        
    except Desk.DoesNotExist:
        return Response({"error": "Desk not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_desk_report(request, desk_id):
    try:
        message = request.data.get("message")
        category = request.data.get("category", "other")

        if not message:
            return Response({"error": "Message is required"}, status=400)

        desk = Desk.objects.get(id=desk_id)

        report = DeskReport.objects.create(
            desk=desk,
            user=request.user,
            message=message,
            category=category
        )

        # Add a log entry as well
        DeskLog.objects.create(
            desk=desk,
            user=request.user,
            action="desk_report_submitted"
        )

        return Response({"success": True, "message": "Report submitted"})
    except Desk.DoesNotExist:
        return Response({"error": "Desk not found"}, status=404)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_all_reports(request):
    reports = DeskReport.objects.order_by("-created_at")
    data = [{
        "id": r.id,
        "desk": r.desk.name,
        "desk_id": r.desk.id,
        "user": r.user.email if r.user else "Unknown",
        "message": r.message,
        "resolved": r.resolved,
        "created_at": r.created_at.strftime("%Y-%m-%d %H:%M"),
    } for r in reports]

    return Response(data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_all_logs(request):
    logs = DeskLog.objects.select_related("desk", "user").order_by("-timestamp")
    serializer = DeskLogSerializer(logs, many=True)
    return Response(serializer.data)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_report(request, report_id):
    try:
        report = DeskReport.objects.get(id=report_id)
        report.delete()
        return Response({"success": True})
    except DeskReport.DoesNotExist:
        return Response({"error": "Report not found"}, status=404)


# ================= USER METRICS API =================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_metrics(request):
    """Get comprehensive user metrics for employee dashboard"""
    user = request.user
    now = timezone.now()
    
    # Get time range from query params (default last 7 days)
    days = int(request.GET.get('days', 7))
    since = now - timedelta(days=days)
    
    # ===== Standing/Sitting Time Tracking =====
    usage_logs = DeskUsageLog.objects.filter(
        user=user,
        started_at__gte=since
    ).order_by('started_at')
    
    # Daily breakdown
    daily_stats = {}
    for log in usage_logs:
        date_key = log.started_at.date()
        if date_key not in daily_stats:
            daily_stats[date_key] = {'sitting': 0, 'standing': 0, 'changes': 0}
        
        daily_stats[date_key]['sitting'] += log.sitting_time
        daily_stats[date_key]['standing'] += log.standing_time
        daily_stats[date_key]['changes'] += log.position_changes
    
    # Format for frontend
    dates = []
    sitting_times = []
    standing_times = []
    
    for i in range(days):
        date = (now - timedelta(days=days-1-i)).date()
        dates.append(date.strftime('%b %d'))
        stats = daily_stats.get(date, {'sitting': 0, 'standing': 0})
        sitting_times.append(round(stats['sitting'] / 60, 1))  # Convert to minutes
        standing_times.append(round(stats['standing'] / 60, 1))
    
    # ===== Standing/Sitting Leaderboard =====
    User = get_user_model()
    leaderboard_data = (
        DeskUsageLog.objects
        .filter(started_at__gte=since)
        .values('user__id', 'user__first_name', 'user__last_name', 'user__email')
        .annotate(
            total_sitting=Sum('sitting_time'),
            total_standing=Sum('standing_time'),
            total_changes=Sum('position_changes')
        )
    )
    
    leaderboard = []
    for entry in leaderboard_data:
        total_time = (entry['total_sitting'] or 0) + (entry['total_standing'] or 0)
        if total_time > 0:
            standing_percentage = (entry['total_standing'] or 0) / total_time * 100
            name = f"{entry['user__first_name']} {entry['user__last_name']}".strip()
            if not name:
                name = entry['user__email'].split('@')[0]
            
            leaderboard.append({
                'user_id': entry['user__id'],
                'name': name,
                'standing_percentage': round(standing_percentage, 1),
                'standing_minutes': round((entry['total_standing'] or 0) / 60, 1),
                'sitting_minutes': round((entry['total_sitting'] or 0) / 60, 1),
                'total_minutes': round(total_time / 60, 1),
                'is_current_user': entry['user__id'] == user.id
            })
    
    # Sort by standing percentage (descending)
    leaderboard.sort(key=lambda x: x['standing_percentage'], reverse=True)
    
    # ===== Most Used Desks =====
    desk_usage = (
        DeskUsageLog.objects
        .filter(user=user, started_at__gte=since)
        .values('desk__name', 'desk__id')
        .annotate(
            session_count=Count('id'),
            total_time=Sum('sitting_time') + Sum('standing_time')
        )
        .order_by('-session_count')[:5]
    )
    
    most_used_desks = []
    for entry in desk_usage:
        most_used_desks.append({
            'desk_name': entry['desk__name'],
            'desk_id': entry['desk__id'],
            'sessions': entry['session_count'],
            'total_hours': round((entry['total_time'] or 0) / 3600, 1)
        })
    
    # ===== Weekly Desk Usage Overview =====
    # Group by week day
    weekly_usage = {i: {'sitting': 0, 'standing': 0, 'sessions': 0} for i in range(7)}
    
    for log in usage_logs:
        weekday = log.started_at.weekday()  # Monday=0, Sunday=6
        weekly_usage[weekday]['sitting'] += log.sitting_time
        weekly_usage[weekday]['standing'] += log.standing_time
        weekly_usage[weekday]['sessions'] += 1
    
    weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    weekly_sitting = []
    weekly_standing = []
    weekly_sessions = []
    
    for i in range(7):
        weekly_sitting.append(round(weekly_usage[i]['sitting'] / 60, 1))
        weekly_standing.append(round(weekly_usage[i]['standing'] / 60, 1))
        weekly_sessions.append(weekly_usage[i]['sessions'])
    
    # ===== Overall Stats =====
    total_sitting_mins = sum(sitting_times)
    total_standing_mins = sum(standing_times)
    total_mins = total_sitting_mins + total_standing_mins
    
    overall_stats = {
        'total_sessions': usage_logs.count(),
        'total_hours': round(total_mins / 60, 1),
        'sitting_percentage': round((total_sitting_mins / total_mins * 100) if total_mins > 0 else 0, 1),
        'standing_percentage': round((total_standing_mins / total_mins * 100) if total_mins > 0 else 0, 1),
        'avg_session_duration': round((total_mins / usage_logs.count()) if usage_logs.count() > 0 else 0, 1),
        'total_position_changes': sum([log.position_changes for log in usage_logs])
    }
    
    # ===== No Show Table =====
    # Find reservations where user didn't check in despite confirmation
    now = timezone.now()
    
    no_shows = (
        Reservation.objects
        .filter(
            user=user,
            status='confirmed',
            checked_in_at__isnull=True,
            start_time__lt=now,
            start_time__gte=since
        )
        .select_related('desk')
        .order_by('-start_time')
    )
    
    no_show_list = []
    for reservation in no_shows:
        no_show_list.append({
            'id': reservation.id,
            'desk_name': reservation.desk.name,
            'desk_id': reservation.desk.id,
            'date': reservation.start_time.date().isoformat(),
            'start_time': reservation.start_time.strftime('%H:%M'),
            'end_time': reservation.end_time.strftime('%H:%M'),
            'days_ago': (now.date() - reservation.start_time.date()).days
        })
    
    # ===== Healthiness Score =====
    # Calculate 
    standing_pct = float(overall_stats['standing_percentage'])
    position_changes = int(overall_stats['total_position_changes'])
    sessions = int(overall_stats['total_sessions'])
    
    # Base score from standing percentage 
    if 40 <= standing_pct <= 60:
        base_score = 100  # Optimal range
    elif 30 <= standing_pct < 40 or 60 < standing_pct <= 70:
        base_score = 80 + (20 * (1 - abs(standing_pct - 50) / 20))  # 80-100 range
    elif 20 <= standing_pct < 30 or 70 < standing_pct <= 80:
        base_score = 60 + (20 * (1 - abs(standing_pct - 50) / 30))  # 60-80 range
    else:
        base_score = max(40, 60 - abs(standing_pct - 50))  # Below 60
    
    # Position changes bonus (more frequent changes = better)
    # Average 1 change per hour is good, more is better
    if total_mins > 0:
        changes_per_hour = (position_changes / (total_mins / 60))
        if changes_per_hour >= 1:
            change_bonus = min(10, changes_per_hour * 5)  # Up to 10 points
        else:
            change_bonus = changes_per_hour * 5  # Proportional for less than 1/hour
    else:
        change_bonus = 0
    
    # Consistency bonus (using desk regularly)
    days_in_period = min(days, (timezone.now().date() - since.date()).days + 1)
    if days_in_period > 0:
        usage_ratio = sessions / days_in_period
        if usage_ratio >= 0.8:  # Used desk 80%+ of days
            consistency_bonus = 10
        elif usage_ratio >= 0.5:  # Used desk 50%+ of days
            consistency_bonus = 5
        else:
            consistency_bonus = usage_ratio * 10
    else:
        consistency_bonus = 0
    
    # Calculate final score (capped at 100)
    health_score = min(100, base_score + change_bonus + consistency_bonus)
    
    # Determine rating
    if health_score >= 90:
        rating = 'Excellent'
        color = 'green'
    elif health_score >= 75:
        rating = 'Good'
        color = 'blue'
    elif health_score >= 60:
        rating = 'Fair'
        color = 'yellow'
    else:
        rating = 'Needs Improvement'
        color = 'red'
    
    healthiness = {
        'score': round(health_score, 1),
        'rating': rating,
        'color': color,
        'breakdown': {
            'standing_percentage': standing_pct,
            'position_changes': position_changes,
            'changes_per_hour': round((position_changes / (total_mins / 60)) if total_mins > 0 else 0, 2),
            'usage_consistency': round((sessions / days_in_period * 100) if days_in_period > 0 else 0, 1)
        },
        'recommendations': []
    }
    
    # Add personalized recommendations
    if standing_pct < 30:
        healthiness['recommendations'].append('Try to stand more often - aim for 30-40% of your desk time')
    elif standing_pct > 70:
        healthiness['recommendations'].append('You\'re standing a lot! Consider more sitting breaks for balance')
    
    if position_changes < (total_mins / 120):  
        healthiness['recommendations'].append('Change positions more frequently - try switching every hour')
    
    if sessions < (days_in_period * 0.5):
        healthiness['recommendations'].append('Use your desk more consistently for better health habits')
    
    if not healthiness['recommendations']:
        healthiness['recommendations'].append('Great job! Keep maintaining your healthy desk habits')
    
    return Response({
        'standing_sitting_chart': {
            'labels': dates,
            'sitting': sitting_times,
            'standing': standing_times
        },
        'leaderboard': leaderboard[:10],  # Top 10
        'most_used_desks': most_used_desks,
        'weekly_usage': {
            'labels': weekdays,
            'sitting': weekly_sitting,
            'standing': weekly_standing,
            'sessions': weekly_sessions
        },
        'overall_stats': overall_stats,
        'no_shows': no_show_list,
        'healthiness': healthiness
    })