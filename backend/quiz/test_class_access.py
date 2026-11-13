import uuid
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase
from .models import (Subject, Quiz, Question, Answer, QuizAttempt, BankQuestion,
                     PracticeAttempt, Contest, ContestEntry, ContestQuestion)


class EnrolledClassAccessTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.student = User.objects.create_user('ssc@example.com', role='student', class_level='ssc')
        self.other = User.objects.create_user('hsc@example.com', role='student', class_level='hsc')
        self.missing = User.objects.create_user('missing@example.com', role='student')
        self.admin = User.objects.create_user('admin@example.com', role='admin')
        self.subjects = {}
        self.quizzes = {}
        self.bank = {}
        self.attempts = {}
        self.contests = {}
        now = timezone.now()
        for level in ['ssc', 'hsc']:
            subject = Subject.objects.create(name=f'{level} subject', class_level=level, slug=level)
            quiz = Quiz.objects.create(title=f'{level} quiz', subject=subject, is_published=True)
            question = Question.objects.create(quiz=quiz, question_text=f'{level} question')
            Answer.objects.create(question=question, answer_text='Correct', is_correct=True)
            Answer.objects.create(question=question, answer_text='Wrong')
            bank = BankQuestion.objects.create(subject=subject, question_text=f'{level} bank question', options=['Correct', 'Wrong'], correct_index=0, explanation=f'{level} explanation')
            attempt = QuizAttempt.objects.create(user=self.student, quiz=quiz, score=1, total_marks=1)
            PracticeAttempt.objects.create(user=self.student, question=bank, request_id=uuid.uuid4(), selected_index=0,
                                           is_correct=True, question_snapshot=bank.snapshot())
            contest = Contest.objects.create(title=f'{level} contest', subject=subject, starts_at=now-timedelta(hours=2), ends_at=now-timedelta(hours=1), is_published=True)
            ContestQuestion.objects.create(contest=contest, question=bank, order=0, snapshot=bank.snapshot())
            ContestEntry.objects.create(contest=contest, user=self.student, started_at=now-timedelta(hours=2), deadline=now-timedelta(hours=1), submitted_at=now-timedelta(hours=1), score=1, total_marks=1)
            self.subjects[level], self.quizzes[level], self.bank[level], self.attempts[level], self.contests[level] = subject, quiz, bank, attempt, contest
        self.unassigned = Quiz.objects.create(title='No subject', is_published=True)
        self.client.force_authenticate(self.student)

    def test_all_catalogs_and_filters_are_intersected_with_enrolled_class(self):
        for path in ['/api/quizzes/', '/api/quizzes/subjects/', '/api/learning/practice/', '/api/learning/contests/']:
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data['count'], 1, path)
            self.assertNotIn('hsc', str(response.data))
            self.assertEqual(self.client.get(path, {'class_level': 'hsc', 'subject': self.subjects['hsc'].pk}).data['count'], 0)
        summary = self.client.get('/api/learning/practice/summary/').data
        self.assertEqual([s['id'] for s in summary['subjects']], [self.subjects['ssc'].pk])
        self.assertEqual(summary['available'], 1)

    def test_direct_foreign_ids_are_hidden_for_reads_and_writes(self):
        foreign = self.contests['hsc'].pk
        paths = ['/api/quizzes/subjects/%s/' % self.subjects['hsc'].pk,
                 '/api/quizzes/%s/' % self.quizzes['hsc'].pk,
                 '/api/quizzes/%s/' % self.unassigned.pk,
                 '/api/learning/practice/%s/' % self.bank['hsc'].pk,
                 f'/api/learning/contests/{foreign}/', f'/api/learning/contests/{foreign}/leaderboard/']
        for path in paths:
            self.assertEqual(self.client.get(path).status_code, 404, path)
        for path, data in [(f'/api/quizzes/{self.quizzes["hsc"].pk}/submit/', {'answers': []}),
                           (f'/api/learning/contests/{foreign}/start/', {}),
                           (f'/api/learning/contests/{foreign}/submit/', {})]:
            self.assertEqual(self.client.post(path, data, format='json').status_code, 404, path)
        self.assertEqual(self.client.patch(f'/api/learning/contests/{foreign}/save/', {'answers': {}}, format='json').status_code, 404)

    def test_idempotent_practice_replay_does_not_bypass_class_access(self):
        old = PracticeAttempt.objects.get(user=self.student, question=self.bank['hsc'])
        response = self.client.post(f'/api/learning/practice/{self.bank["hsc"].pk}/submit/',
                                    {'request_id': str(old.request_id), 'selected_index': old.selected_index}, format='json')
        self.assertEqual(response.status_code, 404)
        self.assertNotIn('explanation', response.data)

    def test_history_and_progress_do_not_include_former_class_data(self):
        attempts = self.client.get('/api/quizzes/my-attempts/').data
        self.assertEqual(attempts['count'], 1)
        self.assertEqual(self.client.get(f'/api/quizzes/attempts/{self.attempts["hsc"].pk}/').status_code, 404)
        self.assertEqual(self.client.get('/api/quizzes/progress/').data['completed'], 1)
        progress = self.client.get('/api/learning/progress/').data
        self.assertEqual(progress['completed'], 1)
        self.assertEqual(progress['rating'], 1100)
        self.assertEqual(progress['practice']['attempts'], 1)
        self.assertEqual(progress['practice']['solved'], 1)

    def test_missing_class_and_anonymous_requests_fail_closed(self):
        self.client.force_authenticate(self.missing)
        for path in ['/api/quizzes/', '/api/quizzes/subjects/', '/api/learning/practice/', '/api/learning/contests/']:
            self.assertEqual(self.client.get(path).data['count'], 0)
        self.assertEqual(self.client.get('/api/learning/progress/').data['completed'], 0)
        self.assertEqual(self.client.get('/api/learning/practice/summary/').data['subjects'], [])
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/quizzes/').data['count'], 0)
        self.assertEqual(self.client.get('/api/quizzes/subjects/').data['count'], 0)
        self.assertEqual(self.client.get(f'/api/quizzes/{self.quizzes["ssc"].pk}/').status_code, 404)

    def test_student_cannot_change_or_clear_class_after_enrollment(self):
        for value in ['hsc', '', None]:
            response = self.client.patch('/api/auth/profile/update/', {'class_level': value}, format='json')
            self.assertEqual(response.status_code, 400)
        self.assertEqual(self.client.patch('/api/auth/profile/update/', {'class_level': 'ssc'}, format='json').status_code, 200)
        self.client.force_authenticate(self.missing)
        self.assertEqual(self.client.patch('/api/auth/profile/update/', {'class_level': 'ssc'}, format='json').status_code, 200)
        self.assertEqual(self.client.patch('/api/auth/profile/update/', {'class_level': 'hsc'}, format='json').status_code, 400)

    def test_registration_requires_and_saves_student_class(self):
        self.client.force_authenticate(None)
        payload = dict(email='new@example.com', first_name='New', last_name='Student', role='student', password='Enrollment!2026', password_confirm='Enrollment!2026')
        self.assertEqual(self.client.post('/api/auth/register/', payload, format='json').status_code, 400)
        self.assertEqual(self.client.post('/api/auth/register/', {**payload, 'class_level': 'ssc'}, format='json').status_code, 201)
        self.assertEqual(get_user_model().objects.get(email='new@example.com').class_level, 'ssc')

    def test_admin_retains_all_classes_and_can_reassign_enrollment(self):
        path = f'/api/admin/students/{self.student.pk}/class/'
        self.assertEqual(self.client.patch(path, {'class_level': 'hsc'}, format='json').status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get('/api/quizzes/subjects/').data['count'], 2)
        self.assertEqual(self.client.get('/api/learning/admin/questions/').data['count'], 2)
        self.assertEqual(self.client.get('/api/learning/admin/contests/').data['count'], 2)
        self.assertEqual(self.client.patch(path, {'class_level': 'hsc'}, format='json').status_code, 200)
        self.student.refresh_from_db()
        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.get('/api/quizzes/').data['results'][0]['id'], self.quizzes['hsc'].pk)
        self.assertEqual(self.client.get(f'/api/quizzes/{self.quizzes["ssc"].pk}/').status_code, 404)
        self.assertTrue(QuizAttempt.objects.filter(pk=self.attempts['ssc'].pk).exists())

    def test_staff_flag_does_not_expand_an_ordinary_students_class(self):
        self.student.is_staff = True
        self.student.save(update_fields=['is_staff'])
        self.assertEqual(self.client.get('/api/quizzes/subjects/').data['count'], 1)
        self.assertEqual(self.client.post('/api/quizzes/', {}, format='json').status_code, 403)
        self.assertEqual(self.client.delete(f'/api/quizzes/{self.quizzes["ssc"].pk}/').status_code, 403)

    def test_other_class_participants_are_excluded_from_student_leaderboards(self):
        contest = self.contests['ssc']
        entry = contest.entries.get(user=self.student)
        ContestEntry.objects.create(contest=contest, user=self.other, started_at=entry.started_at, deadline=entry.deadline,
                                    submitted_at=entry.submitted_at, score=1, total_marks=1)
        detail = self.client.get(f'/api/learning/contests/{contest.pk}/').data
        self.assertEqual(detail['participant_count'], 1)
        result = self.client.get(f'/api/learning/contests/{contest.pk}/leaderboard/').data
        self.assertEqual(result['count'], 1)

    def test_foreign_answer_ids_cannot_be_attached_to_own_class_attempts(self):
        quiz = Quiz.objects.create(title='Fresh own quiz', subject=self.subjects['ssc'], is_published=True)
        question = Question.objects.create(quiz=quiz, question_text='Own question')
        Answer.objects.create(question=question, answer_text='Own answer', is_correct=True)
        Answer.objects.create(question=question, answer_text='Other own answer')
        foreign_question = self.quizzes['hsc'].questions.get()
        foreign_answer = foreign_question.answers.first()
        response = self.client.post(f'/api/quizzes/{quiz.pk}/submit/',
                                    {'answers': [{'question_id': question.pk, 'answer_id': foreign_answer.pk}]}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(quiz.attempts.exists())
        response = self.client.post(f'/api/quizzes/{quiz.pk}/submit/',
                                    {'answers': [{'question_id': foreign_question.pk, 'answer_id': foreign_answer.pk}]}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(quiz.attempts.exists())

    def test_legacy_foreign_selected_answer_text_is_redacted(self):
        from .models import AttemptAnswer
        from .serializers import AttemptAnswerSerializer
        question = self.quizzes['ssc'].questions.get()
        foreign = self.quizzes['hsc'].questions.get().answers.first()
        item = AttemptAnswer.objects.create(attempt=self.attempts['ssc'], question=question, selected_answer=foreign)
        self.assertEqual(AttemptAnswerSerializer(item).data['selected_text'], 'Skipped')
