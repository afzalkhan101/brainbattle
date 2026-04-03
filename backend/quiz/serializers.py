from rest_framework import serializers
from .models import Quiz, Question, Answer, QuizAttempt


class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ['id', 'answer_text', 'is_correct']


class AnswerPublicSerializer(serializers.ModelSerializer):
    """Hides is_correct for students taking a quiz."""
    class Meta:
        model = Answer
        fields = ['id', 'answer_text']


class QuestionSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'question_text', 'difficulty','order', 'answers']


class QuestionPublicSerializer(serializers.ModelSerializer):
    """Hides correct answer flags for quiz-taking."""
    answers = AnswerPublicSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'question_text', 'order', 'answers']


class QuizListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list view — no nested questions."""
    created_by_name = serializers.SerializerMethodField()
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description', 'is_published',
            'created_by_name', 'question_count', 'created_at',
        ]

    def get_created_by_name(self, obj):
        return obj.created_by.full_name if obj.created_by else None

    def get_question_count(self, obj):
        # Relies on annotated value if available, else fallback
        return getattr(obj, 'question_count', obj.questions.count())


class QuizDetailSerializer(serializers.ModelSerializer):
    """Full serializer with questions for admin/teacher."""
    questions = QuestionSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description', 'is_published',
            'created_by_name', 'questions', 'created_at', 'updated_at',
        ]

    def get_created_by_name(self, obj):
        return obj.created_by.full_name if obj.created_by else None


class QuizCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'is_published']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


# --- Submit Attempt ---

class SubmitAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    answer_id = serializers.IntegerField()


class QuizSubmitSerializer(serializers.Serializer):
    answers = SubmitAnswerSerializer(many=True)

    def validate_answers(self, value):
        if not value:
            raise serializers.ValidationError('At least one answer is required.')
        return value


class QuizAttemptSerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'quiz_title', 'user_email',
            'score', 'total_questions', 'correct_answers', 'submitted_at',
        ]
