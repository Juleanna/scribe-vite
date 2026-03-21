import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    """
    Custom user model. Email is the unique identifier (no username).
    Supports Google and GitHub OAuth.
    """

    class Locale(models.TextChoices):
        UK = "uk", "Українська"
        EN = "en", "English"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None  # type: ignore[assignment]
    email = models.EmailField("email address", unique=True)

    google_id = models.CharField(max_length=255, null=True, blank=True, unique=True)
    github_id = models.IntegerField(null=True, blank=True, unique=True)
    avatar_url = models.URLField(max_length=500, null=True, blank=True)
    locale = models.CharField(max_length=2, choices=Locale.choices, default=Locale.UK)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    objects = UserManager()  # type: ignore[assignment]

    class Meta:
        db_table = "users"
        verbose_name = "user"
        verbose_name_plural = "users"

    def __str__(self) -> str:
        return self.email
