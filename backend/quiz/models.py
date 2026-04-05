from django.db import models
from django.conf import settings
from django.utils import timezone


# ─────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────

CLASS_LEVEL_CHOICES = [
    ('class_6',   'Class 6'),
    ('class_7',   'Class 7'),
    ('class_8',   'Class 8'),
    ('class_9',   'Class 9'),
    ('class_10',  'Class 10'),
    ('ssc',       'SSC'),
    ('hsc',       'HSC'),
    ('admission', 'Admission'),
]


# ─────────────────────────────────────────────
# Subject
# ─────────────────────────────────────────────

class Subject(models.Model):
    name        = models.CharField(max_length=100)
    class_level = models.CharField(max_length=20, choices=CLASS_LEVEL_CHOICES)
    slug        = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        unique_together = ('name', 'class_level')
        ordering        = ['class_level', 'name']
        verbose_name_plural = 'Subjects'

    def __str__(self):
        return f"{self.name} — {self.get_class_level_display()}"


# ─────────────────────────────────────────────
# Quiz
# ─────────────────────────────────────────────

class Quiz(models.Model):
    title            = models.CharField(max_length=255)
    description      = models.TextField(blank=True)
    subject          = models.ForeignKey(
        Subject,
        on_delete=models.SET_NULL,
        null=True,
        related_name='quizzes',
    )
    created_by       = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='quizzes',
    )
    is_published     = models.BooleanField(default=False)
    scheduled_at     = models.DateTimeField(
        null=True, blank=True,
        help_text="Quiz becomes accessible to students at this datetime. "
                  "Leave blank for immediate access when published."
    )
    duration_minutes = models.PositiveIntegerField(
        default=30,
        help_text="Allowed time for students to complete the quiz (minutes)."
    )
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        ordering            = ['-created_at']
        verbose_name_plural = 'Quizzes'

    def __str__(self):
        return self.title

    # ── Computed state ──────────────────────────────
    @property
    def is_live(self) -> bool:
        """True when published AND scheduled time has passed (or no schedule set)."""
        if not self.is_published:
            return False
        if self.scheduled_at is None:
            return True
        return timezone.now() >= self.scheduled_at

    @property
    def is_upcoming(self) -> bool:
        """Scheduled but not yet started."""
        return (
            self.is_published
            and self.scheduled_at is not None
            and timezone.now() < self.scheduled_at
        )

    @property
    def status_label(self) -> str:
        if not self.is_published:
            return 'draft'
        if self.is_upcoming:
            return 'upcoming'
        return 'live'


# ─────────────────────────────────────────────
# Question
# ─────────────────────────────────────────────

class Question(models.Model):
    DIFFICULTY_CHOICES = (
        ('simple', 'Simple'),
        ('mid',    'Medium'),
        ('hard',   'Hard'),
    )

    quiz          = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    order         = models.PositiveIntegerField(default=0)
    difficulty    = models.CharField(
        max_length=10,
        choices=DIFFICULTY_CHOICES,
        default='simple',
    )

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.question_text[:50]} ({self.difficulty})"


# ─────────────────────────────────────────────
# Answer
# ─────────────────────────────────────────────

class Answer(models.Model):
    question    = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')
    answer_text = models.TextField()
    is_correct  = models.BooleanField(default=False)

    def __str__(self):
        return self.answer_text[:80]


# ─────────────────────────────────────────────
# QuizAttempt
# ─────────────────────────────────────────────

class QuizAttempt(models.Model):
    quiz            = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    user            = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='quiz_attempts',
    )
    score           = models.FloatField(default=0.0)
    total_marks     = models.FloatField(default=0.0)
    total_questions = models.PositiveIntegerField(default=0)
    correct_answers = models.PositiveIntegerField(default=0)
    submitted_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f'{self.user} — {self.quiz} ({self.score}/{self.total_marks})'


# ─────────────────────────────────────────────
# AttemptAnswer
# ─────────────────────────────────────────────

class AttemptAnswer(models.Model):
    attempt         = models.ForeignKey(
        QuizAttempt, on_delete=models.CASCADE, related_name='attempt_answers'
    )
    question        = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name='attempt_answers'
    )
    selected_answer = models.ForeignKey(
        Answer,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='attempt_answers',
    )
    is_correct      = models.BooleanField(default=False)
    marks_obtained  = models.FloatField(default=0.0)
    marks_possible  = models.FloatField(default=0.0)

    class Meta:
        ordering        = ['question__order', 'question__id']
        unique_together = ('attempt', 'question')

    def __str__(self):
        state = 'correct' if self.is_correct else 'wrong'
        return f'{self.attempt} | Q{self.question.id} | {state} | {self.marks_obtained}/{self.marks_possible}'