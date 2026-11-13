"""Question bank practice and timed, snapshotted subject contests."""
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
from django.db import transaction
from django.db.models import Count, Exists, OuterRef, Q
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404
from django.urls import path
from django.utils import timezone
from rest_framework import filters, generics, serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .admin_api import DashboardAdmin
from .access import class_scope
from .models import (Answer, BankQuestion, Contest, ContestEntry, ContestQuestion,
                     PracticeAttempt, Question, Subject)
from .progress import build_progress

MARKS = {'simple': 1, 'mid': 2, 'hard': 3}


class StudentOnly(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == 'student'


def reserved_questions():
    now = timezone.now()
    return ContestQuestion.objects.filter(contest__is_published=True, contest__starts_at__lte=now,
                                          contest__ends_at__gt=now).values('question_id')


def practice_questions(user):
    attempts = PracticeAttempt.objects.filter(user=user, question_id=OuterRef('pk'))
    return class_scope(BankQuestion.objects.all(), user).filter(is_active=True).exclude(pk__in=reserved_questions()).select_related('subject').annotate(
        solved=Exists(attempts.filter(is_correct=True)), attempted=Exists(attempts))


class QuestionFilters(serializers.Serializer):
    subject = serializers.IntegerField(required=False, min_value=1)
    chapter = serializers.CharField(required=False, allow_blank=True, max_length=150)
    difficulty = serializers.ChoiceField(choices=['simple', 'mid', 'hard'], required=False)
    status = serializers.ChoiceField(choices=['solved', 'unsolved', 'wrong'], required=False)
    active = serializers.ChoiceField(choices=['true', 'false'], required=False)


def filter_questions(qs, request, admin=False):
    params = QuestionFilters(data={k: v for k, v in request.query_params.items() if v != ''})
    params.is_valid(raise_exception=True)
    data = params.validated_data
    for field in ['subject', 'chapter', 'difficulty']:
        if field in data:
            qs = qs.filter(**{field: data[field]})
    if admin:
        if 'active' in data:
            qs = qs.filter(is_active=data['active'] == 'true')
    elif data.get('status') == 'solved':
        qs = qs.filter(solved=True)
    elif data.get('status') == 'unsolved':
        qs = qs.filter(solved=False)
    elif data.get('status') == 'wrong':
        qs = qs.filter(attempted=True, solved=False)
    return qs


class BankSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    question_text = serializers.CharField(max_length=5000)
    explanation = serializers.CharField(max_length=5000, required=False, allow_blank=True)
    options = serializers.ListField(child=serializers.CharField(max_length=1000), min_length=2, max_length=6)

    class Meta:
        model = BankQuestion
        fields = ['id', 'subject', 'subject_name', 'chapter', 'question_text', 'options', 'correct_index',
                  'explanation', 'difficulty', 'is_active']

    def validate(self, data):
        options = data.get('options', self.instance.options if self.instance else [])
        correct = data.get('correct_index', self.instance.correct_index if self.instance else None)
        if correct is None or not 0 <= correct < len(options):
            raise ValidationError({'correct_index': 'Select one of the provided options as the correct answer.'})
        return data


class PracticeQuestionSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    solved = serializers.BooleanField(read_only=True)
    attempted = serializers.BooleanField(read_only=True)

    class Meta:
        model = BankQuestion
        fields = ['id', 'subject', 'subject_name', 'chapter', 'question_text', 'options', 'difficulty', 'solved', 'attempted']


class AdminBankList(generics.ListCreateAPIView):
    permission_classes = [DashboardAdmin]
    serializer_class = BankSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['question_text', 'chapter', 'subject__name']

    def get_queryset(self):
        return filter_questions(BankQuestion.objects.select_related('subject'), self.request, admin=True)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AdminBankDetail(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [DashboardAdmin]
    serializer_class = BankSerializer
    queryset = BankQuestion.objects.select_related('subject')

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active'])


class AdminBankImport(APIView):
    permission_classes = [DashboardAdmin]

    @transaction.atomic
    def post(self, request):
        questions = request.data.get('questions')
        if not isinstance(questions, list) or not 1 <= len(questions) <= 2000:
            raise ValidationError('Import between 1 and 2,000 questions per JSON file.')
        serializer = BankSerializer(data=questions, many=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(created_by=request.user)
        return Response({'imported': len(questions)}, status=201)


class AdminLegacyImport(APIView):
    permission_classes = [DashboardAdmin]

    @transaction.atomic
    def post(self, request):
        quiz_id = request.data.get('quiz_id')
        if not isinstance(quiz_id, int) or isinstance(quiz_id, bool):
            raise ValidationError({'quiz_id': 'Choose an existing quiz.'})
        from .models import Quiz
        quiz = get_object_or_404(Quiz, pk=quiz_id)
        if not quiz.subject_id:
            raise ValidationError('Assign a subject to this quiz before importing.')
        imported = skipped = 0
        for question in quiz.questions.prefetch_related('answers'):
            answers = list(question.answers.all())
            correct = [i for i, a in enumerate(answers) if a.is_correct]
            if not 2 <= len(answers) <= 6 or len(correct) != 1:
                skipped += 1
                continue
            _, created = BankQuestion.objects.get_or_create(source_question=question, defaults={
                'subject': quiz.subject, 'question_text': question.question_text,
                'difficulty': question.difficulty, 'options': [a.answer_text for a in answers],
                'correct_index': correct[0], 'created_by': request.user,
            })
            imported += int(created)
            skipped += int(not created)
        return Response({'imported': imported, 'skipped': skipped})


class PracticeList(generics.ListAPIView):
    permission_classes = [StudentOnly]
    serializer_class = PracticeQuestionSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['question_text', 'chapter', 'subject__name']

    def get_queryset(self):
        return filter_questions(practice_questions(self.request.user), self.request)


class PracticeDetail(generics.RetrieveAPIView):
    permission_classes = [StudentOnly]
    serializer_class = PracticeQuestionSerializer

    def get_queryset(self):
        return practice_questions(self.request.user)


def practice_result(attempt):
    return {'id': attempt.pk, 'question': attempt.question_id, 'selected_index': attempt.selected_index,
            'is_correct': attempt.is_correct, **attempt.question_snapshot}


class PracticeSubmit(APIView):
    permission_classes = [StudentOnly]

    @transaction.atomic
    def post(self, request, pk):
        class Input(serializers.Serializer):
            selected_index = serializers.IntegerField(min_value=0)
            request_id = serializers.UUIDField()
        params = Input(data=request.data)
        params.is_valid(raise_exception=True)
        data = params.validated_data
        previous = class_scope(PracticeAttempt.objects.all(), request.user, 'question__subject__class_level').filter(user=request.user, request_id=data['request_id']).first()
        if previous:
            if previous.question_id != pk or previous.selected_index != data['selected_index']:
                raise ValidationError('This submission identifier has already been used.')
            return Response(practice_result(previous))
        question = get_object_or_404(practice_questions(request.user).select_for_update(), pk=pk)
        if data['selected_index'] >= len(question.options):
            raise ValidationError('Select one of the provided options.')
        attempt, created = PracticeAttempt.objects.get_or_create(user=request.user, request_id=data['request_id'], defaults={
            'question': question, 'selected_index': data['selected_index'],
            'is_correct': data['selected_index'] == question.correct_index, 'question_snapshot': question.snapshot()})
        if attempt.question_id != pk or attempt.selected_index != data['selected_index']:
            raise ValidationError('This submission identifier has already been used.')
        return Response(practice_result(attempt), status=201 if created else 200)



def practice_stats(user, now):
    tz = ZoneInfo('Asia/Dhaka')
    today = now.astimezone(tz).date()
    start = datetime.combine(today, time.min, tzinfo=tz)
    attempts = class_scope(PracticeAttempt.objects.all(), user, 'question__subject__class_level').filter(user=user)
    counts = attempts.aggregate(total=Count('id'), correct=Count('id', filter=Q(is_correct=True)))
    days = set(attempts.annotate(day=TruncDate('submitted_at', tzinfo=tz)).values_list('day', flat=True).distinct())
    cursor = today if today in days else today - timedelta(days=1)
    streak = 0
    while cursor in days:
        streak += 1
        cursor -= timedelta(days=1)
    return {'attempts': counts['total'], 'solved': attempts.filter(is_correct=True).values('question').distinct().count(),
            'accuracy': round(counts['correct'] / counts['total'] * 100, 1) if counts['total'] else None,
            'today': attempts.filter(submitted_at__gte=start, submitted_at__lt=start + timedelta(days=1)).count(), 'streak': streak}

class PracticeSummary(APIView):
    permission_classes = [StudentOnly]

    def get(self, request):
        stats = practice_stats(request.user, timezone.now())
        subjects = class_scope(Subject.objects.all(), request.user, 'class_level').annotate(question_count=Count('bank_questions', filter=Q(bank_questions__is_active=True))).filter(question_count__gt=0)
        return Response({**stats, 'available': practice_questions(request.user).count(),
                         'subjects': [{'id': s.pk, 'name': s.name, 'class_level': s.get_class_level_display(), 'count': s.question_count} for s in subjects]})


class ContestSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    status = serializers.CharField(read_only=True)
    question_count = serializers.IntegerField(source='items.count', read_only=True)
    participant_count = serializers.IntegerField(source='entries.count', read_only=True)
    question_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), min_length=1, max_length=200, write_only=True, required=False)
    selected_question_ids = serializers.SerializerMethodField()
    duration_minutes = serializers.IntegerField(min_value=1, max_value=1440)

    class Meta:
        model = Contest
        fields = ['id', 'title', 'description', 'subject', 'subject_name', 'kind', 'starts_at', 'ends_at',
                  'duration_minutes', 'is_published', 'status', 'question_count', 'participant_count', 'question_ids', 'selected_question_ids']

    def get_selected_question_ids(self, obj):
        return list(obj.items.values_list('question_id', flat=True))

    def validate(self, attrs):
        instance = self.instance
        now = timezone.now()
        if instance and (instance.entries.exists() or instance.is_published and instance.starts_at <= now):
            raise ValidationError('A contest is locked after it starts or receives participants.')
        start = attrs.get('starts_at', instance.starts_at if instance else None)
        end = attrs.get('ends_at', instance.ends_at if instance else None)
        duration = attrs.get('duration_minutes', instance.duration_minutes if instance else 30)
        if not start or not end or end <= start or end <= now:
            raise ValidationError('Set a valid contest window ending in the future.')
        if duration * 60 > (end - start).total_seconds():
            raise ValidationError('The duration cannot exceed the contest window.')
        ids = attrs.get('question_ids')
        if ids is None and not instance:
            raise ValidationError({'question_ids': 'Select at least one question.'})
        subject = attrs.get('subject', instance.subject if instance else None)
        if ids is None and instance:
            ids = list(instance.items.values_list('question_id', flat=True))
        if len(set(ids)) != len(ids):
            raise ValidationError({'question_ids': 'Do not select the same question twice.'})
        questions = BankQuestion.objects.filter(pk__in=ids, subject=subject, is_active=True)
        if questions.count() != len(ids):
            raise ValidationError({'question_ids': 'Choose active questions from the selected subject.'})
        if instance and attrs.get('subject', instance.subject).pk != instance.subject_id and 'question_ids' not in attrs:
            raise ValidationError({'question_ids': 'Choose questions for the new subject.'})
        return attrs

    def save_items(self, contest, ids):
        questions = {q.pk: q for q in BankQuestion.objects.select_for_update().filter(pk__in=ids, subject=contest.subject, is_active=True)}
        if len(questions) != len(ids):
            raise ValidationError('Choose active questions from the selected subject.')
        ContestQuestion.objects.bulk_create([ContestQuestion(contest=contest, question=questions[pk], order=i, snapshot=questions[pk].snapshot()) for i, pk in enumerate(ids)])

    @transaction.atomic
    def create(self, data):
        ids = data.pop('question_ids')
        contest = Contest.objects.create(created_by=self.context['request'].user, **data)
        self.save_items(contest, ids)
        return contest

    @transaction.atomic
    def update(self, instance, data):
        instance = Contest.objects.select_for_update().get(pk=instance.pk)
        if instance.entries.exists() or instance.is_published and instance.starts_at <= timezone.now():
            raise ValidationError('A contest is locked after it starts or receives participants.')
        ids = data.pop('question_ids', None)
        instance = super().update(instance, data)
        if ids is not None:
            instance.items.all().delete()
            self.save_items(instance, ids)
        return instance


class AdminContests(generics.ListCreateAPIView):
    permission_classes = [DashboardAdmin]
    serializer_class = ContestSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'subject__name']
    queryset = Contest.objects.select_related('subject').prefetch_related('items')


class AdminContestDetail(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [DashboardAdmin]
    serializer_class = ContestSerializer
    queryset = Contest.objects.select_related('subject').prefetch_related('items')

    def perform_destroy(self, instance):
        if instance.entries.exists() or instance.is_published and instance.starts_at <= timezone.now():
            raise ValidationError('A started contest cannot be deleted.')
        instance.delete()


class PublicContestSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    status = serializers.CharField(read_only=True)
    question_count = serializers.IntegerField(source='items.count', read_only=True)
    participant_count = serializers.SerializerMethodField()

    def get_participant_count(self, obj):
        request = self.context.get('request')
        return class_scope(obj.entries.all(), request.user, 'user__class_level').count() if request else 0

    class Meta:
        model = Contest
        fields = ['id', 'title', 'description', 'subject', 'subject_name', 'kind', 'starts_at', 'ends_at', 'duration_minutes', 'status', 'question_count', 'participant_count']


class Contests(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PublicContestSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'subject__name']

    def get_queryset(self):
        qs = class_scope(Contest.objects.all(), self.request.user).filter(is_published=True).select_related('subject').prefetch_related('items')
        params = QuestionFilters(data={k: v for k, v in self.request.query_params.items() if k == 'subject' and v})
        params.is_valid(raise_exception=True)
        if 'subject' in params.validated_data:
            qs = qs.filter(subject_id=params.validated_data['subject'])
        return qs


def public_contest(pk, user):
    return get_object_or_404(class_scope(Contest.objects.all(), user).select_related('subject'), pk=pk, is_published=True)


def finish_entry(entry, now, force=False):
    if entry.submitted_at or not force and now < entry.deadline:
        return entry
    score = correct = total = 0
    for item in entry.contest.items.all():
        mark = MARKS[item.snapshot['difficulty']]
        good = entry.answers.get(str(item.pk)) == item.snapshot['correct_index']
        total += mark
        score += mark if good else 0
        correct += int(good)
    entry.score, entry.total_marks, entry.correct_answers = score, total, correct
    entry.submitted_at = min(now, entry.deadline)
    entry.elapsed_seconds = max(0, int((entry.submitted_at - entry.started_at).total_seconds()))
    entry.save(update_fields=['score', 'total_marks', 'correct_answers', 'submitted_at', 'elapsed_seconds'])
    return entry


def entry_payload(entry, now):
    ended = now >= entry.contest.ends_at
    result = {'id': entry.pk, 'started_at': entry.started_at, 'deadline': entry.deadline,
              'submitted': bool(entry.submitted_at), 'answers': entry.answers}
    if ended and entry.submitted_at:
        result.update(score=entry.score, total_marks=entry.total_marks, correct_answers=entry.correct_answers, elapsed_seconds=entry.elapsed_seconds)
    return result


class ContestDetail(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def get(self, request, pk):
        contest = public_contest(pk, request.user)
        now = timezone.now()
        entry = ContestEntry.objects.select_for_update().filter(contest=contest, user=request.user).first()
        if entry:
            finish_entry(entry, now)
        result = PublicContestSerializer(contest, context={'request': request}).data
        result['server_time'] = now
        result['entry'] = entry_payload(entry, now) if entry else None
        result['questions'] = []
        if entry and (not entry.submitted_at or now >= contest.ends_at):
            for item in contest.items.all():
                data = {'id': item.pk, 'question_text': item.snapshot['question_text'], 'options': item.snapshot['options'], 'difficulty': item.snapshot['difficulty']}
                if now >= contest.ends_at:
                    data.update(correct_index=item.snapshot['correct_index'], explanation=item.snapshot['explanation'])
                result['questions'].append(data)
        return Response(result)


class ContestStart(APIView):
    permission_classes = [StudentOnly]

    @transaction.atomic
    def post(self, request, pk):
        contest = get_object_or_404(class_scope(Contest.objects.all(), request.user).select_for_update(), pk=pk, is_published=True)
        now = timezone.now()
        if not contest.starts_at <= now < contest.ends_at:
            raise ValidationError('The contest is not live.')
        entry, _ = ContestEntry.objects.get_or_create(contest=contest, user=request.user, defaults={
            'started_at': now, 'deadline': min(now + timedelta(minutes=contest.duration_minutes), contest.ends_at)})
        finish_entry(entry, now)
        return Response({'entry': entry_payload(entry, now), 'server_time': now})


class ContestSave(APIView):
    permission_classes = [StudentOnly]

    @transaction.atomic
    def patch(self, request, pk):
        contest = public_contest(pk, request.user)
        entry = get_object_or_404(ContestEntry.objects.select_for_update(), contest=contest, user=request.user)
        now = timezone.now()
        if not entry.submitted_at and now < entry.deadline:
            answers = request.data.get('answers')
            if not isinstance(answers, dict):
                raise ValidationError({'answers': 'Send a map of question identifiers to option indexes.'})
            items = {str(item.pk): item for item in contest.items.all()}
            for key, value in answers.items():
                if key not in items or not isinstance(value, int) or isinstance(value, bool) or not 0 <= value < len(items[key].snapshot['options']):
                    raise ValidationError({'answers': 'An answer does not belong to this contest.'})
            entry.answers = answers
            entry.save(update_fields=['answers'])
        finish_entry(entry, now)
        return Response({'entry': entry_payload(entry, now), 'server_time': now})


class ContestSubmit(APIView):
    permission_classes = [StudentOnly]

    @transaction.atomic
    def post(self, request, pk):
        contest = public_contest(pk, request.user)
        entry = get_object_or_404(ContestEntry.objects.select_for_update(), contest=contest, user=request.user)
        finish_entry(entry, timezone.now(), force=True)
        return Response({'entry': entry_payload(entry, timezone.now()), 'server_time': timezone.now()})


def finalize_expired(contest=None, user=None):
    qs = ContestEntry.objects.filter(submitted_at__isnull=True, deadline__lte=timezone.now())
    if contest is not None:
        qs = qs.filter(contest=contest)
    if user is not None:
        qs = qs.filter(user=user)
    for pk in qs.values_list('pk', flat=True):
        with transaction.atomic():
            entry = ContestEntry.objects.select_for_update().select_related('contest').get(pk=pk)
            finish_entry(entry, timezone.now())


class Leaderboard(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        contest = public_contest(pk, request.user)
        if timezone.now() < contest.ends_at:
            raise PermissionDenied('Results and rankings are released after the contest ends.')
        finalize_expired(contest=contest)
        entries = class_scope(ContestEntry.objects.all(), request.user, 'user__class_level').filter(contest=contest, submitted_at__isnull=False).select_related('user').order_by('-score', 'elapsed_seconds', 'submitted_at', 'pk')
        from rest_framework.pagination import PageNumberPagination
        paginator = PageNumberPagination()
        page = paginator.paginate_queryset(entries, request)
        rows = []
        for entry in page:
            rank = entries.filter(Q(score__gt=entry.score) | Q(score=entry.score, elapsed_seconds__lt=entry.elapsed_seconds)).count() + 1
            rows.append({'rank': rank, 'name': entry.user.full_name or 'Student', 'score': entry.score,
                         'total_marks': entry.total_marks, 'elapsed_seconds': entry.elapsed_seconds, 'is_me': entry.user_id == request.user.pk})
        return paginator.get_paginated_response(rows)


class LearningProgress(APIView):
    permission_classes = [StudentOnly]

    def get(self, request):
        period = request.query_params.get('period', '7')
        if period not in ('7', '30', 'all'):
            raise ValidationError({'period': 'Choose 7, 30 or all.'})
        finalize_expired(user=request.user)
        now = timezone.now()
        entries = class_scope(ContestEntry.objects.all(), request.user, 'contest__subject__class_level').filter(user=request.user, submitted_at__isnull=False, contest__ends_at__lte=now,
                    contest__is_published=True).select_related('contest').order_by('contest__ends_at', 'contest_id')
        attempts = [{'submitted_at': e.contest.ends_at, 'score': e.score, 'total_marks': e.total_marks} for e in entries]
        data = build_progress(attempts, now, ZoneInfo('Asia/Dhaka'), period)
        data['rating_source'] = 'contests'
        data['practice'] = practice_stats(request.user, now)
        data['streak'] = data['practice']['streak']
        return Response(data)


urlpatterns = [
    path('practice/', PracticeList.as_view()),
    path('practice/summary/', PracticeSummary.as_view()),
    path('practice/<int:pk>/', PracticeDetail.as_view()),
    path('practice/<int:pk>/submit/', PracticeSubmit.as_view()),
    path('contests/', Contests.as_view()),
    path('contests/<int:pk>/', ContestDetail.as_view()),
    path('contests/<int:pk>/start/', ContestStart.as_view()),
    path('contests/<int:pk>/save/', ContestSave.as_view()),
    path('contests/<int:pk>/submit/', ContestSubmit.as_view()),
    path('contests/<int:pk>/leaderboard/', Leaderboard.as_view()),
    path('progress/', LearningProgress.as_view()),
    path('admin/questions/', AdminBankList.as_view()),
    path('admin/questions/import/', AdminBankImport.as_view()),
    path('admin/questions/from-quiz/', AdminLegacyImport.as_view()),
    path('admin/questions/<int:pk>/', AdminBankDetail.as_view()),
    path('admin/contests/', AdminContests.as_view()),
    path('admin/contests/<int:pk>/', AdminContestDetail.as_view()),
]
