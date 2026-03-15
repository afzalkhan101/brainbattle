from django.urls import path
from .views import QuizListAPIView

urlpatterns = [
    path('', QuizListAPIView.as_view(), name='quiz-list'),
]