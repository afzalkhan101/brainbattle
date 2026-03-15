from django.urls import path
from .views import UniversityListCreateView, UniversityDetailView

urlpatterns = [
    path('', UniversityListCreateView.as_view(), name='university-list-create'),
    path('<int:pk>/', UniversityDetailView.as_view(), name='university-detail'),
]
