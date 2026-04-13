from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ProjectViewSet, StepViewSet, SharedProjectView, TagViewSet, WebhookViewSet

router = DefaultRouter()
router.register('projects', ProjectViewSet, basename='project')
router.register('tags', TagViewSet, basename='tag')
router.register('webhooks', WebhookViewSet, basename='webhook')

urlpatterns = [
    # Nested step endpoints under projects
    path(
        'projects/<uuid:project_id>/steps/',
        StepViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='project-steps-list',
    ),
    path(
        'projects/<uuid:project_id>/steps/reorder/',
        StepViewSet.as_view({'post': 'reorder'}),
        name='project-steps-reorder',
    ),
    path(
        'projects/<uuid:project_id>/steps/<uuid:pk>/',
        StepViewSet.as_view({
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update',
            'delete': 'destroy',
        }),
        name='project-steps-detail',
    ),
    path(
        'projects/<uuid:project_id>/steps/<uuid:pk>/versions/',
        StepViewSet.as_view({'get': 'versions'}),
        name='project-steps-versions',
    ),
    path(
        'shared/<str:token>/',
        SharedProjectView.as_view(),
        name='shared-project',
    ),
] + router.urls
