import base64
import pytest
from django.contrib.auth import get_user_model

from projects.models import Project, Step

User = get_user_model()

PROJECTS_URL = '/api/v1/projects/'


@pytest.fixture
def project(user):
    return Project.objects.create(owner=user, title='Test Project')


@pytest.fixture
def step(project):
    return Step.objects.create(
        project=project,
        media_type='image',
        title='Step 1',
        order=0,
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(email='other@example.com', password='OtherPass123')


@pytest.fixture
def other_auth_client(other_user):
    from rest_framework.test import APIClient
    client = APIClient()
    client.force_authenticate(other_user)
    return client


@pytest.mark.django_db
class TestProjectCRUD:
    def test_create_project(self, auth_client):
        data = {'title': 'New Project'}
        resp = auth_client.post(PROJECTS_URL, data, format='json')
        assert resp.status_code == 201
        assert resp.data['title'] == 'New Project'

    def test_list_projects(self, auth_client, project):
        resp = auth_client.get(PROJECTS_URL)
        assert resp.status_code == 200
        assert 'results' in resp.data

    def test_get_project_detail(self, auth_client, project):
        url = f'{PROJECTS_URL}{project.id}/'
        resp = auth_client.get(url)
        assert resp.status_code == 200
        assert 'steps' in resp.data

    def test_update_project_title(self, auth_client, project):
        url = f'{PROJECTS_URL}{project.id}/'
        resp = auth_client.patch(url, {'title': 'Updated'}, format='json')
        assert resp.status_code == 200
        assert resp.data['title'] == 'Updated'

    def test_delete_project(self, auth_client, project):
        url = f'{PROJECTS_URL}{project.id}/'
        resp = auth_client.delete(url)
        assert resp.status_code == 204
        assert not Project.objects.filter(id=project.id).exists()

    def test_project_belongs_to_user(self, other_auth_client, project):
        """Інший користувач не бачить чужих проектів."""
        resp = other_auth_client.get(PROJECTS_URL)
        assert resp.status_code == 200
        # other_user should see zero projects
        assert resp.data['results'] == []

        # Direct access should return 404
        url = f'{PROJECTS_URL}{project.id}/'
        resp = other_auth_client.get(url)
        assert resp.status_code == 404


@pytest.mark.django_db
class TestSteps:
    def _steps_url(self, project):
        return f'{PROJECTS_URL}{project.id}/steps/'

    def test_create_step_with_base64(self, auth_client, project):
        # Мінімальний 1x1 PNG у base64
        png_bytes = base64.b64encode(
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
            b'\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00'
            b'\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00'
            b'\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        ).decode()
        data = {
            'media_type': 'image',
            'media_base64': f'data:image/png;base64,{png_bytes}',
            'title': 'Screenshot',
        }
        resp = auth_client.post(self._steps_url(project), data, format='json')
        assert resp.status_code == 201
        assert resp.data['title'] == 'Screenshot'

    def test_delete_step(self, auth_client, project, step):
        url = f'{self._steps_url(project)}{step.id}/'
        resp = auth_client.delete(url)
        assert resp.status_code == 204
        assert not Step.objects.filter(id=step.id).exists()

    def test_reorder_steps(self, auth_client, project):
        s1 = Step.objects.create(project=project, media_type='image', order=0)
        s2 = Step.objects.create(project=project, media_type='image', order=1)
        url = f'{self._steps_url(project)}reorder/'
        data = {'step_ids': [str(s2.id), str(s1.id)]}
        resp = auth_client.post(url, data, format='json')
        assert resp.status_code == 200
        s1.refresh_from_db()
        s2.refresh_from_db()
        assert s2.order < s1.order


@pytest.mark.django_db
class TestProjectQuota:
    def test_project_quota(self, auth_client, user):
        """Створити 100 проектів, 101-й повинен бути відхилений (429)."""
        Project.objects.bulk_create([
            Project(owner=user, title=f'P{i}')
            for i in range(100)
        ])
        resp = auth_client.post(PROJECTS_URL, {'title': 'Over limit'}, format='json')
        assert resp.status_code == 429
