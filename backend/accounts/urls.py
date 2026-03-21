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
    # Google OAuth
    path("google/", views.GoogleOAuthStartView.as_view(), name="google-start"),
    path("google/callback/", views.GoogleOAuthCallbackView.as_view(), name="google-callback"),
    # GitHub OAuth
    path("github/", views.GitHubOAuthStartView.as_view(), name="github-start"),
    path("github/callback/", views.GitHubOAuthCallbackView.as_view(), name="github-callback"),
]
