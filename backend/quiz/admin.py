from django.contrib import admin
from .models import Subject, Quiz, Question, Answer, QuizAttempt, AttemptAnswer


# ─────────────────────────────────────────────
# Inline Models
# ─────────────────────────────────────────────

class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 2


class QuestionInline(admin.StackedInline):
    model = Question
    extra = 1
    show_change_link = True


class AttemptAnswerInline(admin.TabularInline):
    model = AttemptAnswer
    extra = 0
    readonly_fields = ('is_correct', 'marks_obtained', 'marks_possible')


# ─────────────────────────────────────────────
# Subject Admin
# ─────────────────────────────────────────────

@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'class_level', 'slug')
    list_filter = ('class_level',)
    search_fields = ('name',)
    prepopulated_fields = {"slug": ("name",)}


# ─────────────────────────────────────────────
# Quiz Admin
# ─────────────────────────────────────────────

@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('title', 'subject', 'created_by', 'is_published', 'created_at')
    list_filter = ('is_published', 'subject')
    search_fields = ('title',)
    inlines = [QuestionInline]


# ─────────────────────────────────────────────
# Question Admin
# ─────────────────────────────────────────────

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('question_text', 'quiz', 'order', 'difficulty')
    list_filter = ('quiz', 'difficulty')
    inlines = [AnswerInline]


# ─────────────────────────────────────────────
# Answer Admin
# ─────────────────────────────────────────────

@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ('answer_text', 'question', 'is_correct')
    list_filter = ('is_correct',)
    search_fields = ('answer_text',)


# ─────────────────────────────────────────────
# Quiz Attempt Admin
# ─────────────────────────────────────────────

@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'quiz', 'score',
        'correct_answers', 'total_questions',
        'submitted_at'
    )
    list_filter = ('quiz',)
    readonly_fields = (
        'score', 'correct_answers',
        'total_questions', 'submitted_at'
    )
    inlines = [AttemptAnswerInline]


# ─────────────────────────────────────────────
# Attempt Answer Admin
# ─────────────────────────────────────────────

@admin.register(AttemptAnswer)
class AttemptAnswerAdmin(admin.ModelAdmin):
    list_display = (
        'attempt', 'question', 'selected_answer',
        'is_correct', 'marks_obtained', 'marks_possible'
    )
    list_filter = ('is_correct',)