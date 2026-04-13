import base64
import secrets
import uuid

from django.conf import settings as django_settings
from django.db.models import Count
from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import Project, Step, StepVersion, Tag, Webhook
from .serializers import (
    ProjectListSerializer,
    ProjectDetailSerializer,
    ProjectCreateUpdateSerializer,
    StepSerializer,
    StepCreateSerializer,
    StepUpdateSerializer,
    ReorderSerializer,
    TagSerializer,
    WebhookSerializer,
)


def get_project_limit(user):
    limits = {'free': 5, 'pro': 100, 'team': 1000}
    return limits.get(user.plan, 5)


class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Project.objects.filter(owner=self.request.user)
        search = self.request.query_params.get('search')
        tag = self.request.query_params.get('tag')
        if search:
            qs = qs.filter(title__icontains=search)
        if tag:
            qs = qs.filter(tags__id=tag)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ProjectListSerializer
        if self.action == 'retrieve':
            return ProjectDetailSerializer
        return ProjectCreateUpdateSerializer

    def get_queryset_for_list(self):
        return self.get_queryset().annotate(step_count=Count('steps')).order_by('-updated_at')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset_for_list())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Annotate step_count on the instance for the serializer
        instance.step_count = instance.steps.count()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_create(self, serializer):
        project_count = Project.objects.filter(owner=self.request.user).count()
        limit = get_project_limit(self.request.user)
        if project_count >= limit:
            from rest_framework.exceptions import Throttled
            raise Throttled(
                detail=f'Project limit reached. You cannot have more than {limit} projects.',
            )
        tag_ids = serializer.validated_data.pop('tag_ids', None)
        project = serializer.save(owner=self.request.user)
        if tag_ids:
            tags = Tag.objects.filter(id__in=tag_ids, owner=self.request.user)
            project.tags.set(tags)

    def perform_update(self, serializer):
        tag_ids = serializer.validated_data.pop('tag_ids', None)
        project = serializer.save()
        if tag_ids is not None:
            tags = Tag.objects.filter(id__in=tag_ids, owner=self.request.user)
            project.tags.set(tags)

    def perform_destroy(self, instance):
        # Delete media files from disk for all steps
        for step in instance.steps.all():
            if step.media_file:
                step.media_file.delete(save=False)
        instance.delete()

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """POST /projects/<id>/duplicate/ — створити копію проекту."""
        original = self.get_object()
        new_project = Project.objects.create(
            owner=request.user,
            title=f"{original.title} (копія)",
            annotation_style=original.annotation_style,
            record_on_click_mode=original.record_on_click_mode,
        )
        for step in original.steps.order_by('order'):
            new_step = Step.objects.create(
                project=new_project,
                order=step.order,
                media_type=step.media_type,
                title=step.title,
                description=step.description,
            )
            if step.media_file:
                new_step.media_file.save(
                    step.media_file.name.split('/')[-1],
                    ContentFile(step.media_file.read()),
                    save=True,
                )
        serializer = ProjectDetailSerializer(new_project, context={'request': request})
        new_project.step_count = new_project.steps.count()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='bulk_delete')
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'detail': 'No ids provided.'}, status=status.HTTP_400_BAD_REQUEST)
        projects = Project.objects.filter(id__in=ids, owner=request.user)
        for project in projects:
            for step in project.steps.all():
                if step.media_file:
                    step.media_file.delete(save=False)
            project.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def share(self, request, pk=None):
        project = self.get_object()
        if not project.share_token:
            project.share_token = secrets.token_urlsafe(32)
            project.is_public = True
            project.save(update_fields=['share_token', 'is_public'])
        url = f"{django_settings.FRONTEND_URL}/shared/{project.share_token}"
        return Response({'share_url': url, 'share_token': project.share_token})


class StepViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_project(self):
        project = get_object_or_404(
            Project,
            pk=self.kwargs['project_id'],
            owner=self.request.user,
        )
        return project

    def get_queryset(self):
        return Step.objects.filter(
            project_id=self.kwargs['project_id'],
            project__owner=self.request.user,
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return StepCreateSerializer
        if self.action in ('update', 'partial_update'):
            return StepUpdateSerializer
        return StepSerializer

    def create(self, request, *args, **kwargs):
        project = self.get_project()

        step_count = Step.objects.filter(project=project).count()
        if step_count >= 500:
            return Response(
                {'detail': 'Step limit reached. A project cannot have more than 500 steps.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = StepCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated = serializer.validated_data
        media_type = validated['media_type']
        title = validated.get('title', '')
        description = validated.get('description', '')
        order = validated.get('order', 0)

        step = Step(
            project=project,
            media_type=media_type,
            title=title,
            description=description,
            order=order,
        )

        # Handle base64 media
        media_base64 = validated.get('media_base64')
        if media_base64 and ',' in media_base64:
            header, data = media_base64.split(',', 1)
            file_data = base64.b64decode(data)
            ext = 'png' if media_type == 'image' else 'webm'
            media_file = ContentFile(file_data, name=f'{uuid.uuid4()}.{ext}')
            step.media_file = media_file
        elif validated.get('media'):
            step.media_file = validated['media']

        step.save()

        output_serializer = StepSerializer(step, context={'request': request})
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        instance = serializer.instance
        # Save current state as a version before updating
        StepVersion.objects.create(
            step=instance,
            title=instance.title,
            description=instance.description,
        )
        serializer.save()

    def perform_destroy(self, instance):
        if instance.media_file:
            instance.media_file.delete(save=False)
        instance.delete()

    @action(detail=True, methods=['get'])
    def versions(self, request, project_id=None, pk=None):
        step = self.get_object()
        versions = step.versions.all()[:20]
        data = [{'id': v.id, 'title': v.title, 'description': v.description, 'created_at': v.created_at} for v in versions]
        return Response(data)

    @action(detail=False, methods=['post'])
    def reorder(self, request, *args, **kwargs):
        project = self.get_project()
        serializer = ReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        step_ids = serializer.validated_data['step_ids']
        steps = Step.objects.filter(project=project)

        # Validate that all provided IDs belong to this project
        existing_ids = set(steps.values_list('id', flat=True))
        provided_ids = set(step_ids)
        if provided_ids != existing_ids:
            return Response(
                {'detail': 'Provided step IDs do not match project steps.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update order based on position in the list
        for index, step_id in enumerate(step_ids):
            Step.objects.filter(pk=step_id, project=project).update(order=index)

        updated_steps = steps.order_by('order')
        output_serializer = StepSerializer(
            updated_steps, many=True, context={'request': request},
        )
        return Response(output_serializer.data)


class TagViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TagSerializer
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        return Tag.objects.filter(owner=self.request.user).order_by('name')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class WebhookViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = WebhookSerializer

    def get_queryset(self):
        return Webhook.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class SharedProjectView(generics.RetrieveAPIView):
    permission_classes = (AllowAny,)
    serializer_class = ProjectDetailSerializer

    def get_object(self):
        return get_object_or_404(Project, share_token=self.kwargs['token'], is_public=True)
