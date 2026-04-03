from django.db.models import Count, Prefetch
from rest_framework import generics, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, IsAuthenticatedOrReadOnly

from .models import Quiz, Question, Answer, QuizAttempt
from .serializers import (
    QuizListSerializer,
    QuizDetailSerializer,
    QuizCreateUpdateSerializer,
    QuizSubmitSerializer,
    QuizAttemptSerializer,
)


class IsTeacherOrAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.user.role in ('teacher', 'admin') or request.user.is_staff


class QuizListCreateView(generics.ListCreateAPIView):
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'title']

    def get_queryset(self):
        qs = Quiz.objects.annotate(question_count=Count('questions'))
        user = self.request.user

        if hasattr(user, 'role') and user.role in ('teacher', 'admin') or user.is_staff:
            return qs
        return qs.filter(is_published=True)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return QuizCreateUpdateSerializer
        return QuizListSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsTeacherOrAdmin()]
        return [IsAuthenticatedOrReadOnly()]


class QuizDetailView(generics.RetrieveUpdateDestroyAPIView):

    def get_queryset(self):
        return Quiz.objects.prefetch_related(
            Prefetch(
                'questions',
                queryset=Question.objects.prefetch_related('answers').order_by('order', 'id')
            )
        )

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return QuizCreateUpdateSerializer
        return QuizDetailSerializer

    def get_permissions(self):
        if self.request.method == 'DELETE':
            return [IsAdminUser()]
        if self.request.method in ('PUT', 'PATCH'):
            return [IsTeacherOrAdmin()]
        return [IsAuthenticatedOrReadOnly()]


# 🔥 FINAL SUBMIT LOGIC (Marks-based)
class QuizSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            quiz = Quiz.objects.prefetch_related(
                'questions__answers'
            ).get(pk=pk, is_published=True)
        except Quiz.DoesNotExist:
            return Response({'detail': 'Quiz not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = QuizSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        submitted = {
            item['question_id']: item['answer_id']
            for item in serializer.validated_data['answers']
        }

        total_marks = 0
        obtained_marks = 0
        correct_count = 0

        for question in quiz.questions.all():
            correct_ids = {
                ans.id for ans in question.answers.all() if ans.is_correct
            }

            # 🎯 Difficulty-based marks
            if question.difficulty == 'hard':
                question_mark = 3
            elif question.difficulty == 'mid':
                question_mark = 2
            else:
                question_mark = 1

            total_marks += question_mark

            # ✅ Answer check
            if submitted.get(question.id) in correct_ids:
                obtained_marks += question_mark
                correct_count += 1

        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            user=request.user,
            score=obtained_marks,
            total_marks=total_marks,
            total_questions=quiz.questions.count(),
            correct_answers=correct_count,
        )

        return Response(QuizAttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)


class MyAttemptsView(generics.ListAPIView):
    serializer_class = QuizAttemptSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return QuizAttempt.objects.filter(
            user=self.request.user
        ).select_related('quiz', 'user')