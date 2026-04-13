from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

app_name = "accounts"

urlpatterns = [
    # Standard auth
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", views.MeView.as_view(), name="me"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("change-password/", views.ChangePasswordView.as_view(), name="change-password"),
    # Email verification
    path("send-verification/", views.SendVerificationEmailView.as_view(), name="send-verification"),
    path("verify-email/", views.VerifyEmailView.as_view(), name="verify-email"),
    # Password reset
    path("request-password-reset/", views.RequestPasswordResetView.as_view(), name="request-password-reset"),
    path("reset-password/", views.ResetPasswordView.as_view(), name="reset-password"),
    # Google OAuth
    path("google/", views.GoogleOAuthStartView.as_view(), name="google-start"),
    path("google/callback/", views.GoogleOAuthCallbackView.as_view(), name="google-callback"),
    # GitHub OAuth
    path("github/", views.GitHubOAuthStartView.as_view(), name="github-start"),
    path("github/callback/", views.GitHubOAuthCallbackView.as_view(), name="github-callback"),
]
