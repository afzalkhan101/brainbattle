from django.urls import path
from . import views

urlpatterns = [
    # Example placeholder route
    path('test/', views.test_view, name='test'),
]