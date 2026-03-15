from rest_framework import generics
from .models import Quiz
from .serializers import QuizSerializer

class QuizListAPIView(generics.ListAPIView):
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer