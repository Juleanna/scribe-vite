import base64
import uuid

from django.db.models import Count
from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Project, Step
from .serializers import (
    ProjectListSerializer,
    ProjectDetailSerializer,
    ProjectCreateUpdateSerializer,
    StepSerializer,
    StepCreateSerializer,
    StepUpdateSerializer,
    ReorderSerializer,
)


class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(owner=self.request.user)

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
        if project_count >= 100:
            from rest_framework.exceptions import Throttled
            raise Throttled(
                detail='Project limit reached. You cannot have more than 100 projects.',
            )
        serializer.save(owner=self.request.user)

    def perform_destroy(self, instance):
        # Delete media files from disk for all steps
        for step in instance.steps.all():
            if step.media_file:
                step.media_file.delete(save=False)
        instance.delete()


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

    def perform_destroy(self, instance):
        if instance.media_file:
            instance.media_file.delete(save=False)
        instance.delete()

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
