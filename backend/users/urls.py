from django.urls import path
from . import views

urlpatterns = [
    # ── Auth ──────────────────────────────────────────────────────────────────
    path("register/",        views.RegisterView.as_view(),       name="auth-register"),
    path("login/",           views.LoginView.as_view(),          name="auth-login"),
    path("logout/",          views.LogoutView.as_view(),         name="auth-logout"),

    # ── Profile ───────────────────────────────────────────────────────────────
    path("profile/",         views.ProfileView.as_view(),        name="user-profile"),
    path("profile/update/",  views.ProfileUpdateView.as_view(),  name="user-profile-update"),

    # ── Password ──────────────────────────────────────────────────────────────
    path("change-password/", views.ChangePasswordView.as_view(), name="change-password"),

    # ── Wallet ────────────────────────────────────────────────────────────────
    path("wallet/",          views.WalletView.as_view(),         name="user-wallet"),
]
