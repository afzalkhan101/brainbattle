from django.contrib import admin
from .models import Quiz, Question, Answer, QuizAttempt


class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 2


class QuestionInline(admin.StackedInline):
    model = Question
    extra = 1
    show_change_link = True


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_by', 'is_published', 'created_at')
    list_filter = ('is_published',)
    search_fields = ('title',)
    inlines = [QuestionInline]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('question_text', 'quiz', 'order')
    list_filter = ('quiz',)
    inlines = [AnswerInline]


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ('user', 'quiz', 'score', 'correct_answers', 'total_questions', 'submitted_at')
    list_filter = ('quiz',)
    readonly_fields = ('score', 'correct_answers', 'total_questions', 'submitted_at')
