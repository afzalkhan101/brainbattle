from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from .models import Answer, Quiz, QuizAttempt, Subject


class AdminDashboardTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.admin = User.objects.create_user('admin@example.com', 'test-password', role='admin')
        cls.student = User.objects.create_user('student@example.com', 'test-password', first_name='Arif', role='student', class_level='hsc')
        cls.subject = Subject.objects.create(name='Physics', slug='hsc-physics', class_level='hsc')

    def setUp(self):
        self.client.force_authenticate(self.admin)

    def payload(self):
        return dict(title='Motion', subject=self.subject.pk, duration_minutes=30, is_published=True,
                    questions=[dict(question_text='What is speed?', difficulty='simple', answers=[
                        dict(answer_text='Distance / time', is_correct=True),
                        dict(answer_text='Time / distance', is_correct=False)])])

    def create_quiz(self):
        response = self.client.post('/api/admin/quizzes/', self.payload(), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return response.data['id']

    def test_admin_without_staff_can_manage_complete_quiz(self):
        pk = self.create_quiz()
        quiz = Quiz.objects.get(pk=pk)
        self.assertEqual(quiz.created_by, self.admin)
        self.assertEqual(quiz.questions.count(), 1)
        self.assertEqual(Answer.objects.filter(question__quiz=quiz, is_correct=True).count(), 1)
        response = self.client.patch(f'/api/admin/quizzes/{pk}/', {'title': 'Updated motion'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['title'], 'Updated motion')
        self.assertEqual(self.client.delete(f'/api/admin/quizzes/{pk}/').status_code, 204)
        self.assertFalse(Quiz.objects.filter(pk=pk).exists())

    def test_students_and_anonymous_cannot_access_admin_endpoints(self):
        pk = self.create_quiz()
        for user, expected in [(self.student, 403), (None, 401)]:
            self.client.force_authenticate(user)
            for resource in ['overview', 'students', 'results', 'subjects', 'quizzes']:
                self.assertEqual(self.client.get(f'/api/admin/{resource}/').status_code, expected)
            self.assertEqual(self.client.post('/api/admin/quizzes/', self.payload(), format='json').status_code, expected)
            self.assertEqual(self.client.patch(f'/api/admin/quizzes/{pk}/', {'title': 'Denied'}, format='json').status_code, expected)
            self.assertEqual(self.client.delete(f'/api/admin/quizzes/{pk}/').status_code, expected)

    def test_superuser_with_other_role_has_access(self):
        user = get_user_model().objects.create_superuser('super@example.com', 'test-password', role='student')
        self.client.force_authenticate(user)
        self.assertEqual(self.client.get('/api/admin/overview/').status_code, 200)

    def test_invalid_answers_do_not_create_partial_quiz(self):
        payload = self.payload()
        payload['questions'][0]['answers'][1]['is_correct'] = True
        response = self.client.post('/api/admin/quizzes/', payload, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Quiz.objects.count(), 0)

    def test_publish_requires_questions_and_positive_duration(self):
        for values in [{'questions': []}, {'duration_minutes': 0}]:
            self.assertEqual(self.client.post('/api/admin/quizzes/', {**self.payload(), **values}, format='json').status_code, 400)

    def test_replace_questions_before_attempts(self):
        pk = self.create_quiz()
        questions = self.payload()['questions']
        questions[0]['question_text'] = 'Updated question'
        response = self.client.patch(f'/api/admin/quizzes/{pk}/', {'questions': questions}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Quiz.objects.get(pk=pk).questions.get().question_text, 'Updated question')

    def test_partial_nested_questions_are_rejected_without_data_loss(self):
        pk = self.create_quiz()
        for questions in [[{'question_text': 'Missing answers'}],
                          [{'question_text': 'Missing answer text', 'answers': [
                              {'is_correct': True}, {'answer_text': 'Other', 'is_correct': False}]}]]:
            response = self.client.patch(f'/api/admin/quizzes/{pk}/', {'questions': questions}, format='json')
            self.assertEqual(response.status_code, 400)
            self.assertEqual(Quiz.objects.get(pk=pk).questions.get().question_text, 'What is speed?')

    def test_attempts_lock_questions_but_allow_metadata_update(self):
        pk = self.create_quiz()
        QuizAttempt.objects.create(quiz_id=pk, user=self.student, score=1, total_marks=1)
        response = self.client.patch(f'/api/admin/quizzes/{pk}/', {'questions': []}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Quiz.objects.get(pk=pk).questions.count(), 1)
        response = self.client.patch(f'/api/admin/quizzes/{pk}/', {'description': 'Updated'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['has_attempts'])

    def test_students_search_filter_and_results_overview(self):
        pk = self.create_quiz()
        QuizAttempt.objects.create(quiz_id=pk, user=self.student, score=1, total_marks=1)
        data = self.client.get('/api/admin/students/?search=Arif&class_level=hsc').data
        self.assertEqual(data['count'], 1)
        self.assertEqual(data['results'][0]['attempts_count'], 1)
        self.assertNotIn('password', data['results'][0])
        self.assertEqual(self.client.get('/api/admin/students/?class_level=ssc').data['count'], 0)
        self.assertEqual(self.client.get('/api/admin/results/?search=Motion').data['count'], 1)
        stats = self.client.get('/api/admin/overview/').data
        self.assertEqual([stats[k] for k in ['students', 'quizzes', 'published', 'attempts']], [1, 1, 1, 1])
        self.assertTrue(stats['activity'])

    def test_drafts_hidden_from_students_and_answers_never_leak(self):
        pk = self.create_quiz()
        self.client.force_authenticate(self.student)
        detail = self.client.get(f'/api/quizzes/{pk}/').data
        self.assertNotIn('is_correct', detail['questions'][0]['answers'][0])
        self.client.force_authenticate(self.admin)
        self.client.patch(f'/api/admin/quizzes/{pk}/', {'is_published': False}, format='json')
        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.get(f'/api/quizzes/{pk}/').status_code, 404)

    def test_subject_creation_and_filters(self):
        response = self.client.post('/api/admin/subjects/', dict(name='English', slug='hsc-english', class_level='hsc'), format='json')
        self.assertEqual(response.status_code, 201)
        self.create_quiz()
        self.assertEqual(self.client.get('/api/admin/quizzes/?status=live').data['count'], 1)
        self.assertEqual(self.client.get('/api/admin/quizzes/?status=draft').data['count'], 0)

    def test_registration_cannot_grant_admin_role(self):
        self.client.force_authenticate(None)
        response = self.client.post('/api/auth/register/', dict(email='escalate@example.com', first_name='Test', last_name='User', role='admin', password='test-password', password_confirm='test-password'), format='json')
        self.assertEqual(response.status_code, 400)
