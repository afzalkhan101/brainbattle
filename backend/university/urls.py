from django.urls import path
from .views import UniversityListAPIView

urlpatterns = [
    path('', UniversityListAPIView.as_view(), name='university-list'),
]