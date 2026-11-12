from datetime import datetime, timedelta, timezone as dt_timezone
from unittest.mock import patch
from zoneinfo import ZoneInfo
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from .models import Quiz, QuizAttempt, Question, Answer
from .progress import build_progress

UTC = dt_timezone.utc
NOW = datetime(2026, 11, 12, 15, 0, tzinfo=UTC)
TZ = ZoneInfo('Asia/Dhaka')


class StudentProgressTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user('progress@example.com', 'test-password')
        self.other = get_user_model().objects.create_user('other@example.com', 'test-password')
        self.quiz = Quiz.objects.create(title='Progress quiz')
        self.client.force_authenticate(self.user)

    def attempt(self, date, score=8, total=10, user=None):
        item = QuizAttempt.objects.create(user=user or self.user, quiz=self.quiz, score=score, total_marks=total)
        QuizAttempt.objects.filter(pk=item.pk).update(submitted_at=date)
        return item

    def response(self, period='7'):
        with patch('quiz.progress.timezone.now', return_value=NOW):
            response = self.client.get(f'/api/quizzes/progress/?period={period}')
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    def test_new_student_has_honest_empty_state(self):
        data = self.response()
        self.assertEqual(data['rating'], 1000)
        self.assertEqual(data['level'], 'Newbie')
        self.assertEqual(data['completed'], 0)
        self.assertIsNone(data['today']['average_score'])
        self.assertIsNone(data['score_change'])
        self.assertEqual(data['streak'], 0)
        self.assertEqual(len(data['timeline']), 7)
        self.assertTrue(all(p['rating'] == 1000 for p in data['timeline']))

    def test_daily_average_delta_and_rating(self):
        self.attempt(NOW - timedelta(days=1), 6, 10)
        self.attempt(NOW - timedelta(days=1, hours=-1), 3, 5)
        self.attempt(NOW, 9, 10)
        self.attempt(NOW, 7, 10)
        data = self.response()
        self.assertEqual(data['yesterday']['average_score'], 60)
        self.assertEqual(data['today']['average_score'], 80)
        self.assertEqual(data['score_change'], 20)
        self.assertEqual(data['rating'], 1160)
        self.assertEqual(data['rating_change_today'], 120)
        self.assertEqual(data['streak'], 2)

    def test_dhaka_midnight_boundary_and_no_comparison_for_missing_day(self):
        self.attempt(datetime(2026, 11, 11, 17, 59, tzinfo=UTC), 10)
        self.attempt(datetime(2026, 11, 11, 18, 0, tzinfo=UTC), 8)
        data = self.response()
        self.assertEqual(data['today']['attempts'], 1)
        self.assertEqual(data['yesterday']['attempts'], 1)
        self.assertEqual(data['today']['date'], '2026-11-12')
        self.assertEqual(data['score_change'], -20)

    def test_range_preserves_prior_rating_and_inactive_days(self):
        self.attempt(NOW - timedelta(days=40), 10)
        self.attempt(NOW - timedelta(days=2), 8)
        data = self.response()
        self.assertEqual(data['timeline'][0]['rating'], 1100)
        self.assertEqual(data['timeline'][-1]['rating'], 1160)
        self.assertEqual(data['timeline'][-1]['attempts'], 0)
        self.assertIsNone(data['timeline'][-1]['average_score'])
        self.assertEqual(len(self.response('30')['timeline']), 30)
        all_time = self.response('all')
        self.assertEqual(all_time['timeline'][0]['rating'], 1000)
        self.assertEqual(all_time['timeline'][-1]['rating'], 1160)
        self.assertEqual(data['rating'], all_time['rating'])

    def test_rank_thresholds_and_progress(self):
        for total, level, next_level, remaining in [(2, 'Pupil', 'Specialist', 200), (4, 'Specialist', 'Expert', 200), (6, 'Expert', None, 0)]:
            with self.subTest(level=level):
                attempts = [{'submitted_at': NOW, 'score': 10, 'total_marks': 10} for _ in range(total)]
                data = build_progress(attempts, NOW, TZ, '7')
                self.assertEqual(data['level'], level)
                self.assertEqual(data['next_level'], next_level)
                self.assertEqual(data['points_to_next_level'], remaining)
                self.assertEqual(data['level_progress'], 100 if level == 'Expert' else 0)

    def test_rating_floor_invalid_marks_and_future_attempts(self):
        attempts = [{'submitted_at': NOW, 'score': 0, 'total_marks': 10} for _ in range(15)]
        attempts += [{'submitted_at': NOW, 'score': 0, 'total_marks': 0}, {'submitted_at': NOW + timedelta(days=1), 'score': 10, 'total_marks': 10}]
        data = build_progress(attempts, NOW, TZ, '7')
        self.assertEqual(data['rating'], 0)
        self.assertEqual(data['completed'], 16)
        self.assertEqual(data['today']['average_score'], 0)

    def test_streak_survives_until_end_of_today_and_breaks_after_gap(self):
        self.attempt(NOW - timedelta(days=1))
        self.attempt(NOW - timedelta(days=2))
        self.attempt(NOW - timedelta(days=4))
        self.assertEqual(self.response()['streak'], 2)
        QuizAttempt.objects.filter(user=self.user, submitted_at__gte=NOW - timedelta(days=1)).delete()
        self.assertEqual(self.response()['streak'], 0)

    def test_api_is_authenticated_and_cannot_read_another_student(self):
        self.attempt(NOW, 10, user=self.other)
        self.assertEqual(self.response()['completed'], 0)
        response = self.client.get(f'/api/quizzes/progress/?user={self.other.pk}')
        self.assertEqual(response.data['completed'], 0)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/quizzes/progress/').status_code, 401)

    def test_bad_filters_return_validation_errors(self):
        for query in ['period=365', 'timezone=Not/AZone', 'timezone=../etc/passwd']:
            self.assertEqual(self.client.get(f'/api/quizzes/progress/?{query}').status_code, 400)

    def test_more_than_one_page_of_attempts_is_included(self):
        for _ in range(25):
            self.attempt(NOW, 5)
        data = self.response()
        self.assertEqual(data['completed'], 25)
        self.assertEqual(data['today']['attempts'], 25)
        self.assertEqual(data['rating'], 1000)

    def test_daily_score_is_mean_quiz_percentage_not_weighted_marks(self):
        self.attempt(NOW, 10, 10)
        self.attempt(NOW, 0, 1)
        data = self.response()
        self.assertEqual(data['today']['average_score'], 50)
        self.assertEqual(data['rating'], 1000)

    def test_submitting_a_quiz_updates_progress_without_a_separate_write(self):
        self.quiz.is_published = True
        self.quiz.save()
        question = Question.objects.create(quiz=self.quiz, question_text='2 + 2?')
        answer = Answer.objects.create(question=question, answer_text='4', is_correct=True)
        Answer.objects.create(question=question, answer_text='5', is_correct=False)
        self.assertEqual(self.client.get('/api/quizzes/progress/').data['completed'], 0)
        response = self.client.post(f'/api/quizzes/{self.quiz.pk}/submit/',
                                   {'answers': [{'question_id': question.pk, 'answer_id': answer.pk}]}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        data = self.client.get('/api/quizzes/progress/').data
        self.assertEqual(data['completed'], 1)
        self.assertEqual(data['rating'], 1100)
