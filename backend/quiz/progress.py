"""Student-only progress calculated from saved quiz attempts, without changing results."""
from collections import defaultdict
from datetime import datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from django.utils import timezone
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import QuizAttempt

LEVELS = [
    {'name': 'Newbie', 'minimum': 0, 'maximum': 1199, 'color': 'slate'},
    {'name': 'Pupil', 'minimum': 1200, 'maximum': 1399, 'color': 'green'},
    {'name': 'Specialist', 'minimum': 1400, 'maximum': 1599, 'color': 'cyan'},
    {'name': 'Expert', 'minimum': 1600, 'maximum': None, 'color': 'blue'},
]
STARTING_RATING = 1000


def rounded(value):
    return int(Decimal(str(value)).quantize(Decimal('1'), rounding=ROUND_HALF_UP))


def build_progress(attempts, now, tz, period):
    today = now.astimezone(tz).date()
    yesterday = today - timedelta(days=1)
    days = defaultdict(lambda: {'count': 0, 'scores': [], 'rating': STARTING_RATING})
    rating = STARTING_RATING
    completed = 0
    for attempt in attempts:
        if attempt['submitted_at'] > now:
            continue
        date = attempt['submitted_at'].astimezone(tz).date()
        day = days[date]
        completed += 1
        day['count'] += 1
        if attempt['total_marks'] > 0:
            score = max(0, min(100, attempt['score'] / attempt['total_marks'] * 100))
            rating = max(0, rating + rounded(2 * score - 100))
            day['scores'].append(score)
        day['rating'] = rating

    active_dates = sorted(days)
    if period == 'all':
        # Keep every active date and range endpoints; the chart uses a true time axis.
        dates = sorted(set(active_dates + [today] + ([active_dates[0] - timedelta(days=1)] if active_dates else [])))
    else:
        dates = [today - timedelta(days=i) for i in reversed(range(int(period)))]
    start = dates[0]
    previous_rating = STARTING_RATING
    for date in active_dates:
        if date < start:
            previous_rating = days[date]['rating']
    timeline = []
    for date in dates:
        day = days.get(date)
        if day:
            previous_rating = day['rating']
        timeline.append({
            'date': date.isoformat(),
            'timestamp': int(datetime.combine(date, time.min, tzinfo=tz).timestamp() * 1000),
            'rating': previous_rating,
            'attempts': day['count'] if day else 0,
            'average_score': round(sum(day['scores']) / len(day['scores']), 1) if day and day['scores'] else None,
        })

    def summary(date):
        day = days.get(date)
        scores = day['scores'] if day else []
        return {'date': date.isoformat(), 'attempts': day['count'] if day else 0,
                'average_score': round(sum(scores) / len(scores), 1) if scores else None}

    today_summary, yesterday_summary = summary(today), summary(yesterday)
    delta = None
    if today_summary['average_score'] is not None and yesterday_summary['average_score'] is not None:
        delta = round(today_summary['average_score'] - yesterday_summary['average_score'], 1)
    before_today = STARTING_RATING
    for date in active_dates:
        if date < today:
            before_today = days[date]['rating']
    streak = 0
    cursor = today if today in days else yesterday
    while cursor in days:
        streak += 1
        cursor -= timedelta(days=1)
    level_index = max(i for i, level in enumerate(LEVELS) if rating >= level['minimum'])
    current = LEVELS[level_index]
    next_level = LEVELS[level_index + 1] if level_index + 1 < len(LEVELS) else None
    return {
        'timezone': str(tz), 'period': period, 'completed': completed, 'rating': rating,
        'rating_change_today': rating - before_today, 'level': current['name'],
        'levels': LEVELS, 'next_level': next_level['name'] if next_level else None,
        'points_to_next_level': next_level['minimum'] - rating if next_level else 0,
        'level_progress': round((rating - current['minimum']) / (next_level['minimum'] - current['minimum']) * 100, 1) if next_level else 100,
        'streak': streak, 'today': today_summary, 'yesterday': yesterday_summary,
        'score_change': delta, 'timeline': timeline,
    }


class StudentProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period = request.query_params.get('period', '7')
        if period not in ('7', '30', 'all'):
            raise serializers.ValidationError({'period': 'Choose 7, 30 or all.'})
        try:
            tz = ZoneInfo(request.query_params.get('timezone', 'Asia/Dhaka'))
        except (ZoneInfoNotFoundError, ValueError):
            raise serializers.ValidationError({'timezone': 'Choose a valid IANA time zone.'})
        attempts = QuizAttempt.objects.filter(user=request.user).order_by('submitted_at', 'pk').values('submitted_at', 'score', 'total_marks')
        return Response(build_progress(attempts, timezone.now(), tz, period))
