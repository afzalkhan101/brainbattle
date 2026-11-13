from django.db import migrations


def copy_existing(apps, schema_editor):
    Question = apps.get_model('quiz', 'Question')
    BankQuestion = apps.get_model('quiz', 'BankQuestion')
    for question in Question.objects.select_related('quiz').prefetch_related('answers').iterator(chunk_size=200):
        if not question.quiz.subject_id:
            continue
        answers = list(question.answers.all())
        correct = [i for i, answer in enumerate(answers) if answer.is_correct]
        if not 2 <= len(answers) <= 6 or len(correct) != 1:
            continue
        BankQuestion.objects.get_or_create(source_question_id=question.pk, defaults={
            'subject_id': question.quiz.subject_id, 'question_text': question.question_text,
            'options': [answer.answer_text for answer in answers], 'correct_index': correct[0],
            'difficulty': question.difficulty, 'created_by_id': question.quiz.created_by_id,
            'is_active': question.quiz.is_published,
        })


class Migration(migrations.Migration):
    dependencies = [('quiz', '0008_bankquestion_contest_contestentry_contestquestion_and_more')]
    operations = [migrations.RunPython(copy_existing, migrations.RunPython.noop)]
