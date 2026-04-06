from django.db.models import Count, Prefetch, Q
from django.utils import timezone
from rest_framework import generics, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated, IsAdminUser, IsAuthenticatedOrReadOnly

from .models import Subject, Quiz, Question, Answer, QuizAttempt, AttemptAnswer
from .serializers import (
    SubjectSerializer,
    QuizListSerializer,
    QuizDetailSerializer,
    QuizCreateUpdateSerializer,
    QuizSubmitSerializer,
    QuizAttemptSerializer,
    QuizAttemptDetailSerializer,
)

MARKS_MAP = {'hard': 3, 'mid': 2, 'simple': 1}

def _is_privileged(user) -> bool:
    return (
        user.is_authenticated
        and (
            getattr(user, 'role', None) in ('teacher', 'admin')
            or user.is_staff
        )
    )


class IsTeacherOrAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return _is_privileged(request.user)



class SubjectListCreateView(generics.ListCreateAPIView):
    """
    GET  /subjects/              → list  (?class_level=hsc)
    POST /subjects/              → create (teacher/admin)
    """
    serializer_class = SubjectSerializer
    filter_backends  = [filters.SearchFilter, filters.OrderingFilter]
    search_fields    = ['name', 'description']
    ordering_fields  = ['name', 'class_level']

    def get_queryset(self):
        qs          = Subject.objects.all()
        class_level = self.request.query_params.get('class_level')
        if class_level:
            qs = qs.filter(class_level=class_level)
        return qs

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsTeacherOrAdmin()]
        return [IsAuthenticatedOrReadOnly()]


class SubjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /subjects/<pk>/
    PATCH  /subjects/<pk>/   → teacher/admin
    DELETE /subjects/<pk>/   → admin only
    """
    serializer_class = SubjectSerializer
    queryset         = Subject.objects.all()

    def get_permissions(self):
        if self.request.method == 'DELETE':
            return [IsAdminUser()]
        if self.request.method in ('PUT', 'PATCH'):
            return [IsTeacherOrAdmin()]
        return [IsAuthenticatedOrReadOnly()]
    
class QuizListCreateView(generics.ListCreateAPIView):
    """
    GET  /quizzes/
         ?class_level=ssc
         ?subject=<id>
         ?status=draft|upcoming|live   (teacher/admin only)
         ?search=<term>
         ?ordering=scheduled_at

    POST /quizzes/   → teacher/admin only
    """
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields   = ['title', 'description']
    ordering_fields = ['created_at', 'title', 'scheduled_at']

    def get_queryset(self):
        qs   = Quiz.objects.select_related('subject').annotate(
            question_count=Count('questions', distinct=True)
        )
        user = self.request.user
        
        if not _is_privileged(user):
            qs = qs.filter(
                Q(is_published=True, scheduled_at__isnull=True)
                | Q(is_published=True, scheduled_at__lte=timezone.now())
            )
        else:
            status_filter = self.request.query_params.get('status')
            if status_filter == 'draft':
                qs = qs.filter(is_published=False)
            elif status_filter == 'upcoming':
                qs = qs.filter(is_published=True, scheduled_at__gt=timezone.now())
            elif status_filter == 'live':
                qs = qs.filter(
                    Q(is_published=True, scheduled_at__isnull=True)
                    | Q(is_published=True, scheduled_at__lte=timezone.now())
                )

        # Shared filters
        class_level = self.request.query_params.get('class_level')
        subject_id  = self.request.query_params.get('subject')
        if class_level:
            qs = qs.filter(subject__class_level=class_level)
        if subject_id:
            qs = qs.filter(subject_id=subject_id)

        return qs.distinct()

    def get_serializer_class(self):
        return QuizCreateUpdateSerializer if self.request.method == 'POST' else QuizListSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsTeacherOrAdmin()]
        return [IsAuthenticatedOrReadOnly()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class QuizDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /quizzes/<pk>/   → students: live only; teacher: always
    PATCH  /quizzes/<pk>/   → teacher/admin
    DELETE /quizzes/<pk>/   → admin only
    """

    def get_queryset(self):
        return Quiz.objects.select_related('subject').prefetch_related(
            Prefetch(
                'questions',
                queryset=Question.objects.prefetch_related('answers').order_by('order', 'id'),
            )
        )

    def get_object(self):
        obj = super().get_object()
        if not _is_privileged(self.request.user) and not obj.is_live:
            raise NotFound('Quiz not found or not yet available.')
        return obj

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
    POST /quizzes/<pk>/submit/

    Guards:
      ① Quiz must be live (published + scheduled time reached)
      ② One attempt per user per quiz
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            quiz = (
                Quiz.objects
                .prefetch_related('questions__answers')
                .get(pk=pk, is_published=True)
            )
        except Quiz.DoesNotExist:
            raise NotFound('Quiz not found.')
        
        if not quiz.is_live:
            return Response(
                {
                    'detail': 'Quiz has not started yet.',
                    'scheduled_at': quiz.scheduled_at,
                    'seconds_until_start': int(
                        (quiz.scheduled_at - timezone.now()).total_seconds()
                    ) if quiz.scheduled_at else None,
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        
        if QuizAttempt.objects.filter(quiz=quiz, user=request.user).exists():
            return Response(
                {'detail': 'You have already attempted this quiz.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        serializer = QuizSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        submitted = {
            item['question_id']: item.get('answer_id')
            for item in serializer.validated_data['answers']
        }

        total_marks    = 0
        obtained_marks = 0
        correct_count  = 0
        answer_records = []

        for question in quiz.questions.all():
            correct_ids   = {ans.id for ans in question.answers.all() if ans.is_correct}
            question_mark = MARKS_MAP.get(question.difficulty, 1)
            total_marks  += question_mark

            selected_id = submitted.get(question.id)
            is_correct  = bool(selected_id and selected_id in correct_ids)
            earned      = question_mark if is_correct else 0

            if is_correct:
                obtained_marks += question_mark
                correct_count  += 1

            answer_records.append(
                AttemptAnswer(
                    question=question,
                    selected_answer=(
                        Answer.objects.filter(pk=selected_id).first()
                        if selected_id else None
                    ),
                    is_correct=is_correct,
                    marks_obtained=earned,
                    marks_possible=question_mark,
                )
            )

        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            user=request.user,
            score=obtained_marks,
            total_marks=total_marks,
            total_questions=quiz.questions.count(),
            correct_answers=correct_count,
        )

        for rec in answer_records:
            rec.attempt = attempt
        AttemptAnswer.objects.bulk_create(answer_records)

        data = QuizAttemptSerializer(attempt).data
        data['total_submitted'] = len([v for v in submitted.values() if v])
        return Response({'attempt': data}, status=status.HTTP_201_CREATED)



class MyAttemptsView(generics.ListAPIView):
    """GET /attempts/   ?class_level=hsc"""
    serializer_class   = QuizAttemptSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = (
            QuizAttempt.objects
            .filter(user=self.request.user)
            .select_related('quiz', 'quiz__subject', 'user')
            .order_by('-submitted_at')
        )
        class_level = self.request.query_params.get('class_level')
        if class_level:
            qs = qs.filter(quiz__subject__class_level=class_level)
        return qs


class AttemptDetailView(generics.RetrieveAPIView):
    """GET /attempts/<pk>/  → full per-question breakdown"""
    serializer_class   = QuizAttemptDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            QuizAttempt.objects
            .filter(user=self.request.user)
            .select_related('quiz', 'quiz__subject')
            .prefetch_related(
                Prefetch(
                    'attempt_answers',
                    queryset=(
                        AttemptAnswer.objects
                        .select_related('question', 'selected_answer')
                        .prefetch_related('question__answers')
                        .order_by('question__order', 'question__id')
                    ),
                )
            )
        )