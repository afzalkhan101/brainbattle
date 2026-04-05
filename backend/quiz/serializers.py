from rest_framework import serializers
from django.utils import timezone
from .models import Subject, Quiz, Question, Answer, QuizAttempt, AttemptAnswer


# ─────────────────────────────────────────────
# Subject
# ─────────────────────────────────────────────

class SubjectSerializer(serializers.ModelSerializer):
    class_level_display = serializers.CharField(
        source='get_class_level_display', read_only=True
    )

    class Meta:
        model  = Subject
        fields = ['id', 'name', 'class_level', 'class_level_display', 'slug', 'description']


# ─────────────────────────────────────────────
# Answer
# ─────────────────────────────────────────────

class AnswerSerializer(serializers.ModelSerializer):
    """Student-facing: never exposes is_correct."""
    class Meta:
        model  = Answer
        fields = ['id', 'answer_text']


class AnswerAdminSerializer(serializers.ModelSerializer):
    """Teacher/admin-facing: shows is_correct."""
    class Meta:
        model  = Answer
        fields = ['id', 'answer_text', 'is_correct']


# ─────────────────────────────────────────────
# Question
# ─────────────────────────────────────────────

class QuestionSerializer(serializers.ModelSerializer):
    """Student-facing — hides correct answers."""
    answers = AnswerSerializer(many=True, read_only=True)

    class Meta:
        model  = Question
        fields = ['id', 'question_text', 'difficulty', 'order', 'answers']


class QuestionAdminSerializer(serializers.ModelSerializer):
    """Teacher/admin-facing — shows correct flags."""
    answers = AnswerAdminSerializer(many=True, read_only=True)

    class Meta:
        model  = Question
        fields = ['id', 'question_text', 'difficulty', 'order', 'answers']


# ─────────────────────────────────────────────
# Quiz — List
# ─────────────────────────────────────────────

class QuizListSerializer(serializers.ModelSerializer):
    subject             = SubjectSerializer(read_only=True)
    created_by_name     = serializers.SerializerMethodField()
    question_count      = serializers.SerializerMethodField()
    status_label        = serializers.CharField(read_only=True)
    seconds_until_start = serializers.SerializerMethodField()

    class Meta:
        model  = Quiz
        fields = [
            'id', 'title', 'description',
            'subject', 'is_published', 'scheduled_at', 'duration_minutes',
            'status_label', 'seconds_until_start',
            'created_by_name', 'question_count', 'created_at',
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return None
        return (
            getattr(obj.created_by, 'full_name', None)
            or obj.created_by.get_full_name()
            or obj.created_by.username
        )

    def get_question_count(self, obj):
        return getattr(obj, 'question_count', obj.questions.count())

    def get_seconds_until_start(self, obj) -> int | None:
        if obj.scheduled_at and obj.scheduled_at > timezone.now():
            return int((obj.scheduled_at - timezone.now()).total_seconds())
        return None


# ─────────────────────────────────────────────
# Quiz — Detail (student)
# ─────────────────────────────────────────────

class QuizDetailSerializer(serializers.ModelSerializer):
    subject         = SubjectSerializer(read_only=True)
    questions       = QuestionSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    status_label    = serializers.CharField(read_only=True)

    class Meta:
        model  = Quiz
        fields = [
            'id', 'title', 'description',
            'subject', 'is_published', 'scheduled_at', 'duration_minutes',
            'status_label', 'created_by_name',
            'questions', 'created_at', 'updated_at',
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return None
        return (
            getattr(obj.created_by, 'full_name', None)
            or obj.created_by.get_full_name()
            or obj.created_by.username
        )


# ─────────────────────────────────────────────
# Quiz — Create / Update
# ─────────────────────────────────────────────

class QuizCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Quiz
        fields = [
            'id', 'title', 'description',
            'subject', 'is_published', 'scheduled_at', 'duration_minutes',
        ]

    def validate(self, data):
        scheduled_at = data.get('scheduled_at')
        if scheduled_at and self.instance is None:
            if scheduled_at <= timezone.now():
                raise serializers.ValidationError(
                    {'scheduled_at': 'Scheduled time must be in the future.'}
                )
        return data

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


# ─────────────────────────────────────────────
# Submit
# ─────────────────────────────────────────────

class SubmitAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    answer_id   = serializers.IntegerField(allow_null=True, required=False)


class QuizSubmitSerializer(serializers.Serializer):
    answers = SubmitAnswerSerializer(many=True)

    def validate_answers(self, value):
        if not value:
            raise serializers.ValidationError('At least one answer is required.')
        return value


# ─────────────────────────────────────────────
# Attempt — List
# ─────────────────────────────────────────────

class QuizAttemptSerializer(serializers.ModelSerializer):
    quiz_title  = serializers.CharField(source='quiz.title', read_only=True)
    user_email  = serializers.EmailField(source='user.email', read_only=True)
    subject     = SubjectSerializer(source='quiz.subject', read_only=True)
    percentage  = serializers.SerializerMethodField()
    total_submitted = serializers.SerializerMethodField()

    class Meta:
        model  = QuizAttempt
        fields = [
            'id', 'quiz', 'quiz_title', 'subject', 'user_email',
            'score', 'total_marks', 'total_questions', 'correct_answers',
            'percentage', 'total_submitted', 'submitted_at',
        ]

    def get_percentage(self, obj) -> float:
        if obj.total_marks:
            return round((obj.score / obj.total_marks) * 100, 2)
        return 0.0

    def get_total_submitted(self, obj):
        return obj.attempt_answers.count()


# ─────────────────────────────────────────────
# Attempt — Detail (per-question breakdown)
# ─────────────────────────────────────────────

class AttemptAnswerSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.question_text')
    difficulty    = serializers.CharField(source='question.difficulty')
    selected_text = serializers.SerializerMethodField()
    correct_text  = serializers.SerializerMethodField()

    class Meta:
        model  = AttemptAnswer
        fields = [
            'id', 'question_text', 'difficulty',
            'selected_text', 'correct_text',
            'is_correct', 'marks_obtained', 'marks_possible',
        ]

    def get_selected_text(self, obj):
        return obj.selected_answer.answer_text if obj.selected_answer else 'Skipped'

    def get_correct_text(self, obj):
        correct = obj.question.answers.filter(is_correct=True).first()
        return correct.answer_text if correct else ''


class QuizAttemptDetailSerializer(serializers.ModelSerializer):
    quiz_title      = serializers.CharField(source='quiz.title', read_only=True)
    subject         = SubjectSerializer(source='quiz.subject', read_only=True)
    attempt_answers = AttemptAnswerSerializer(many=True, read_only=True)
    percentage      = serializers.SerializerMethodField()

    class Meta:
        model  = QuizAttempt
        fields = [
            'id', 'quiz_title', 'subject',
            'score', 'total_marks', 'total_questions', 'correct_answers',
            'percentage', 'submitted_at', 'attempt_answers',
        ]

    def get_percentage(self, obj) -> float:
        if obj.total_marks:
            return round((obj.score / obj.total_marks) * 100, 2)
        return 0.0