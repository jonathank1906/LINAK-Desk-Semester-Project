from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
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
)
from .models import Desk
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
    """Get desk usage statistics"""
    try:
        desk = Desk.objects.get(id=desk_id)

        # TODO: Replace with actual usage tracking from DeskUsage model
        # For now, return mock data
        return Response(
            {
                "desk_id": desk.id,
                "sitting_time": "3h 20m",
                "standing_time": "1h 45m",
                "position_changes": 8,
                "total_activations": desk.total_activations,
                "sit_stand_counter": desk.sit_stand_counter,
                "current_standing": "15 mins",
                "today_stats": {"sitting": "2h 10m", "standing": "45m", "changes": 5},
            }
        )

    except Desk.DoesNotExist:
        return Response({"error": "Desk not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error in desk_usage: {e}")
        return Response(
            {"error": "Internal server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def control_desk_height(request, desk_id):
    """Control desk height"""
    try:
        desk = Desk.objects.get(id=desk_id)
        height = request.data.get("height")

        if not height:
            return Response(
                {"error": "Height required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Send command to WiFi2BLE
        service = WiFi2BLEService()
        result = service.set_desk_height(desk.wifi2ble_id, float(height))

        if result:
            return Response({"success": True, "new_height": result["position_mm"] / 10})

        return Response(
            {"error": "Failed to control desk"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

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
    try:
        desk = Desk.objects.get(id=desk_id)
        if desk.current_status not in ["available", "Normal"]:
            return Response(
                {"error": "Desk not available"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Set desk to pending verification
        desk.current_user = request.user
        desk.current_status = "pending_verification"
        desk.save()

         # Check if desk has a Pico (requires physical confirmation)
        has_pico = Pico.objects.filter(desk_id=desk.id).exists()
        print(f"Desk {desk.id} has_pico: {has_pico}")

        if has_pico:
            # Notify Pico via MQTT to show "Press button to confirm"
            mqtt_service = get_mqtt_service()
            topic = f"/desk/{desk.id}/display"
            message = {
                "action": "show_confirm_button",
                "desk_id": desk.id,
                "desk_name": desk.name,
                "user": request.user.get_full_name() or request.user.username,
            }
            mqtt_service.publish(topic, json.dumps(message))

        else:
            # If no Pico, auto-confirm the hot desk
            desk.current_status = "occupied"
            desk.save()

        return Response({"success": True, "desk": desk.name, "requires_confirmation": has_pico})   
    except Desk.DoesNotExist:
        return Response({"error": "Desk not found"}, status=status.HTTP_404_NOT_FOUND)


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

    for desk in desks:
        reservation = (
            Reservation.objects.filter(
                desk=desk, start_time__date=date, status__in=["confirmed", "active"]
            )
            .order_by("start_time")
            .first()
        )
        if reservation:
            result.append(
                {
                    "id": desk.id,
                    "desk_name": desk.name,  # added
                    "reserved": True,
                    "reserved_time": reservation.start_time.strftime("%H:%M"),
                }
            )
        else:
            result.append(
                {"id": desk.id, "desk_name": desk.name, "reserved": False}  # added
            )

    return Response(result)


# ---------------- RESERVATION ENDPOINTS ----------------


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_user_reservations(request):
    reservations = Reservation.objects.filter(user=request.user).order_by("-start_time")
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
        if reservation.status != "confirmed":
            return Response(
                {"error": "Reservation not confirmed or already active"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Mark reservation as active
        reservation.status = "active"
        reservation.checked_in_at = timezone.now()
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
            started_at=timezone.now(),
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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def available_desks_for_date(request):
    date_str = request.GET.get("date")
    if not date_str:
        return Response({"error": "Date parameter required"}, status=400)
    date = timezone.datetime.strptime(date_str, "%Y-%m-%d").date()
    # Get desks not reserved for this date
    reserved_desks = Reservation.objects.filter(
        start_time__date=date, status__in=["confirmed", "active"]
    ).values_list("desk_id", flat=True)
    desks = Desk.objects.exclude(id__in=reserved_desks)
    serializer = DeskSerializer(desks, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def release_desk(request, desk_id):
    """
    Release a desk (hotdesk or reserved): set status to 'available' and clear current_user.
    """
    try:
        desk = Desk.objects.get(id=desk_id)
        # Only allow release if the current user is the one occupying the desk
        if desk.current_user != request.user:
            return Response(
                {"error": "You are not using this desk"},
                status=status.HTTP_403_FORBIDDEN,
            )
        desk.current_user = None
        desk.current_status = "available"
        desk.save()
        return Response({"success": True})
    except Desk.DoesNotExist:
        return Response({"error": "Desk not found"}, status=status.HTTP_404_NOT_FOUND)
