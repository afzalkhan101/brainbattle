You are a senior software architect and Django developer. Build a complete production-ready EdTech MCQ Quiz Platform using Django and PostgreSQL. Project Goal: Create a scalable web platform where SSC, HSC, and admission test students can practice MCQ quizzes, compete with others, win prize money, and interact with coaching centers and universities that advertise their admission programs. Tech Stack:
* Backend: Django
* API: Django REST Framework
* Database: PostgreSQL
* Authentication: JWT
* Frontend: Django Templates or React (optional)
* Deployment-ready structure
* Clean architecture
* Production-ready code Core Features:
1. User System
* User registration
* Login/logout
* JWT authentication
* User profile
* Student class level (SSC / HSC / Admission)
1. Subject & Topic System
* Subjects by class level
* Topics inside subjects
1. Quiz System
* Quiz creation
* MCQ questions
* Timer per quiz
* Random question order
* Entry fee for quiz
* Prize pool
1. Quiz Play Engine
* Start quiz
* Submit answers
* Automatic score calculation
* Anti cheating basic logic
1. Leaderboard
* Quiz leaderboard
* Weekly leaderboard
* Global leaderboard
1. Prize System
* Winner selection
* Prize wallet
* Prize history
1. Referral System
* Invite friends
* Reward points
1. Coaching Center Ads
* Coaching center profile
* Ad banner
* Sponsored quizzes
1. University Admission Ads
* University profile
* Admission notice banner
* Scholarship promotion
1. Payment System
* User wallet
* Add balance
* Pay quiz entry fee
* Prize distribution
1. Admin Panel
* Add subjects
* Add quizzes
* Add questions
* Manage users
* Manage ads
* Manage prizes Database Design: Create PostgreSQL models for: User Profile Subject Topic Quiz Question Option QuizAttempt Answer Leaderboard Wallet Transaction Referral CoachingCenter CoachingAd University UniversityAd Project Structure: quiz_platform/ users/ quizzes/ leaderboard/ payments/ ads/ referrals/ core/ Requirements:
* Use Django best practices
* Clean models
* DRF serializers
* REST APIs
* Admin customization
* Pagination
* Proper folder structure
* .env configuration
* Docker-ready setup
* PostgreSQL configuration
* requirements.txt Also include:
* Complete database schema
* API endpoints list
* Example API requests
* Sample data
* Deployment guide The output should include:
1. Full Django project structure
2. All models
3. All serializers
4. All views
5. URL routing
6. Admin configuration
7. Basic frontend templates
8. Setup instructions
* after finiching provide me as a zip

just write it on readme.md no need



- eai promot hono jaye ki user er part ta thik ache ?