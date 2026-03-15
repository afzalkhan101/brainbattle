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
    """Allow teachers and admins to modify quizzes."""
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.user.role in ('teacher', 'admin') or request.user.is_staff


class QuizListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/quizzes/   - list published quizzes (search + ordering)
    POST /api/quizzes/   - create quiz (teacher/admin only)
    """
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'title']

    def get_queryset(self):
        qs = Quiz.objects.annotate(question_count=Count('questions'))
        user = self.request.user
        # Staff/teachers see all; others see published only
        if hasattr(user, 'role') and user.role in ('teacher', 'admin') or (
            hasattr(user, 'is_staff') and user.is_staff
        ):
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
    """
    GET    /api/quizzes/<id>/   - full quiz with questions
    PUT    /api/quizzes/<id>/   - update (teacher/admin)
    PATCH  /api/quizzes/<id>/   - partial update
    DELETE /api/quizzes/<id>/   - delete (admin only)
    """
    def get_queryset(self):
        # Eager-load questions → answers to avoid N+1
        return Quiz.objects.prefetch_related(
            Prefetch('questions', queryset=Question.objects.prefetch_related('answers').order_by('order', 'id'))
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


class QuizSubmitView(APIView):
    """
    POST /api/quizzes/<id>/submit/
    Body: { "answers": [{"question_id": 1, "answer_id": 3}, ...] }
    Returns: score, correct count, total questions
    """
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

        # Build a lookup: question_id → correct answer_id(s)
        correct_map = {}
        for question in quiz.questions.all():
            correct_map[question.id] = {
                ans.id for ans in question.answers.all() if ans.is_correct
            }

        total = len(correct_map)
        correct = sum(
            1 for q_id, correct_ids in correct_map.items()
            if submitted.get(q_id) in correct_ids
        )
        score = round((correct / total * 100) if total else 0, 2)

        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            user=request.user,
            score=score,
            total_questions=total,
            correct_answers=correct,
        )
        return Response(QuizAttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)


class MyAttemptsView(generics.ListAPIView):
    """GET /api/quizzes/my-attempts/ — current user's history"""
    serializer_class = QuizAttemptSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return QuizAttempt.objects.filter(
            user=self.request.user
        ).select_related('quiz', 'user')
