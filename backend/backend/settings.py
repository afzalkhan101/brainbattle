from pathlib import Path
from datetime import timedelta
import os

BASE_DIR = Path(__file__).resolve().parent.parent


SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-change-this-in-production'
)

DEBUG = os.environ.get('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = os.environ.get(
    'ALLOWED_HOSTS',
    'localhost,127.0.0.1'
).split(',')

CORS_ALLOW_ALL_ORIGINS = True


# ============================================================
# Applications
# ============================================================

INSTALLED_APPS = [
    # Django
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',

    # Local
    'users',
    'quiz',
]


# ============================================================
# Middleware
# ============================================================

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',

    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


# ============================================================
# URL Configuration
# ============================================================

ROOT_URLCONF = 'backend.urls'


# ============================================================
# Templates
# ============================================================

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


# ============================================================
# WSGI
# ============================================================

WSGI_APPLICATION = 'backend.wsgi.application'


# ============================================================
# Database
# ============================================================

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# ============================================================
# Custom User Model
# ============================================================

AUTH_USER_MODEL = 'users.User'


# ============================================================
# Password Validation
# ============================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': (
            'django.contrib.auth.password_validation.'
            'UserAttributeSimilarityValidator'
        )
    },
    {
        'NAME': (
            'django.contrib.auth.password_validation.'
            'MinimumLengthValidator'
        )
    },
    {
        'NAME': (
            'django.contrib.auth.password_validation.'
            'CommonPasswordValidator'
        )
    },
    {
        'NAME': (
            'django.contrib.auth.password_validation.'
            'NumericPasswordValidator'
        )
    },
]


# ============================================================
# Internationalization
# ============================================================

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

# Atomic JSON question-bank imports (up to 2,000 questions per file).
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024


# ============================================================
# Static Files
# ============================================================

STATIC_URL = 'static/'


# ============================================================
# Media / Uploaded Files
# ============================================================
# Current profile image path:
#
# backend/
# └── users/
#     └── profile_images/
#         └── 7/
#             └── image.jpg
#
# The upload_to function already includes "users/".
# Therefore MEDIA_URL must NOT include "/users/".
#
# URL:
# /users/profile_images/7/image.jpg
#
# Filesystem:
# BASE_DIR/users/profile_images/7/image.jpg

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ============================================================
# Default Primary Key
# ============================================================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ============================================================
# Django REST Framework
# ============================================================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),

    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),

    'DEFAULT_PAGINATION_CLASS': (
        'rest_framework.pagination.PageNumberPagination'
    ),

    'PAGE_SIZE': 20,

    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],

    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '1000/day',
    },
}


# ============================================================
# Simple JWT
# ============================================================

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),

    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),

    'ROTATE_REFRESH_TOKENS': True,

    'BLACKLIST_AFTER_ROTATION': True,

    'AUTH_HEADER_TYPES': (
        'Bearer',
    ),
}


# ============================================================
# CORS
# ============================================================

CORS_ALLOWED_ORIGINS = os.environ.get(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://localhost:5173'
).split(',')

CORS_ALLOW_CREDENTIALS = True
