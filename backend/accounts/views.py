from urllib.parse import urlencode

import requests as http_requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import redirect
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from scribe.throttles import AuthRateThrottle, RegisterRateThrottle
from .serializers import ChangePasswordSerializer, RegisterSerializer, UserSerializer

User = get_user_model()


# ---------------------------------------------------------------------------
# Standard auth
# ---------------------------------------------------------------------------


class RegisterView(generics.CreateAPIView):
    """POST /auth/register/ -- create a new user account."""

    serializer_class = RegisterSerializer
    permission_classes = (AllowAny,)
    throttle_classes = (RegisterRateThrottle,)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """POST /auth/login/ -- obtain JWT pair via email + password.

    SimpleJWT already handles authentication; we only need to make sure
    USERNAME_FIELD on the user model is ``email`` (which it is).
    """

    permission_classes = (AllowAny,)
    throttle_classes = (AuthRateThrottle,)


class MeView(generics.RetrieveUpdateAPIView):
    """GET | PATCH /auth/me/ -- current user profile."""

    serializer_class = UserSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        return self.request.user


class LogoutView(APIView):
    """POST /auth/logout/ -- blacklist the refresh token."""

    permission_classes = (IsAuthenticated,)

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            return Response(
                {"detail": "Invalid or expired token."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_205_RESET_CONTENT)


class ChangePasswordView(APIView):
    """POST /auth/change-password/ -- change current user password."""

    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response(
                {"old_password": "Wrong password."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return Response({"detail": "Password changed."})


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_jwt_redirect(user):
    """Generate JWT pair for *user* and return a redirect to the frontend."""
    refresh = RefreshToken.for_user(user)
    params = urlencode(
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }
    )
    return redirect(f"{settings.FRONTEND_URL}/auth/callback?{params}")


# ---------------------------------------------------------------------------
# Google OAuth 2.0
# ---------------------------------------------------------------------------

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


class GoogleOAuthStartView(APIView):
    """GET /auth/google/ -- redirect the browser to Google consent screen."""

    permission_classes = (AllowAny,)

    def get(self, request):
        params = urlencode(
            {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "redirect_uri": request.build_absolute_uri("/api/v1/auth/google/callback/"),
                "response_type": "code",
                "scope": "openid email profile",
                "access_type": "offline",
                "prompt": "consent",
            }
        )
        return redirect(f"{GOOGLE_AUTH_URL}?{params}")


class GoogleOAuthCallbackView(APIView):
    """GET /auth/google/callback/ -- exchange code, find/create user, redirect."""

    permission_classes = (AllowAny,)

    def get(self, request):
        code = request.query_params.get("code")
        if not code:
            return Response(
                {"detail": "Authorization code not provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Exchange code for tokens
        token_resp = http_requests.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": request.build_absolute_uri("/api/v1/auth/google/callback/"),
                "grant_type": "authorization_code",
            },
            timeout=10,
        )
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            return Response(
                {"detail": "Failed to obtain access token from Google."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Fetch user info
        userinfo = http_requests.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        ).json()

        google_id = userinfo.get("id")
        email = userinfo.get("email")
        avatar = userinfo.get("picture")

        # Find or create user
        user = User.objects.filter(google_id=google_id).first()
        if not user and email:
            user = User.objects.filter(email=email).first()
            if user:
                user.google_id = google_id
                if avatar and not user.avatar_url:
                    user.avatar_url = avatar
                user.save(update_fields=["google_id", "avatar_url"])
        if not user:
            user = User.objects.create_user(
                email=email,
                google_id=google_id,
                avatar_url=avatar,
            )

        return _build_jwt_redirect(user)


# ---------------------------------------------------------------------------
# GitHub OAuth 2.0
# ---------------------------------------------------------------------------

GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


class GitHubOAuthStartView(APIView):
    """GET /auth/github/ -- redirect the browser to GitHub consent screen."""

    permission_classes = (AllowAny,)

    def get(self, request):
        params = urlencode(
            {
                "client_id": settings.GITHUB_CLIENT_ID,
                "redirect_uri": request.build_absolute_uri("/api/v1/auth/github/callback/"),
                "scope": "read:user user:email",
            }
        )
        return redirect(f"{GITHUB_AUTH_URL}?{params}")


class GitHubOAuthCallbackView(APIView):
    """GET /auth/github/callback/ -- exchange code, find/create user, redirect."""

    permission_classes = (AllowAny,)

    def get(self, request):
        code = request.query_params.get("code")
        if not code:
            return Response(
                {"detail": "Authorization code not provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Exchange code for access token
        token_resp = http_requests.post(
            GITHUB_TOKEN_URL,
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": request.build_absolute_uri("/api/v1/auth/github/callback/"),
            },
            headers={"Accept": "application/json"},
            timeout=10,
        )
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            return Response(
                {"detail": "Failed to obtain access token from GitHub."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

        # Fetch user profile
        gh_user = http_requests.get(GITHUB_USER_URL, headers=headers, timeout=10).json()
        github_id = gh_user.get("id")
        avatar = gh_user.get("avatar_url")

        # Fetch primary email
        email = gh_user.get("email")
        if not email:
            emails_resp = http_requests.get(
                GITHUB_EMAILS_URL, headers=headers, timeout=10
            ).json()
            for entry in emails_resp:
                if entry.get("primary") and entry.get("verified"):
                    email = entry["email"]
                    break

        # Find or create user
        user = User.objects.filter(github_id=github_id).first()
        if not user and email:
            user = User.objects.filter(email=email).first()
            if user:
                user.github_id = github_id
                if avatar and not user.avatar_url:
                    user.avatar_url = avatar
                user.save(update_fields=["github_id", "avatar_url"])
        if not user:
            user = User.objects.create_user(
                email=email,
                github_id=github_id,
                avatar_url=avatar,
            )

        return _build_jwt_redirect(user)
