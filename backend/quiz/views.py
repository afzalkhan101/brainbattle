from django.db.models import Count, Prefetch
from rest_framework import generics, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, IsAuthenticatedOrReadOnly
from .models import Quiz, Question, Answer, QuizAttempt, AttemptAnswer
from .serializers import (
    QuizListSerializer,
    QuizDetailSerializer,
    QuizCreateUpdateSerializer,
    QuizSubmitSerializer,
    QuizAttemptSerializer,
    QuizAttemptDetailSerializer,
)
from rest_framework import serializers

# Custom permission
class IsTeacherOrAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return getattr(request.user, 'role', None) in ('teacher', 'admin') or request.user.is_staff

# ==============================
# Quiz List / Create
# ==============================
class QuizListCreateView(generics.ListCreateAPIView):
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'title']

    def get_queryset(self):
        qs = Quiz.objects.annotate(question_count=Count('questions'))
        user = self.request.user
        if getattr(user, 'role', None) in ('teacher', 'admin') or user.is_staff:
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

# ==============================
# Quiz Detail / Update / Delete
# ==============================
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

# ==============================
# Quiz Submit
# ==============================
class QuizSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            quiz = Quiz.objects.prefetch_related('questions__answers').get(pk=pk, is_published=True)
        except Quiz.DoesNotExist:
            return Response({'detail': 'Quiz not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = QuizSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        submitted = {
            item['question_id']: item['answer_id']
            for item in serializer.validated_data.get('answers', [])
            if item.get('answer_id') is not None
        }

        total_marks = 0
        obtained_marks = 0
        correct_count = 0
        answer_records = []

        for question in quiz.questions.all():
            correct_ids = {ans.id for ans in question.answers.all() if ans.is_correct}

            # Question marks based on difficulty
            if question.difficulty == 'hard':
                question_mark = 3
            elif question.difficulty == 'mid':
                question_mark = 2
            else:
                question_mark = 1

            total_marks += question_mark
            selected_id = submitted.get(question.id)
            is_correct = bool(selected_id and selected_id in correct_ids)
            earned = question_mark if is_correct else 0

            if is_correct:
                obtained_marks += question_mark
                correct_count += 1

            answer_records.append(
                AttemptAnswer(
                    question=question,
                    selected_answer=Answer.objects.filter(pk=selected_id).first() if selected_id else None,
                    is_correct=is_correct,
                    marks_obtained=earned,
                    marks_possible=question_mark,
                )
            )

        # Create QuizAttempt
        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            user=request.user,
            score=obtained_marks,
            total_marks=total_marks,
            total_questions=quiz.questions.count(),
            correct_answers=correct_count,
        )

        # Attach attempt to answer records and bulk create
        for rec in answer_records:
            rec.attempt = attempt
        AttemptAnswer.objects.bulk_create(answer_records)

        serializer_data = QuizAttemptSerializer(attempt).data
        serializer_data['total_submitted'] = len(submitted)
        print("############",serializer_data)
        return Response({
            "attempt": serializer_data
        }, status=status.HTTP_201_CREATED)

class MyAttemptsView(generics.ListAPIView):
    serializer_class = QuizAttemptSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return QuizAttempt.objects.filter(user=self.request.user).select_related('quiz', 'user')


class AttemptDetailView(generics.RetrieveAPIView):
    serializer_class = QuizAttemptDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return QuizAttempt.objects.filter(user=self.request.user).prefetch_related(
            Prefetch(
                'attempt_answers',
                queryset=AttemptAnswer.objects.select_related('question', 'selected_answer')
                .prefetch_related('question__answers')
                .order_by('question__order', 'question__id')
            )
        ).select_related('quiz')