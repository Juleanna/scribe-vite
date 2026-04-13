import pytest
from django.contrib.auth import get_user_model

User = get_user_model()

REGISTER_URL = '/api/v1/auth/register/'
LOGIN_URL = '/api/v1/auth/login/'
ME_URL = '/api/v1/auth/me/'
CHANGE_PASSWORD_URL = '/api/v1/auth/change-password/'


@pytest.mark.django_db
class TestRegister:
    def test_register_success(self, api_client):
        data = {
            'email': 'new@example.com',
            'password': 'StrongPass123',
            'password_confirm': 'StrongPass123',
        }
        resp = api_client.post(REGISTER_URL, data, format='json')
        assert resp.status_code == 201
        assert resp.data['email'] == 'new@example.com'
        assert User.objects.filter(email='new@example.com').exists()

    def test_register_duplicate_email(self, api_client, user):
        data = {
            'email': 'test@example.com',
            'password': 'StrongPass123',
            'password_confirm': 'StrongPass123',
        }
        resp = api_client.post(REGISTER_URL, data, format='json')
        assert resp.status_code == 400

    def test_register_weak_password(self, api_client):
        data = {
            'email': 'weak@example.com',
            'password': '123',
            'password_confirm': '123',
        }
        resp = api_client.post(REGISTER_URL, data, format='json')
        assert resp.status_code == 400


@pytest.mark.django_db
class TestLogin:
    def test_login_success(self, api_client, user):
        data = {'email': 'test@example.com', 'password': 'TestPass123'}
        resp = api_client.post(LOGIN_URL, data, format='json')
        assert resp.status_code == 200
        assert 'access' in resp.data
        assert 'refresh' in resp.data

    def test_login_wrong_password(self, api_client, user):
        data = {'email': 'test@example.com', 'password': 'WrongPass'}
        resp = api_client.post(LOGIN_URL, data, format='json')
        assert resp.status_code == 401


@pytest.mark.django_db
class TestMe:
    def test_me_authenticated(self, auth_client, user):
        resp = auth_client.get(ME_URL)
        assert resp.status_code == 200
        assert resp.data['email'] == user.email

    def test_me_unauthenticated(self, api_client):
        resp = api_client.get(ME_URL)
        assert resp.status_code == 401


@pytest.mark.django_db
class TestChangePassword:
    def test_change_password_success(self, auth_client, user):
        data = {
            'old_password': 'TestPass123',
            'new_password': 'NewStrongPass456',
        }
        resp = auth_client.post(CHANGE_PASSWORD_URL, data, format='json')
        assert resp.status_code == 200
        user.refresh_from_db()
        assert user.check_password('NewStrongPass456')

    def test_change_password_wrong_old(self, auth_client):
        data = {
            'old_password': 'WrongOldPass',
            'new_password': 'NewStrongPass456',
        }
        resp = auth_client.post(CHANGE_PASSWORD_URL, data, format='json')
        assert resp.status_code == 400
