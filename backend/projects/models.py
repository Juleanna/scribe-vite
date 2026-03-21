import uuid

from django.conf import settings
from django.db import models


def media_upload_path(instance, filename):
    """screenshots/<project_id>/<step_id>.ext or videos/<project_id>/<step_id>.ext"""
    folder = 'screenshots' if instance.media_type == 'image' else 'videos'
    ext = filename.rsplit('.', 1)[-1] if '.' in filename else ('png' if instance.media_type == 'image' else 'webm')
    return f'{folder}/{instance.project_id}/{instance.id}.{ext}'


class Project(models.Model):
    ANNOTATION_STYLE_CHOICES = [
        ('arrow', 'Arrow'),
        ('box', 'Box'),
        ('both', 'Both'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='projects',
    )
    title = models.CharField(max_length=500, default='Нова інструкція')
    annotation_style = models.CharField(
        max_length=10,
        default='both',
        choices=ANNOTATION_STYLE_CHOICES,
    )
    record_on_click_mode = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.title


class Step(models.Model):
    MEDIA_TYPE_CHOICES = [
        ('image', 'Image'),
        ('video', 'Video'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='steps',
    )
    order = models.PositiveIntegerField(default=0)
    media_type = models.CharField(max_length=5, choices=MEDIA_TYPE_CHOICES)
    media_file = models.FileField(upload_to=media_upload_path, blank=True)
    title = models.CharField(max_length=500, default='')
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f'Step {self.order}: {self.title}'
