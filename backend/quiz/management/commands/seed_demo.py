from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from quiz.models import Subject, Quiz, Question, Answer, QuizAttempt, AttemptAnswer
from users.models import Wallet, WalletTransaction

PASSWORD = 'DemoStudent!2026'
# Each tuple contains a question, its correct answer, and three distractors.
BANKS = {
    'physics': [
        ('What is the SI unit of force?', 'Newton', 'Joule', 'Watt', 'Pascal'),
        ('Speed is calculated as:', 'Distance divided by time', 'Time divided by distance', 'Mass times acceleration', 'Force times distance'),
        ('What is the approximate acceleration due to gravity near Earth?', '9.8 m/s²', '98 m/s²', '0.98 m/s²', '980 m/s²'),
        ('Which quantity is a vector?', 'Velocity', 'Speed', 'Mass', 'Temperature'),
        ('The SI unit of electrical resistance is:', 'Ohm', 'Volt', 'Ampere', 'Coulomb'),
    ],
    'math': [
        ('Solve: 2x + 6 = 14', '4', '2', '6', '8'),
        ('What is the square root of 144?', '12', '14', '16', '10'),
        ('What is (a + b)²?', 'a² + 2ab + b²', 'a² + b²', 'a² - 2ab + b²', '2a + 2b'),
        ('The sum of angles in a triangle is:', '180°', '90°', '270°', '360°'),
        ('What is 25% of 200?', '50', '25', '75', '100'),
    ],
    'english': [
        ('Choose the correct sentence.', 'She goes to school.', 'She go to school.', 'She going to school.', 'She gone to school.'),
        ('What is the plural of child?', 'Children', 'Childs', 'Childes', 'Childrens'),
        ('Choose the synonym of happy.', 'Joyful', 'Angry', 'Tired', 'Afraid'),
        ('Fill in: He is ___ honest person.', 'an', 'a', 'the', 'no article'),
        ('What is the past tense of write?', 'Wrote', 'Written', 'Writing', 'Writes'),
    ],
    'biology': [
        ('What is the basic unit of life?', 'Cell', 'Tissue', 'Organ', 'Organ system'),
        ('Which organelle produces most cellular ATP?', 'Mitochondrion', 'Ribosome', 'Nucleus', 'Lysosome'),
        ('Which pigment makes leaves green?', 'Chlorophyll', 'Haemoglobin', 'Melanin', 'Keratin'),
        ('DNA stands for:', 'Deoxyribonucleic acid', 'Dinitrogen acid', 'Deoxyribose nitrogen atom', 'Double nucleic antigen'),
        ('Which organ pumps blood?', 'Heart', 'Lung', 'Liver', 'Kidney'),
    ],
    'chemistry': [
        ('What is the chemical formula for water?', 'H₂O', 'CO₂', 'O₂', 'NaCl'),
        ('What is the atomic number of carbon?', '6', '8', '12', '14'),
        ('A solution with pH 7 is:', 'Neutral', 'Acidic', 'Basic', 'Always salty'),
        ('What is the chemical symbol for sodium?', 'Na', 'S', 'So', 'N'),
        ('Which gas is released when an acid reacts with a carbonate?', 'Carbon dioxide', 'Oxygen', 'Nitrogen', 'Chlorine'),
    ],
    'general': [
        ('What is the capital of Bangladesh?', 'Dhaka', 'Chattogram', 'Khulna', 'Sylhet'),
        ('When is International Mother Language Day?', '21 February', '26 March', '16 December', '14 April'),
        ('Which is the national flower of Bangladesh?', 'Water lily', 'Rose', 'Sunflower', 'Jasmine'),
        ('Bangladesh gained independence in which year?', '1971', '1952', '1947', '1990'),
        ('What is the currency of Bangladesh?', 'Taka', 'Rupee', 'Riyal', 'Dollar'),
    ],
}
NAMES = [
    ('Arif', 'Hossain'), ('Nusrat', 'Jahan'), ('Tahmid', 'Hasan'), ('Sadika', 'Rahman'),
    ('Rafi', 'Ahmed'), ('Mim', 'Akter'), ('Sakib', 'Islam'), ('Faria', 'Chowdhury'),
    ('Nabil', 'Khan'), ('Sumaiya', 'Haque'), ('Sami', 'Mahmud'), ('Tasnim', 'Sultana'),
    ('Abrar', 'Karim'), ('Anika', 'Ferdous'), ('Imran', 'Hossain'), ('Nafisa', 'Ahmed'),
    ('Fahim', 'Rahman'), ('Sadia', 'Islam'), ('Raihan', 'Kabir'), ('Maliha', 'Noor'),
    ('Adnan', 'Hasan'), ('Sanjida', 'Akter'), ('Yasin', 'Ali'), ('Zarin', 'Tasnim'),
]


class Command(BaseCommand):
    help = 'Add clearly marked local demo students, quizzes and results without replacing existing data. Safe to run repeatedly.'

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()
        creator = User.objects.filter(Q(role='admin') | Q(is_superuser=True), is_active=True).order_by('pk').first()
        if creator is None:
            raise CommandError('Create an admin account before seeding demo quizzes.')
        counts = dict(students=0, subjects=0, quizzes=0, questions=0, attempts=0)
        students = []
        for index, (first, last) in enumerate(NAMES, 1):
            user, created = User.objects.get_or_create(
                email=f'student{index:02d}@demo.brainbattle.test',
                defaults=dict(first_name=first, last_name=f'{last} (Demo)', role='student',
                              class_level='hsc' if index % 2 else 'ssc', board='Dhaka',
                              subject_group='Science', institution=['Demo Dhaka College', 'Demo Ideal School', 'Demo City College'][index % 3],
                              district=['Dhaka', 'Chattogram', 'Sylhet'][index % 3],
                              roll_number=str(1000 + index), reg_number=f'DEMO{index:06d}', exam_year=2026),
            )
            if user.role != 'student' or not user.last_name.endswith('(Demo)'):
                raise CommandError(f'Demo email collision: student{index:02d}. No changes saved.')
            if created:
                user.set_password(PASSWORD)
                user.save(update_fields=['password'])
                wallet, _ = Wallet.objects.get_or_create(user=user)
                wallet.balance = Decimal('100.00')
                wallet.save(update_fields=['balance'])
                WalletTransaction.objects.create(wallet=wallet, tx_type='credit', amount=100, description='Demo credit — sample balance for local testing')
                counts['students'] += 1
            students.append(user)

        definitions = [
            ('physics', 'Physics', 'hsc', 'HSC Physics — Motion', 'live'),
            ('math', 'Mathematics', 'ssc', 'SSC Algebra Basics', 'live'),
            ('english', 'English', 'hsc', 'English Grammar Practice', 'live'),
            ('biology', 'Biology', 'hsc', 'Biology — Cell Structure', 'live'),
            ('chemistry', 'Chemistry', 'ssc', 'SSC Chemistry Fundamentals', 'live'),
            ('general', 'General Knowledge', 'admission', 'Bangladesh General Knowledge', 'live'),
            ('math', 'Mathematics', 'ssc', 'Mathematics Revision', 'draft'),
            ('physics', 'Physics', 'hsc', 'Upcoming Physics Challenge', 'upcoming'),
        ]
        live = []
        for bank, name, level, title, status in definitions:
            subject, created = Subject.objects.get_or_create(name=f'Demo {name}', class_level=level,
                defaults=dict(slug=f'demo-{level}-{bank}', description='Demo subject for local testing.'))
            counts['subjects'] += int(created)
            quiz, created = Quiz.objects.get_or_create(title=f'[Demo] {title}', defaults=dict(
                subject=subject, created_by=creator, description='Demo quiz for testing Brain Battle. Sample questions and results.',
                duration_minutes=15 if bank == 'general' else 30, is_published=status != 'draft',
                scheduled_at=timezone.now() + timedelta(days=1) if status == 'upcoming' else None))
            if not quiz.description.startswith('Demo quiz for testing Brain Battle.'):
                raise CommandError('Demo quiz title collision. No changes saved.')
            if created:
                counts['quizzes'] += 1
                for order, (text, correct, *wrong) in enumerate(BANKS[bank]):
                    question = Question.objects.create(quiz=quiz, question_text=text, order=order,
                                                       difficulty=['simple', 'mid', 'hard'][order % 3])
                    answers = [correct, *wrong]
                    shift = order % 4
                    answers = answers[shift:] + answers[:shift]
                    Answer.objects.bulk_create([Answer(question=question, answer_text=text, is_correct=text == correct) for text in answers])
                    counts['questions'] += 1
            if status == 'live':
                live.append(quiz)

        # Leave student01 free to try all live quizzes in the UI.
        for index, user in enumerate(students[1:19], 1):
            for offset in range(2):
                quiz = live[(index + offset) % len(live)]
                if not quiz.is_live or quiz.attempts.filter(user=user).exists():
                    continue
                questions = list(quiz.questions.prefetch_related('answers'))
                if not questions:
                    continue
                attempt = QuizAttempt.objects.create(quiz=quiz, user=user, total_questions=len(questions))
                score = total = correct_count = 0
                for order, question in enumerate(questions):
                    correct = (index + offset + order) % 4 != 0
                    selected = next(answer for answer in question.answers.all() if answer.is_correct == correct)
                    mark = {'simple': 1, 'mid': 2, 'hard': 3}[question.difficulty]
                    earned = mark if correct else 0
                    AttemptAnswer.objects.create(attempt=attempt, question=question, selected_answer=selected,
                                                 is_correct=correct, marks_obtained=earned, marks_possible=mark)
                    score += earned
                    total += mark
                    correct_count += int(correct)
                attempt.score, attempt.total_marks, attempt.correct_answers = score, total, correct_count
                attempt.save(update_fields=['score', 'total_marks', 'correct_answers'])
                counts['attempts'] += 1
        self.stdout.write(self.style.SUCCESS('Created: ' + ', '.join(f'{value} {key}' for key, value in counts.items())))
        self.stdout.write('Demo student: student01@demo.brainbattle.test (password documented in README). Existing passwords unchanged.')
