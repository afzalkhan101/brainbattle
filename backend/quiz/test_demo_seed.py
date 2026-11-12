from io import StringIO
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from quiz.models import Subject, Quiz, Question, QuizAttempt
from users.models import WalletTransaction


class DemoSeedTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_superuser('existing-admin@example.com', 'existing-password')
        self.student = User.objects.create_user('existing-student@example.com', 'original-password', first_name='Existing')
        self.quiz = Quiz.objects.create(title='Existing quiz', created_by=self.admin)

    def test_seed_is_repeatable_and_preserves_existing_data(self):
        call_command('seed_demo', stdout=StringIO())
        counts = [model.objects.count() for model in [get_user_model(), Subject, Quiz, Question, QuizAttempt, WalletTransaction]]
        self.assertEqual(counts[:5], [26, 6, 9, 40, 36])
        demo = get_user_model().objects.get(email='student01@demo.brainbattle.test')
        self.assertTrue(demo.check_password('DemoStudent!2026'))
        self.assertEqual(demo.quiz_attempts.count(), 0)
        # Reruns also preserve subsequent demo-account edits/password changes.
        demo.set_password('updated-password')
        demo.first_name = 'Edited'
        demo.save()
        call_command('seed_demo', stdout=StringIO())
        self.assertEqual(counts, [model.objects.count() for model in [get_user_model(), Subject, Quiz, Question, QuizAttempt, WalletTransaction]])
        demo.refresh_from_db()
        self.assertTrue(demo.check_password('updated-password'))
        self.assertEqual(demo.first_name, 'Edited')
        self.student.refresh_from_db()
        self.assertTrue(self.student.check_password('original-password'))
        self.assertEqual(self.student.first_name, 'Existing')
        self.quiz.refresh_from_db()
        self.assertEqual(self.quiz.title, 'Existing quiz')

    def test_seeded_statuses_and_result_totals_are_consistent(self):
        call_command('seed_demo', stdout=StringIO())
        quizzes = Quiz.objects.filter(title__startswith='[Demo]')
        self.assertEqual(sum(q.is_live for q in quizzes), 6)
        self.assertEqual(sum(q.is_upcoming for q in quizzes), 1)
        self.assertEqual(quizzes.filter(is_published=False).count(), 1)
        for quiz in quizzes:
            for question in quiz.questions.all():
                self.assertEqual(question.answers.count(), 4)
                self.assertEqual(question.answers.filter(is_correct=True).count(), 1)
        for attempt in QuizAttempt.objects.all():
            answers = list(attempt.attempt_answers.all())
            self.assertEqual(attempt.total_questions, len(answers))
            self.assertEqual(attempt.score, sum(a.marks_obtained for a in answers))
            self.assertEqual(attempt.total_marks, sum(a.marks_possible for a in answers))
            self.assertEqual(attempt.correct_answers, sum(a.is_correct for a in answers))
