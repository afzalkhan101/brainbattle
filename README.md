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

The student dashboard uses `/api/learning/progress/?period=7` (`30` and `all` are supported). Competitive rating uses only submitted entries in contests whose end time has passed. Old quizzes and daily practice do not change it; old quiz history remains in My Attempts. Practice has separate solved counts, accuracy, today's attempts and a daily streak, using Asia/Dhaka dates.

Rating starts at 1,000. Each finished contest adds `round(2 × score_percentage − 100)`, with half-up rounding and a floor of zero. An 80% score adds 60; a 40% score subtracts 20. Newbie: 0–1,199; Pupil: 1,200–1,399; Specialist: 1,400–1,599; Expert: 1,600+. The graph uses contest end dates. The earlier `/api/quizzes/progress/` endpoint remains available for legacy quiz-only analytics.

## Question bank and practice

Admin → Question bank supports adding/editing questions, explanations, chapters, difficulty and retirement. A migration copies valid subject-assigned legacy quiz questions into the bank without modifying the original quiz. Published quiz copies are active; draft quiz copies are inactive. The Import an existing quiz action can copy questions added later and skips existing copies.

Use JSON template to download the import format. JSON files support 1–2,000 questions and up to 10 MB per request. Each row has `subject` (an existing subject ID), `chapter`, `question_text`, `options` (2–6 strings), `correct_index` (zero-based), `explanation`, `difficulty` (`simple`, `mid`, `hard`), and `is_active`. The entire import is validated and saved atomically. A repeated JSON import creates additional questions; it does not deduplicate by text.

Students → Practice arena provides subject/chapter/difficulty filters, search, pagination, solved/unsolved/wrong filters, answer feedback and explanations. Practice submissions are idempotent using a request UUID. Historical feedback stores a snapshot so later edits do not change it. Questions in currently live contests are temporarily unavailable for practice.

## Weekly and monthly contests

Admin → Manage contests → Create contest: choose a subject, weekly/monthly type, start/end dates, per-student duration and 1–200 bank questions, then publish. Weekly/monthly are labels for manually scheduled events; they do not create recurring contests automatically. Dates are entered in the browser's local time. The per-student deadline is the earlier of start + duration or the contest end.

Every selected question is snapshotted with its choices, answer and explanation. Every participant sees the same questions/order. A started contest or a contest with participants cannot be edited/deleted. A bank question can still be edited or retired without affecting existing contest snapshots.

Students → Subject contests: start once, answer questions (saved to the server), resume after reload, and submit. The server enforces the deadline; late answer changes are discarded. Scores and answer explanations unlock only after the overall contest ends. Abandoned entries are finalized from saved answers when entry/results/progress are read, so no background scheduler is required. Do not close a tab while answers are still saving. After the end, the paginated leaderboard ranks score descending, then elapsed seconds ascending; equal score/time shares rank. Questions use 1/2/3 marks for simple/medium/hard, no negative marks, and unanswered questions earn zero.

## Display preferences

Use the moon/sun button in the application header for dark/light mode, and the বাংলা/English button to switch the interface language. The controls also appear on login and registration pages. Preferences are saved per browser in `brainbattle.theme` and `brainbattle.language`, sync between tabs, and survive sign-out. The initial theme follows the system preference if no theme was saved. Changing either setting preserves unsaved form fields and quiz selections.

Translations cover student and application-admin screens, dialogs, chart labels and common notifications. Names, email addresses and stored quiz questions/answers remain in their original language. Interface translations live in `frontend/src/i18n/bn.js`; `frontend/src/theme.css` defines the shared dark surfaces and existing utility overrides. No translation service or data submission is involved.
