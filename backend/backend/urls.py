from django.contrib import admin
from django.urls import path, include
from core.views import UserDeskPreferenceViewSet
from rest_framework.routers import DefaultRouter


router = DefaultRouter()
router.register(r'preferences', UserDeskPreferenceViewSet, basename='preferences')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('api/', include(router.urls)),
    path('dj-rest-auth/registration/', include('dj_rest_auth.registration.urls')),
]
