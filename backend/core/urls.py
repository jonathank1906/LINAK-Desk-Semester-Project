from django.urls import path, include
from .views import CustomTokenObtainPairView, CustomTokenRefreshView, logout, register, is_logged_in, reset_password_confirm, set_initial_password

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
]
