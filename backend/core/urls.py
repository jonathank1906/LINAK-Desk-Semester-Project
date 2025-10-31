from django.urls import path, include
from .views import (
    CustomTokenObtainPairView, 
    CustomTokenRefreshView, 
    logout, 
    register, 
    is_logged_in, 
    reset_password_confirm, 
    set_initial_password, 
    get_user_desks, 
    get_desk_live_status, 
    control_desk_height,
    desk_usage,
    control_pico_led,          
    get_pico_sensor_data
)

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('logout/', logout),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('register/', register),
    path('authenticated/', is_logged_in),
    path('auth/', include('djoser.urls')),
    path('auth/', include('djoser.urls.jwt')),
    path('password/reset/confirm/<int:uid>/<str:token>', reset_password_confirm, name="password_reset_confirm"),
    path('auth/set-initial-password/<str:uid>/<str:token>/', set_initial_password, name='set_initial_password'),
    path('desks/', get_user_desks, name='get_desks'),
    path('desks/<int:desk_id>/status/', get_desk_live_status, name='desk_status'),
    path('desks/<int:desk_id>/usage/', desk_usage, name='desk_usage'),
    path('desks/<int:desk_id>/control/', control_desk_height, name='control_desk'),
     path('pico/<int:pico_id>/led/', control_pico_led, name='control_pico_led'),
    path('pico/<int:pico_id>/sensors/', get_pico_sensor_data, name='pico_sensor_data'),
]