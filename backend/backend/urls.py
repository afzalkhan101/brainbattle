from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView


urlpatterns = [
    path('api/admin/', include('quiz.admin_api')),
    path('admin/', admin.site.urls),

    # Auth
    path('api/auth/', include('users.urls')),
    path(
        'api/auth/token/refresh/',
        TokenRefreshView.as_view(),
        name='token-refresh'
    ),

    path('api/quizzes/', include('quiz.urls')),
]


if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )
