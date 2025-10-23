from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from djoser.utils import decode_uid
from datetime import datetime, timedelta

from .serializers import UserRegisterSerializer, UserSerializer, DeskSerializer
from .models import Desk
from .services.WiFi2BLEService import WiFi2BLEService


@api_view(['POST'])
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

            access_token = tokens['access']
            refresh_token = tokens['refresh']

            res = Response()
            res.data = {'success': True}

            res.set_cookie(
                key='access_token',
                value=str(access_token),
                httponly=True,
                secure=False,
                samesite='Lax',
                path='/'
            )

            res.set_cookie(
                key='refresh_token',
                value=str(refresh_token),
                httponly=True,
                secure=False,
                samesite='Lax',
                path='/'
            )
            
            return res
        
        except Exception as e:
            print(e)
            return Response({'success': False}, status=status.HTTP_400_BAD_REQUEST)

        
class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        try:
            refresh_token = request.COOKIES.get('refresh_token')
            request.data['refresh'] = refresh_token

            response = super().post(request, *args, **kwargs)
            tokens = response.data
            access_token = tokens['access']

            res = Response()
            res.data = {'refreshed': True}

            res.set_cookie(
                key='access_token',
                value=access_token,
                httponly=True,
                secure=False,
                samesite='Lax',
                path='/'
            )
            return res

        except Exception as e:
            print(e)
            return Response({'refreshed': False}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        res = Response()
        res.data = {'success': True}
        res.delete_cookie('access_token', path='/', samesite='Lax')
        res.delete_cookie('refresh_token', path='/', samesite='Lax')
        return res

    except Exception as e:
        print(e)
        return Response({'success': False}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def is_logged_in(request):
    serializer = UserSerializer(request.user, many=False)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_confirm(request, uid, token):
    User = get_user_model()
    try:
        user = User.objects.get(pk=uid)
    except User.DoesNotExist:
        return Response({'error': 'Invalid user ID.'}, status=status.HTTP_400_BAD_REQUEST)

    new_password = request.data.get('new_password')
    re_new_password = request.data.get('re_new_password')

    if not new_password or not re_new_password:
        return Response({'error': 'Password fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if new_password != re_new_password:
        return Response({'error': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()
    return Response({'success': 'Password has been reset.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def set_initial_password(request, uid, token):
    User = get_user_model()
    try:
        user_id = decode_uid(uid)
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Invalid user ID.'}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

    password = request.data.get('password')
    if not password:
        return Response({'error': 'Password is required.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(password)
    user.is_active = True
    user.save()
    return Response({'success': 'Password set and account activated.'}, status=status.HTTP_200_OK)


# ===== DESK MANAGEMENT ENDPOINTS =====

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_desks(request):
    """Get all desks from database"""
    desks = Desk.objects.all()
    serializer = DeskSerializer(desks, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_desk_live_status(request, desk_id):
    """Get real-time desk status from WiFi2BLE"""
    try:
        desk = Desk.objects.get(id=desk_id)
    except Desk.DoesNotExist:
        return Response({'error': 'Desk not found'}, status=status.HTTP_404_NOT_FOUND)

    service = WiFi2BLEService()
    try:
        live_state = service.get_desk_state(desk.wifi2ble_id)
    except Exception as e:
        return Response({'error': f'Failed to get live desk state: {e}'}, 
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)

    if not live_state:
        return Response({'error': 'Could not get live status'}, 
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return Response({
        'desk_id': desk.id,
        'name': desk.name,
        'current_height': live_state.get('position_mm', 0) / 10,
        'speed': live_state.get('speed_mms', 0),
        'status': live_state.get('status', 'unknown'),
        'is_moving': live_state.get('speed_mms', 0) > 0
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def desk_usage(request, desk_id):
    """Get desk usage statistics"""
    try:
        desk = Desk.objects.get(id=desk_id)
        
        # TODO: Replace with actual usage tracking from DeskUsage model
        # For now, return mock data
        return Response({
            'desk_id': desk.id,
            'sitting_time': '3h 20m',
            'standing_time': '1h 45m',
            'position_changes': 8,
            'total_activations': desk.total_activations,
            'sit_stand_counter': desk.sit_stand_counter,
            'current_standing': '15 mins',
            'today_stats': {
                'sitting': '2h 10m',
                'standing': '45m',
                'changes': 5
            }
        })
        
    except Desk.DoesNotExist:
        return Response(
            {'error': 'Desk not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        print(f"Error in desk_usage: {e}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def control_desk_height(request, desk_id):
    """Control desk height"""
    try:
        desk = Desk.objects.get(id=desk_id)
        height = request.data.get('height')
        
        if not height:
            return Response(
                {'error': 'Height required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Send command to WiFi2BLE
        service = WiFi2BLEService()
        result = service.set_desk_height(desk.wifi2ble_id, float(height))
        
        if result:
            return Response({
                'success': True,
                'new_height': result['position_mm'] / 10
            })
        
        return Response(
            {'error': 'Failed to control desk'}, 
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    except Desk.DoesNotExist:
        return Response(
            {'error': 'Desk not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )