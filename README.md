# Brain Battle

Django REST API and React/Vite quiz application.

## Run locally

Install Python dependencies with `venv/bin/python -m pip install -r backend/requirements.txt` and frontend dependencies with `npm install --prefix frontend`.

From `backend/`:

```sh
../venv/bin/python manage.py migrate
DEBUG=True ../venv/bin/python manage.py runserver 127.0.0.1:8000
```

From `frontend/`:

```sh
npm run dev -- --host 127.0.0.1
```

Open http://127.0.0.1:5173/.

## Admin dashboard

Sign in through the application with an existing active admin account. Accounts with `role=admin` or superuser access automatically land at `/admin`. Students cannot access the admin pages or their APIs. Django staff status alone does not grant access to the application's admin dashboard.

To create a local administrator, run `../venv/bin/python manage.py createsuperuser` from `backend/` and choose your own credentials. Django's separate administration interface remains at http://127.0.0.1:8000/admin/.

The application dashboard includes quiz creation, questions and answer keys, publishing and scheduling, editing and confirmed deletion, searchable student lists, results, and subject creation. Questions are locked after a quiz receives an attempt to preserve results. Deleting a quiz permanently deletes its questions and results; the application asks for confirmation first.

## Verification

From `backend/`, run `../venv/bin/python manage.py test quiz`.
From `frontend/`, run `npm run build`.

For local uploaded images, run Django with `DEBUG=True` as above. To recover files saved under the older `backend/users/profile_images/` location, run `../venv/bin/python manage.py restore_profile_images` to preview, then add `--apply` to copy available originals into media storage. Missing originals must be uploaded again.

## Local demo data

From `backend/`, run `../venv/bin/python manage.py seed_demo`. This adds 24 clearly marked demo students, 6 subjects, 8 quizzes with 40 questions, and 36 sample results. Six quizzes are immediately available, one is a draft, and one is scheduled for the following day. Rerunning the command skips existing records and preserves passwords and edits.

Demo student login: `student01@demo.brainbattle.test`, password `DemoStudent!2026`. This student has no prefilled attempts, so you can take quizzes. Students 02–24 use the same initial password. Each new demo student receives a sample wallet balance of 100 BDT. These are fictional local test accounts; existing admin accounts continue to manage the dashboard.

## Student progress

Student dashboard progress is computed from the signed-in user's saved quiz attempts via `/api/quizzes/progress/?period=7` (`30` and `all` are also supported). It includes a rating curve, average quiz percentages for today/yesterday, completed quizzes, practice streak, and level progress. It uses Asia/Dhaka dates, with no synthetic results for new students. The seven- and thirty-day ranges carry earlier rating forward; all-time keeps every active date and range endpoints on a true time axis.

Rating starts at 1,000. Each quiz adds `round(2 × score_percentage − 100)` points, using half-up rounding and a floor of zero. An 80% score adds 60; a 40% score subtracts 20. Newbie: 0–1,199; Pupil: 1,200–1,399; Specialist: 1,400–1,599; Expert: 1,600+. Inactive days do not change rating. A streak stays active through today if the student practised yesterday. Daily averages are the mean of individual quiz percentages; comparisons are in percentage points. Days without quizzes have no average, rather than a zero score. Rating is recalculated if an attempt is deleted.
