import uuid
from datetime import datetime, timedelta, timezone as dt_timezone
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APITestCase
from .models import (BankQuestion, Contest, ContestEntry, ContestQuestion, PracticeAttempt,
                     Subject, Quiz, Question, Answer)

NOW = datetime(2026, 11, 13, 6, tzinfo=dt_timezone.utc)


class LearningTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user('admin@example.com', role='admin')
        self.student = User.objects.create_user('student@example.com', role='student')
        self.other = User.objects.create_user('other@example.com', role='student')
        self.subject = Subject.objects.create(name='Physics', slug='physics', class_level='hsc')
        self.other_subject = Subject.objects.create(name='English', slug='english', class_level='hsc')
        self.question = BankQuestion.objects.create(subject=self.subject, question_text='SI unit of force?', options=['Newton', 'Joule'], correct_index=0, explanation='Force is measured in newtons.', difficulty='mid')
        self.foreign = BankQuestion.objects.create(subject=self.other_subject, question_text='Plural of child?', options=['Children', 'Childs'], correct_index=0)
        self.client.force_authenticate(self.student)

    def request(self, method, path, data=None, now=NOW):
        with patch('quiz.learning.timezone.now', return_value=now):
            return getattr(self.client, method)('/api/learning/' + path, data=data, format='json')

    def contest(self, **overrides):
        self.client.force_authenticate(self.admin)
        data = dict(title='Weekly Physics', subject=self.subject.pk, kind='weekly', starts_at=(NOW - timedelta(hours=1)).isoformat(),
                    ends_at=(NOW + timedelta(hours=1)).isoformat(), duration_minutes=30, is_published=True, question_ids=[self.question.pk])
        data.update(overrides)
        response = self.request('post', 'admin/contests/', data)
        self.assertEqual(response.status_code, 201, response.data)
        self.client.force_authenticate(self.student)
        return Contest.objects.get(pk=response.data['id'])

    def practice(self, index=0, request_id=None):
        return self.request('post', f'practice/{self.question.pk}/submit/', {'selected_index': index, 'request_id': request_id or str(uuid.uuid4())})

    def test_practice_hides_answer_then_reveals_explanation_and_updates_filters(self):
        data = self.request('get', f'practice/{self.question.pk}/').data
        self.assertNotIn('correct_index', data)
        self.assertNotIn('explanation', data)
        result = self.practice(index=1)
        self.assertEqual(result.status_code, 201)
        self.assertFalse(result.data['is_correct'])
        self.assertEqual(result.data['correct_index'], 0)
        self.assertTrue(result.data['explanation'])
        self.assertEqual(self.request('get', 'practice/?status=wrong').data['count'], 1)
        self.practice(index=0)
        self.assertEqual(self.request('get', 'practice/?status=solved').data['count'], 1)
        self.assertEqual(self.request('get', 'practice/?status=wrong').data['count'], 0)
        summary = self.request('get', 'practice/summary/').data
        self.assertEqual([summary[k] for k in ['solved', 'attempts', 'accuracy', 'today']], [1, 2, 50, 2])
        self.assertEqual(self.request('get', 'progress/').data['rating'], 1000)

    def test_practice_submissions_are_idempotent_and_history_is_snapshotted(self):
        key = str(uuid.uuid4())
        self.practice(request_id=key)
        self.assertEqual(self.practice(request_id=key).status_code, 200)
        self.assertEqual(PracticeAttempt.objects.count(), 1)
        self.assertEqual(self.practice(index=1, request_id=key).status_code, 400)
        self.question.question_text = 'Changed after attempt'
        self.question.save()
        self.assertEqual(PracticeAttempt.objects.get().question_snapshot['question_text'], 'SI unit of force?')

    def test_student_cannot_manage_bank_or_contests_and_requires_authentication(self):
        for path in ['admin/questions/', 'admin/contests/']:
            self.assertEqual(self.request('get', path).status_code, 403)
            self.assertEqual(self.request('post', path, {}).status_code, 403)
        self.client.force_authenticate(None)
        self.assertEqual(self.request('get', 'practice/').status_code, 401)
        self.assertEqual(self.request('get', 'contests/').status_code, 401)

    def test_bad_practice_answers_and_query_filters_are_rejected(self):
        self.assertEqual(self.practice(index=99).status_code, 400)
        for params in ['subject=bad', 'difficulty=bad', 'status=bad']:
            self.assertEqual(self.request('get', f'practice/?{params}').status_code, 400)
        self.assertEqual(self.request('get', 'practice/?subject=' + str(self.subject.pk)).data['count'], 1)

    def test_bulk_import_is_atomic_and_supports_two_thousand_items(self):
        self.client.force_authenticate(self.admin)
        row = dict(subject=self.subject.pk, question_text='Imported question', options=['Yes', 'No'], correct_index=0, chapter='Motion')
        bad = self.request('post', 'admin/questions/import/', {'questions': [row, {**row, 'correct_index': 9}]})
        self.assertEqual(bad.status_code, 400)
        self.assertEqual(BankQuestion.objects.count(), 2)
        response = self.request('post', 'admin/questions/import/', {'questions': [row] * 2000})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['imported'], 2000)
        self.client.force_authenticate(self.student)
        with CaptureQueriesContext(connection) as queries:
            result = self.request('get', f'practice/?subject={self.subject.pk}')
        self.assertEqual(result.data['count'], 2001)
        self.assertEqual(len(result.data['results']), 20)
        self.assertLess(len(queries), 8)

    def test_retiring_question_preserves_history_and_legacy_import_is_repeatable(self):
        self.practice()
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.request('delete', f'admin/questions/{self.question.pk}/').status_code, 204)
        self.assertTrue(PracticeAttempt.objects.exists())
        self.client.force_authenticate(self.student)
        self.assertEqual(self.request('get', f'practice/{self.question.pk}/').status_code, 404)
        quiz = Quiz.objects.create(title='Legacy', subject=self.subject)
        question = Question.objects.create(quiz=quiz, question_text='Legacy question')
        Answer.objects.create(question=question, answer_text='Correct', is_correct=True)
        Answer.objects.create(question=question, answer_text='Wrong')
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.request('post', 'admin/questions/from-quiz/', {'quiz_id': quiz.pk}).data['imported'], 1)
        self.assertEqual(self.request('post', 'admin/questions/from-quiz/', {'quiz_id': quiz.pk}).data['imported'], 0)

    def test_contest_has_same_subject_unique_questions_and_valid_window(self):
        self.client.force_authenticate(self.admin)
        base = dict(title='Bad', subject=self.subject.pk, duration_minutes=30, starts_at=NOW.isoformat(), ends_at=(NOW + timedelta(hours=1)).isoformat())
        for changes in [{'question_ids': [self.foreign.pk]}, {'question_ids': [self.question.pk] * 2}, {'question_ids': []}, {'question_ids': [self.question.pk], 'ends_at': NOW.isoformat()}]:
            self.assertEqual(self.request('post', 'admin/contests/', {**base, **changes}).status_code, 400)

    def test_upcoming_questions_and_results_are_not_exposed(self):
        contest = self.contest(starts_at=(NOW + timedelta(minutes=5)).isoformat())
        detail = self.request('get', f'contests/{contest.pk}/').data
        self.assertEqual(detail['questions'], [])
        self.assertEqual(self.request('post', f'contests/{contest.pk}/start/').status_code, 400)
        self.assertEqual(self.request('get', f'contests/{contest.pk}/leaderboard/').status_code, 403)

    def test_start_once_autosave_resume_submit_and_answer_key_lock(self):
        contest = self.contest()
        first = self.request('post', f'contests/{contest.pk}/start/').data['entry']
        later = self.request('post', f'contests/{contest.pk}/start/', now=NOW + timedelta(minutes=3)).data['entry']
        self.assertEqual(first['deadline'], later['deadline'])
        detail = self.request('get', f'contests/{contest.pk}/').data
        item = detail['questions'][0]
        self.assertNotIn('correct_index', item)
        saved = self.request('patch', f'contests/{contest.pk}/save/', {'answers': {str(item['id']): 0}})
        self.assertEqual(saved.data['entry']['answers'], {str(item['id']): 0})
        self.assertEqual(self.request('patch', f'contests/{contest.pk}/save/', {'answers': {'999999': 0}}).status_code, 400)
        response = self.request('post', f'contests/{contest.pk}/submit/', now=NOW + timedelta(seconds=15))
        self.assertTrue(response.data['entry']['submitted'])
        self.assertNotIn('score', response.data['entry'])
        self.request('patch', f'contests/{contest.pk}/save/', {'answers': {str(item['id']): 1}})
        self.assertEqual(ContestEntry.objects.get().answers[str(item['id'])], 0)
        self.assertEqual(self.request('get', 'progress/').data['rating'], 1000)
        ended = self.request('get', f'contests/{contest.pk}/', now=contest.ends_at + timedelta(seconds=1)).data
        self.assertEqual(ended['entry']['score'], 2)
        self.assertEqual(ended['questions'][0]['correct_index'], 0)
        self.assertEqual(self.request('get', 'progress/', now=contest.ends_at + timedelta(seconds=1)).data['rating'], 1100)

    def test_expiry_grades_only_saved_answers_and_is_server_enforced(self):
        contest = self.contest()
        self.request('post', f'contests/{contest.pk}/start/')
        item = contest.items.get()
        late = NOW + timedelta(minutes=31)
        response = self.request('patch', f'contests/{contest.pk}/save/', {'answers': {str(item.pk): 0}}, now=late)
        self.assertTrue(response.data['entry']['submitted'])
        entry = ContestEntry.objects.get()
        self.assertEqual(entry.score, 0)
        self.assertEqual(entry.elapsed_seconds, 1800)
        self.assertEqual(entry.submitted_at, entry.deadline)

    def test_live_contest_bank_questions_are_unavailable_for_practice(self):
        contest = self.contest()
        self.assertEqual(self.request('get', f'practice/{self.question.pk}/').status_code, 404)
        self.assertEqual(self.practice().status_code, 404)
        self.assertEqual(self.request('get', f'practice/{self.question.pk}/', now=contest.ends_at).status_code, 200)

    def test_contest_snapshots_survive_bank_edit_and_started_contests_are_locked(self):
        contest = self.contest()
        self.question.correct_index = 1
        self.question.save()
        self.assertEqual(contest.items.get().snapshot['correct_index'], 0)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.request('patch', f'admin/contests/{contest.pk}/', {'title': 'Changed'}).status_code, 400)
        self.assertEqual(self.request('delete', f'admin/contests/{contest.pk}/').status_code, 400)

    def test_leaderboard_orders_score_then_elapsed_and_hides_other_answers(self):
        contest = self.contest()
        item = contest.items.get()
        for user, seconds in [(self.student, 20), (self.other, 10)]:
            self.client.force_authenticate(user)
            self.request('post', f'contests/{contest.pk}/start/')
            self.request('patch', f'contests/{contest.pk}/save/', {'answers': {str(item.pk): 0}})
            self.request('post', f'contests/{contest.pk}/submit/', now=NOW + timedelta(seconds=seconds))
        result = self.request('get', f'contests/{contest.pk}/leaderboard/', now=contest.ends_at + timedelta(seconds=1))
        self.assertEqual([r['elapsed_seconds'] for r in result.data['results']], [10, 20])
        self.assertEqual([r['rank'] for r in result.data['results']], [1, 2])
        self.assertNotIn('answers', result.data['results'][0])
        self.assertEqual(self.request('get', 'progress/', now=contest.ends_at + timedelta(seconds=1)).data['completed'], 1)

    def test_abandoned_attempt_is_finalized_without_browser_or_scheduler(self):
        contest = self.contest()
        self.request('post', f'contests/{contest.pk}/start/')
        self.assertIsNone(ContestEntry.objects.get().submitted_at)
        result = self.request('get', f'contests/{contest.pk}/leaderboard/', now=contest.ends_at + timedelta(seconds=1))
        self.assertEqual(result.data['count'], 1)
        self.assertIsNotNone(ContestEntry.objects.get().submitted_at)

    def test_draft_is_hidden_and_one_student_cannot_resume_another_entry(self):
        contest = self.contest(is_published=False)
        self.assertEqual(self.request('get', f'contests/{contest.pk}/').status_code, 404)
        contest.is_published = True
        contest.save()
        self.request('post', f'contests/{contest.pk}/start/')
        self.client.force_authenticate(self.other)
        self.assertIsNone(self.request('get', f'contests/{contest.pk}/').data['entry'])
        self.assertEqual(self.request('patch', f'contests/{contest.pk}/save/', {'answers': {}}).status_code, 404)

    def test_live_contest_answers_cannot_be_retrieved_through_legacy_quizzes(self):
        from .models import QuizAttempt, AttemptAnswer
        quiz = Quiz.objects.create(title='Legacy linked quiz', subject=self.subject, is_published=True)
        old_question = Question.objects.create(quiz=quiz, question_text='Linked bank question')
        correct = Answer.objects.create(question=old_question, answer_text='Secret correct', is_correct=True)
        Answer.objects.create(question=old_question, answer_text='Other')
        self.question.source_question = old_question
        self.question.save()
        old_attempt = QuizAttempt.objects.create(quiz=quiz, user=self.student)
        AttemptAnswer.objects.create(attempt=old_attempt, question=old_question, selected_answer=correct, is_correct=True)
        contest = self.contest()
        with patch('quiz.learning.timezone.now', return_value=NOW):
            self.assertEqual(self.client.get(f'/api/quizzes/{quiz.pk}/').status_code, 404)
            self.assertEqual(self.client.post(f'/api/quizzes/{quiz.pk}/submit/', {'answers': []}, format='json').status_code, 403)
            self.assertEqual(self.client.get(f'/api/quizzes/attempts/{old_attempt.pk}/').status_code, 404)
        with patch('quiz.learning.timezone.now', return_value=contest.ends_at):
            self.assertEqual(self.client.get(f'/api/quizzes/{quiz.pk}/').status_code, 200)
            self.assertEqual(self.client.get(f'/api/quizzes/attempts/{old_attempt.pk}/').status_code, 200)
