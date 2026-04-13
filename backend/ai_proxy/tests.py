import pytest
from django.test import override_settings

DESCRIBE_URL = '/api/v1/ai/describe/'


@pytest.mark.django_db
class TestDescribeImage:
    @override_settings(ANTHROPIC_API_KEY='')
    def test_describe_no_api_key(self, auth_client):
        resp = auth_client.post(DESCRIBE_URL, {'image': 'abc'}, format='json')
        assert resp.status_code == 503

    def test_describe_no_image(self, auth_client):
        resp = auth_client.post(DESCRIBE_URL, {}, format='json')
        assert resp.status_code == 400
