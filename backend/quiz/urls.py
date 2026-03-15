from django.urls import path
from .views import QuizListCreateView, QuizDetailView, QuizSubmitView, MyAttemptsView

urlpatterns = [
    path('', QuizListCreateView.as_view(), name='quiz-list-create'),
    path('my-attempts/', MyAttemptsView.as_view(), name='quiz-my-attempts'),
    path('<int:pk>/', QuizDetailView.as_view(), name='quiz-detail'),
    path('<int:pk>/submit/', QuizSubmitView.as_view(), name='quiz-submit'),
]
