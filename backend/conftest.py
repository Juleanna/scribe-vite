import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'scribe.settings')
os.environ.setdefault('DJANGO_DEBUG', 'True')

import pytest
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.fixture
def user(db):
    return User.objects.create_user(email='test@example.com', password='TestPass123')

@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()

@pytest.fixture
def auth_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client
