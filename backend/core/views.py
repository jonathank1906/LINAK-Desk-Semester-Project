from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from core.models import DeskReport, DeskLog, Desk
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from djoser.utils import decode_uid
from django.utils import timezone
from datetime import datetime, timedelta
import json
from core.services.MQTTService import get_mqtt_service

from .serializers import (
    UserRegisterSerializer,
    UserSerializer,
    DeskSerializer,
    ReservationSerializer,
    AdminUserListSerializer,
    DeskLogSerializer
)
from .models import Desk, DeskUsageLog, DeskLog
from .services.WiFi2BLEService import WiFi2BLEService
from core.services.MQTTService import get_mqtt_service
from core.models import Pico, SensorReading, Reservation


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
    User = get_user_model()  # Dynamically get the custom user model
    users = User.objects.all().order_by("-created_at")
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


# ===== DESK MANAGEMENT ENDPOINTS =====


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
    """Get desk usage statistics with live sitting/standing time"""
    try:
        desk = Desk.objects.get(id=desk_id)

        # Get active session
        log = DeskUsageLog.objects.filter(
            desk=desk, 
            ended_at__isnull=True
        ).order_by("-started_at").first()

        if not log:
            return Response({
                "desk_id": desk.id, 
                "active_session": False,
                "message": "No active session"
            })

        log.refresh_from_db()

        # Calculate elapsed time
        now = timezone.now()
        fifteen_minutes = timedelta(minutes=15)
        started_at = log.started_at
        elapsed_seconds = int((now - started_at).total_seconds())

       # Calculate LIVE sitting/standing time
        last_update = log.last_height_change or log.started_at
        time_since_last_change = int((now - last_update).total_seconds())

        current_sitting_time = log.sitting_time
        current_standing_time = log.standing_time

        # DEBUG LOGGING
        print(f"\n=== DESK USAGE DEBUG ===")
        print(f"Current time: {now}")
        print(f"Last height change: {last_update}")
        print(f"Time since last change: {time_since_last_change}s")
        print(f"Current desk height: {desk.current_height}")
        print(f"Stored - Sitting: {log.sitting_time}s, Standing: {log.standing_time}s")

        if desk.current_height < 95:
            current_sitting_time += time_since_last_change
            print(f"Currently SITTING - adding {time_since_last_change}s to sitting")
        else:
            current_standing_time += time_since_last_change
            print(f"Currently STANDING - adding {time_since_last_change}s to standing")

        print(f"Live - Sitting: {current_sitting_time}s, Standing: {current_standing_time}s")
        print(f"========================\n")

        # Format times
        hours = elapsed_seconds // 3600
        minutes = (elapsed_seconds % 3600) // 60
        seconds = elapsed_seconds % 60

        sitting_minutes = current_sitting_time // 60
        standing_minutes = current_standing_time // 60

        # Calculate percentages
        total_time = current_sitting_time + current_standing_time
        sitting_percentage = (current_sitting_time / total_time * 100) if total_time > 0 else 0
        standing_percentage = (current_standing_time / total_time * 100) if total_time > 0 else 0

        response_data = {
            "desk_id": desk.id,
            "active_session": True,
            "started_at": started_at.isoformat(),
            "elapsed_seconds": elapsed_seconds,
            "elapsed_formatted": f"{hours:02d}:{minutes:02d}:{seconds:02d}",
            
            # Live sitting/standing time
            "sitting_time": current_sitting_time,
            "standing_time": current_standing_time,
            "sitting_minutes": sitting_minutes,
            "standing_minutes": standing_minutes,
            "sitting_percentage": round(sitting_percentage, 1),
            "standing_percentage": round(standing_percentage, 1),
            
            "position_changes": log.position_changes,
            "current_height": desk.current_height,
            "is_sitting": desk.current_height < 95,
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
        
        # Get active usage log - ✅ ADD ORDERING HERE
        log = DeskUsageLog.objects.filter(
            user=request.user,
            desk=desk,
            ended_at__isnull=True
        ).order_by("-started_at").first()  # ✅ ADDED ordering
        
        if log:
            log.refresh_from_db()
            now = timezone.now()
            last_update_time = log.last_height_change or log.started_at
            elapsed_seconds = (now - last_update_time).total_seconds()
            
            current_height = desk.current_height
            
            print(f"\n=== CONTROL DESK HEIGHT DEBUG ===")
            print(f"Log ID: {log.id}")  # ✅ ADD THIS to see which log
            print(f"Current time: {now}")
            print(f"Last height change BEFORE: {log.last_height_change}")
            print(f"Elapsed seconds: {elapsed_seconds}")
            print(f"Current height (before move): {current_height}")
            print(f"Target height: {target_height}")
            print(f"BEFORE - Sitting: {log.sitting_time}s, Standing: {log.standing_time}s")
            
            if current_height < 95:
                log.sitting_time += int(elapsed_seconds)
                print(f"Adding {int(elapsed_seconds)}s to SITTING")
            else:
                log.standing_time += int(elapsed_seconds)
                print(f"Adding {int(elapsed_seconds)}s to STANDING")
            
            log.position_changes += 1
            log.last_height_change = now
            
            print(f"AFTER - Sitting: {log.sitting_time}s, Standing: {log.standing_time}s")
            print(f"Last height change AFTER: {log.last_height_change}")
            print(f"=================================\n")
            
            log.save()
            
            # VERIFY IT SAVED
            log.refresh_from_db()
            print(f"✅ VERIFIED - Last height change in DB: {log.last_height_change}")
        
        # Send command to WiFi2BLE simulator
        from core.services.WiFi2BLEService import WiFi2BLEService
        
        wifi2ble = WiFi2BLEService()
        success = wifi2ble.set_desk_height(desk.wifi2ble_id, target_height)
        
        if success:
            desk.current_status = 'moving'
            desk.current_height = target_height
            desk.save()

            print(f"✅ Desk height updated in database to: {desk.current_height}")

            mqtt_service = get_mqtt_service()
            has_pico = Pico.objects.filter(desk_id=desk.id).exists()
            
            if has_pico:
                user_name = request.user.get_full_name() or request.user.username
                mqtt_service.notify_desk_moving(
                    desk_id=desk.id,
                    target_height=target_height,
                    is_moving=True,  # ⭐ Pico will pulse yellow + beep
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
        
        # ✅ Notify Pico with current movement status
        mqtt_service = get_mqtt_service()
        has_pico = Pico.objects.filter(desk_id=desk.id).exists()
        
        if has_pico and desk.current_user:
            user_name = desk.current_user.get_full_name() or desk.current_user.username
            mqtt_service.notify_desk_moving(
                desk_id=desk.id,
                target_height=int(current_height),
                is_moving=is_moving,  # ⭐ False = stop buzzer, blue LED
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

# -------------------------------------------------------------
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
        print("LED Control Error:", e)  # <-- Add this line
        import traceback

        traceback.print_exc()  # <-- Add this line
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


# -------------------------------------------------------------
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


from core.services.MQTTService import get_mqtt_service


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_hot_desk(request, desk_id):
    print(f"\n🏢 START_HOT_DESK CALLED - Desk ID: {desk_id}")
    print(f"   User: {request.user.username}")

    

    try:
        desk = Desk.objects.get(id=desk_id)
        
        print(f"   Current desk status: {desk.current_status}")
        print(f"   Current desk user: {desk.current_user}")
        
        # ⭐ FIX 1: Prevent duplicate occupancy
        if desk.current_user == request.user:
            if desk.current_status == "occupied":
                print(f"⚠️ User {request.user.username} already occupies desk {desk_id}")
                return Response(
                    {"error": "You are already using this desk"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            elif desk.current_status == "pending_verification":
                print(f"⚠️ Desk {desk_id} already pending verification for {request.user.username}")
                return Response(
                    {"error": "Desk is already pending your confirmation"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        
        # Check if desk is available
        if desk.current_status not in ["available", "Normal"]:
            print(f"❌ Desk {desk_id} not available (status: {desk.current_status})")
            return Response(
                {"error": "Desk not available"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Sync desk height from WiFi2BLE simulator
        from core.services.WiFi2BLEService import WiFi2BLEService
        wifi2ble = WiFi2BLEService()
        try:
            live_state = wifi2ble.get_desk_state(desk.wifi2ble_id)
            if live_state:
                current_height = live_state.get("position_mm", 750) / 10
                desk.current_height = current_height
                print(f"📊 Synced desk height from simulator: {current_height}cm")
            else:
                print(f"⚠️ WiFi2BLE returned None, using database height: {desk.current_height}cm")
        except Exception as e:
            print(f"⚠️ Could not sync desk height: {e}")

        # Set desk to pending verification
        desk.current_user = request.user
        desk.current_status = "pending_verification"
        desk.save()
        print(f"✅ Desk {desk_id} set to pending_verification for {request.user.username}")

        # Check if desk has a Pico (requires physical confirmation)
        has_pico = Pico.objects.filter(desk_id=desk.id).exists()
        print(f"🔍 Desk {desk.id} has_pico: {has_pico}")

        # Create usage log
        usage_log = DeskUsageLog.objects.create(
            desk=desk,
            user=request.user,
            started_at=timezone.now(),
            last_height_change=timezone.now(),
            source="hotdesk",
        )
        print(f"✅ Created usage log ID: {usage_log.id}")

        if has_pico:
            # Notify Pico via MQTT to show "Press button to confirm"
            mqtt_service = get_mqtt_service()
            
            # Wait for MQTT connection with timeout
            import time
            max_wait = 3  # seconds
            wait_interval = 0.1  # check every 100ms
            elapsed = 0
            
            print(f"⏳ Waiting for MQTT connection...")
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
                print(f"✅ Published show_confirm_button to {topic} (connected after {elapsed:.1f}s)")
            else:
                print(f"⚠️ MQTT not connected after {max_wait}s, message not sent")
        else:
            # If no Pico, auto-confirm the hot desk
            desk.current_status = "occupied"
            desk.save()
            print(f"✅ Auto-confirmed desk {desk_id} (no Pico)")

        print(f"🏢 START_HOT_DESK: Returning success\n")
        return Response(
            {"success": True, "desk": desk.name, "requires_confirmation": has_pico}
        )
        
    except Desk.DoesNotExist:
        print(f"❌ Desk {desk_id} not found")
        return Response({"error": "Desk not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"❌ Unexpected error in start_hot_desk: {e}")
        import traceback
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

        # Optionally: update usage log to 'active'
        # log = DeskUsageLog.objects.filter(
        #     user=request.user, desk=desk, ended_at__isnull=True, status="pending_verification"
        # ).first()
        # if log:
        #     log.status = "active"
        #     log.save()

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
            desk.current_user = None
            desk.current_status = "available"
            desk.save()
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

        desk.current_user = None
        desk.current_status = "available"
        desk.save()
        return Response({"success": True})
    except Desk.DoesNotExist:
        return Response({"error": "Desk not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def hotdesk_status(request):
    date_str = request.GET.get("date")
    if not date_str:
        return Response({"error": "Date parameter required"}, status=400)

    date = timezone.datetime.strptime(date_str, "%Y-%m-%d").date()
    desks = Desk.objects.all()
    result = []
    now = timezone.now()

    for desk in desks:
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
            })
        else:
            result.append({
                "id": desk.id,
                "desk_name": desk.name,
                "reserved": False,
                "locked_for_checkin": False,
            })

    return Response(result)



# ---------------- RESERVATION ENDPOINTS ----------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_user_reservations(request):
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
    data = request.data.copy()
    data["user"] = request.user.id
    serializer = ReservationSerializer(data=data)
    if serializer.is_valid():
        serializer.save(status="confirmed")
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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

        # Mark reservation as active
        reservation.status = "active"
        reservation.checked_in_at = now
        reservation.save()

        # Mark desk as occupied
        desk = reservation.desk
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

        return Response({"success": True})

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
    date_str = request.GET.get("date")
    start_time = request.GET.get("start_time")
    end_time = request.GET.get("end_time")

    if not date_str or not start_time or not end_time:
        return Response({"error": "Date, start_time, and end_time required"}, status=400)

    # Build datetime ranges
    try:
        date = timezone.datetime.strptime(date_str, "%Y-%m-%d").date()
        start_dt = timezone.make_aware(
            timezone.datetime.strptime(f"{date_str} {start_time}", "%Y-%m-%d %H:%M")
        )
        end_dt = timezone.make_aware(
            timezone.datetime.strptime(f"{date_str} {end_time}", "%Y-%m-%d %H:%M")
        )
    except ValueError:
        return Response({"error": "Invalid date or time format"}, status=400)

    # Find conflicting reservations
    reserved_desks = Reservation.objects.filter(
        status__in=["confirmed", "active"],
        start_time__lt=end_dt,
        end_time__gt=start_dt
    ).values_list("desk_id", flat=True)

    desks = Desk.objects.exclude(id__in=reserved_desks)
    serializer = DeskSerializer(desks, many=True)
    return Response(serializer.data)



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def release_desk(request, desk_id):
    """Release a desk and finalize usage tracking"""
    try:
        desk = Desk.objects.get(id=desk_id)
        
        if desk.current_user != request.user:
            return Response(
                {"error": "You are not using this desk"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Get active usage log
        log = DeskUsageLog.objects.filter(
            user=request.user, 
            desk=desk, 
            ended_at__isnull=True
        ).first()
        
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

        # Release the desk
        desk.current_user = None
        desk.current_status = "available"
        desk.save()

        # ✅ NEW: Notify Pico that desk is now available
        mqtt_service = get_mqtt_service()
        has_pico = Pico.objects.filter(desk_id=desk.id).exists()
        
        if has_pico:
            mqtt_service.notify_desk_available(desk_id=desk.id)
            print(f"✅ Notified Pico: Desk {desk.id} is now available")

        return Response({"success": True})
        
    except Desk.DoesNotExist:
        return Response({"error": "Desk not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # ---- LOGS ----

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_desk_report(request, desk_id):
    try:
        message = request.data.get("message")

        if not message:
            return Response({"error": "Message is required"}, status=400)

        desk = Desk.objects.get(id=desk_id)

        report = DeskReport.objects.create(
            desk=desk,
            user=request.user,
            message=message
        )

        # 🔥 Add a log entry as well
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
    print("REPORTS:", reports)
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


