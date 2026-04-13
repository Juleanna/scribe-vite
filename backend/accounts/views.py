import secrets
from urllib.parse import urlencode

import requests as http_requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
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
# Email verification
# ---------------------------------------------------------------------------


class SendVerificationEmailView(APIView):
    """POST /auth/send-verification/ -- send email verification link."""

    permission_classes = (IsAuthenticated,)

    def post(self, request):
        user = request.user
        if user.is_email_verified:
            return Response({"detail": "Email already verified."})
        token = secrets.token_urlsafe(32)
        user.email_verification_token = token
        user.save(update_fields=["email_verification_token"])
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        send_mail(
            "Scribe \u2014 \u043f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0456\u0442\u044c email",
            f"\u041f\u0435\u0440\u0435\u0439\u0434\u0456\u0442\u044c \u0437\u0430 \u043f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f\u043c: {verify_url}",
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=True,
        )
        return Response({"detail": "Verification email sent."})


class VerifyEmailView(APIView):
    """GET /auth/verify-email/?token=... -- verify email address."""

    permission_classes = (AllowAny,)

    def get(self, request):
        token = request.query_params.get("token")
        if not token:
            return Response({"detail": "Token required."}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(email_verification_token=token).first()
        if not user:
            return Response({"detail": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)
        user.is_email_verified = True
        user.email_verification_token = None
        user.save(update_fields=["is_email_verified", "email_verification_token"])
        return Response({"detail": "Email verified."})


# ---------------------------------------------------------------------------
# Password reset
# ---------------------------------------------------------------------------


class RequestPasswordResetView(APIView):
    """POST /auth/request-password-reset/ -- send password reset email."""

    permission_classes = (AllowAny,)
    throttle_classes = (AuthRateThrottle,)

    def post(self, request):
        email = request.data.get("email")
        user = User.objects.filter(email=email).first()
        if user:
            token = secrets.token_urlsafe(32)
            user.email_verification_token = token  # reuse field for reset
            user.save(update_fields=["email_verification_token"])
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
            send_mail(
                "Scribe \u2014 \u0441\u043a\u0438\u0434\u0430\u043d\u043d\u044f \u043f\u0430\u0440\u043e\u043b\u044f",
                f"\u041f\u0435\u0440\u0435\u0439\u0434\u0456\u0442\u044c \u0437\u0430 \u043f\u043e\u0441\u0438\u043b\u0430\u043d\u043d\u044f\u043c: {reset_url}",
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=True,
            )
        # Always return 200 to not leak user existence
        return Response({"detail": "If account exists, reset email sent."})


class ResetPasswordView(APIView):
    """POST /auth/reset-password/ -- reset password with token."""

    permission_classes = (AllowAny,)

    def post(self, request):
        token = request.data.get("token")
        new_password = request.data.get("new_password")
        if not token or not new_password or len(new_password) < 8:
            return Response(
                {"detail": "Token and password (8+ chars) required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = User.objects.filter(email_verification_token=token).first()
        if not user:
            return Response({"detail": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.email_verification_token = None
        user.save(update_fields=["password", "email_verification_token"])
        return Response({"detail": "Password reset."})


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
