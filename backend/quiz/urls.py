from django.urls import path
from .views import (
    QuizListCreateView,
    QuizDetailView,
    QuizSubmitView,
    MyAttemptsView,
    AttemptDetailView,
)

urlpatterns = [
    path('',                      QuizListCreateView.as_view(), name='quiz-list-create'),
    path('my-attempts/',          MyAttemptsView.as_view(),     name='quiz-my-attempts'),
    path('attempts/<int:pk>/',    AttemptDetailView.as_view(),  name='quiz-attempt-detail'),
    path('<int:pk>/',             QuizDetailView.as_view(),     name='quiz-detail'),
    path('<int:pk>/submit/',      QuizSubmitView.as_view(),     name='quiz-submit'),
]