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
    desk_detail,
    control_pico_led,          
    get_pico_sensor_data,
    list_available_hot_desks, start_hot_desk, confirm_hot_desk, end_hot_desk,
    list_user_reservations, create_reservation, cancel_pending_verification,
    check_in_reservation, check_out_reservation, hotdesk_status, available_desks_for_date
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
    path("desks/<int:desk_id>/", desk_detail, name="desk-detail"),
    path('desks/<int:desk_id>/usage/', desk_usage, name='desk_usage'),
    path('desks/<int:desk_id>/control/', control_desk_height, name='control_desk'),
    path('pico/<int:pico_id>/led/', control_pico_led, name='control_pico_led'),
    path('pico/<int:pico_id>/sensors/', get_pico_sensor_data, name='pico_sensor_data'),
    # HOT DESK
    path('desks/hotdesk/', list_available_hot_desks, name='hotdesk_list'),
    path('desks/hotdesk_status/', hotdesk_status, name='hotdesk_status'),
    path('desks/<int:desk_id>/hotdesk/cancel/', cancel_pending_verification, name='cancel_pending_verification'),
    path('desks/<int:desk_id>/hotdesk/start/', start_hot_desk, name='start_hot_desk'),
    path('desks/<int:desk_id>/hotdesk/confirm/', confirm_hot_desk, name='confirm_hot_desk'),
    path('desks/<int:desk_id>/hotdesk/end/', end_hot_desk, name='end_hot_desk'),

    # RESERVATIONS
    path('reservations/', list_user_reservations, name='reservations_list'),
    path('desks/available/', available_desks_for_date, name='available_desks_for_date'),
    path('reservations/create/', create_reservation, name='reservation_create'),
    path('reservations/<int:reservation_id>/check_in/', check_in_reservation, name='reservation_check_in'),
    path('reservations/<int:reservation_id>/check_out/', check_out_reservation, name='reservation_check_out'),
]