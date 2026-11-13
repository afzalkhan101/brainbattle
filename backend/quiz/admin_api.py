"""API for the application admin dashboard, separate from Django admin."""
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q
from django.urls import path
from rest_framework import filters, generics, serializers
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Answer, Question, Quiz, QuizAttempt, Subject, BankQuestion, Contest
from .serializers import QuizAttemptSerializer, SubjectSerializer


class DashboardAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user.is_authenticated and user.is_active and (
            user.role == 'admin' or user.is_superuser
        ))


class AdminAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ['answer_text', 'is_correct']


class AdminQuestionSerializer(serializers.ModelSerializer):
    answers = AdminAnswerSerializer(many=True)

    class Meta:
        model = Question
        fields = ['question_text', 'difficulty', 'answers']

    def validate_answers(self, answers):
        if len(answers) < 2 or sum(a.get('is_correct', False) for a in answers) != 1:
            raise serializers.ValidationError('Provide at least two answers and exactly one correct answer.')
        return answers


class AdminQuizSerializer(serializers.ModelSerializer):
    questions = AdminQuestionSerializer(many=True, required=False)
    question_count = serializers.IntegerField(source='questions.count', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True, default='Unassigned')
    status_label = serializers.CharField(read_only=True)
    has_attempts = serializers.SerializerMethodField()
    duration_minutes = serializers.IntegerField(min_value=1, max_value=1440)

    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'subject', 'subject_name', 'is_published',
                  'scheduled_at', 'duration_minutes', 'status_label', 'questions',
                  'question_count', 'has_attempts', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def get_has_attempts(self, obj):
        return obj.attempts.exists()

    def validate_questions(self, questions):
        # PATCH relaxes nested required fields, but each replacement must be complete.
        for question in questions:
            if not question.get('question_text') or 'answers' not in question:
                raise serializers.ValidationError('Each question needs text and answers.')
            if any(not answer.get('answer_text') for answer in question['answers']):
                raise serializers.ValidationError('Every answer needs text.')
        return questions

    def validate(self, attrs):
        questions = attrs.get('questions')
        if self.instance and questions is not None and self.instance.attempts.exists():
            raise serializers.ValidationError({'questions': 'Questions are locked after students submit attempts. Create a new quiz to change them.'})
        published = attrs.get('is_published', self.instance.is_published if self.instance else False)
        if published and not (questions if questions is not None else self.instance and self.instance.questions.exists()):
            raise serializers.ValidationError({'questions': 'Add at least one question before publishing.'})
        return attrs

    @staticmethod
    def save_questions(quiz, questions):
        for index, question in enumerate(questions):
            answers = question.pop('answers')
            item = Question.objects.create(quiz=quiz, order=index, **question)
            Answer.objects.bulk_create([Answer(question=item, **answer) for answer in answers])

    @transaction.atomic
    def create(self, validated_data):
        questions = validated_data.pop('questions', [])
        quiz = Quiz.objects.create(created_by=self.context['request'].user, **validated_data)
        self.save_questions(quiz, questions)
        return quiz

    @transaction.atomic
    def update(self, instance, validated_data):
        questions = validated_data.pop('questions', None)
        instance = super().update(instance, validated_data)
        if questions is not None:
            instance.questions.all().delete()
            self.save_questions(instance, questions)
        return instance


class AdminQuizList(generics.ListCreateAPIView):
    permission_classes = [DashboardAdmin]
    serializer_class = AdminQuizSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'subject__name']

    def get_queryset(self):
        qs = Quiz.objects.select_related('subject').prefetch_related('questions__answers', 'attempts')
        status = self.request.query_params.get('status')
        from django.utils import timezone
        if status == 'draft':
            qs = qs.filter(is_published=False)
        elif status == 'upcoming':
            qs = qs.filter(is_published=True, scheduled_at__gt=timezone.now())
        elif status == 'live':
            qs = qs.filter(is_published=True).filter(Q(scheduled_at__isnull=True) | Q(scheduled_at__lte=timezone.now()))
        return qs


class AdminQuizDetail(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [DashboardAdmin]
    serializer_class = AdminQuizSerializer
    queryset = Quiz.objects.select_related('subject').prefetch_related('questions__answers', 'attempts')


class StudentSerializer(serializers.ModelSerializer):
    attempts_count = serializers.IntegerField(read_only=True)
    class Meta:
        model = get_user_model()
        fields = ['id', 'full_name', 'email', 'class_level', 'institution', 'is_active', 'date_joined', 'attempts_count']


class AdminStudents(generics.ListAPIView):
    permission_classes = [DashboardAdmin]
    serializer_class = StudentSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['first_name', 'last_name', 'email', 'institution']

    def get_queryset(self):
        qs = get_user_model().objects.filter(role='student').annotate(attempts_count=Count('quiz_attempts')).order_by('-date_joined')
        level = self.request.query_params.get('class_level')
        return qs.filter(class_level=level) if level else qs


class StudentClassSerializer(serializers.ModelSerializer):
    class_level = serializers.ChoiceField(choices=get_user_model().ClassLevel.choices)

    class Meta:
        model = get_user_model()
        fields = ['class_level']


class AdminStudentClass(generics.UpdateAPIView):
    permission_classes = [DashboardAdmin]
    serializer_class = StudentClassSerializer
    queryset = get_user_model().objects.filter(role='student')


class AdminResults(generics.ListAPIView):
    permission_classes = [DashboardAdmin]
    serializer_class = QuizAttemptSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['quiz__title', 'user__email', 'user__first_name', 'user__last_name']
    queryset = QuizAttempt.objects.select_related('quiz__subject', 'user').prefetch_related('attempt_answers')


class AdminSubjects(generics.ListCreateAPIView):
    permission_classes = [DashboardAdmin]
    serializer_class = SubjectSerializer
    queryset = Subject.objects.all()


class AdminOverview(APIView):
    permission_classes = [DashboardAdmin]

    def get(self, request):
        students = get_user_model().objects.filter(role='student')
        quizzes = Quiz.objects.all()
        events = [dict(id=f'q{q.pk}', title='Quiz published' if q.is_published else 'Quiz saved',
                       detail=q.title, at=q.updated_at) for q in quizzes.order_by('-updated_at')[:5]]
        events += [dict(id=f's{s.pk}', title='New student joined', detail=s.full_name or s.email,
                        at=s.date_joined) for s in students.order_by('-date_joined')[:5]]
        return Response(dict(bank_questions=BankQuestion.objects.count(), contests=Contest.objects.count(), students=students.count(), quizzes=quizzes.count(),
                             published=quizzes.filter(is_published=True).count(),
                             attempts=QuizAttempt.objects.count(),
                             activity=sorted(events, key=lambda e: e['at'], reverse=True)[:5]))


urlpatterns = [
    path('overview/', AdminOverview.as_view()),
    path('quizzes/', AdminQuizList.as_view()),
    path('quizzes/<int:pk>/', AdminQuizDetail.as_view()),
    path('students/', AdminStudents.as_view()),
    path('students/<int:pk>/class/', AdminStudentClass.as_view()),
    path('results/', AdminResults.as_view()),
    path('subjects/', AdminSubjects.as_view()),
]
