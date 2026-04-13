from rest_framework import serializers

from .models import Project, Step, Tag, Webhook

# File size limits
MAX_IMAGE_SIZE = 10 * 1024 * 1024       # 10 MB
MAX_VIDEO_SIZE = 200 * 1024 * 1024      # 200 MB
MAX_IMAGE_BASE64_LEN = 14 * 1024 * 1024  # ~10 MB decoded (with base64 overhead)
MAX_VIDEO_BASE64_LEN = 267 * 1024 * 1024  # ~200 MB decoded (with base64 overhead)


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'color']


class StepSerializer(serializers.ModelSerializer):
    media_url = serializers.SerializerMethodField()

    class Meta:
        model = Step
        fields = [
            'id', 'order', 'media_type', 'media_url',
            'title', 'description', 'created_at', 'updated_at',
        ]

    def get_media_url(self, obj):
        if obj.media_file:
            request = self.context.get('request')
            url = obj.media_file.url
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        return None


class StepCreateSerializer(serializers.Serializer):
    media_type = serializers.ChoiceField(choices=Step.MEDIA_TYPE_CHOICES)
    media = serializers.FileField(write_only=True, required=False)
    media_base64 = serializers.CharField(write_only=True, required=False)
    title = serializers.CharField(max_length=500, default='', required=False)
    description = serializers.CharField(default='', required=False)
    order = serializers.IntegerField(default=0, required=False)

    def validate(self, attrs):
        media = attrs.get('media')
        media_base64 = attrs.get('media_base64')
        media_type = attrs.get('media_type')

        if not media and not media_base64:
            raise serializers.ValidationError(
                'Either "media" or "media_base64" must be provided.'
            )

        is_image = media_type == 'image'
        max_file_size = MAX_IMAGE_SIZE if is_image else MAX_VIDEO_SIZE
        max_base64_len = MAX_IMAGE_BASE64_LEN if is_image else MAX_VIDEO_BASE64_LEN
        label = 'Image' if is_image else 'Video'
        limit_mb = max_file_size // (1024 * 1024)

        # Validate file upload size
        if media and hasattr(media, 'size') and media.size > max_file_size:
            raise serializers.ValidationError(
                f'{label} file size exceeds {limit_mb} MB limit.'
            )

        # Validate base64 string length
        if media_base64 and len(media_base64) > max_base64_len:
            raise serializers.ValidationError(
                f'{label} base64 data exceeds {limit_mb} MB limit.'
            )

        return attrs


class StepUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Step
        fields = ['title', 'description', 'order']
        extra_kwargs = {
            'title': {'required': False},
            'description': {'required': False},
            'order': {'required': False},
        }


def get_thumbnail_url(obj, context):
    """Return the URL of the first image step as a project thumbnail."""
    first_image_step = obj.steps.filter(
        media_type='image',
    ).exclude(media_file='').order_by('order').first()
    if first_image_step and first_image_step.media_file:
        request = context.get('request')
        url = first_image_step.media_file.url
        if request is not None:
            return request.build_absolute_uri(url)
        return url
    return None


class ThumbnailMixin:
    """Mixin that provides get_thumbnail_url for project serializers."""

    def get_thumbnail_url(self, obj):
        return get_thumbnail_url(obj, self.context)


class ProjectListSerializer(ThumbnailMixin, serializers.ModelSerializer):
    step_count = serializers.IntegerField(read_only=True)
    thumbnail_url = serializers.SerializerMethodField()
    tags = TagSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = [
            'id', 'title', 'annotation_style', 'record_on_click_mode',
            'step_count', 'thumbnail_url', 'tags', 'created_at', 'updated_at',
        ]


class ProjectDetailSerializer(ThumbnailMixin, serializers.ModelSerializer):
    step_count = serializers.IntegerField(read_only=True)
    thumbnail_url = serializers.SerializerMethodField()
    steps = StepSerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = [
            'id', 'title', 'annotation_style', 'record_on_click_mode',
            'step_count', 'thumbnail_url', 'tags', 'steps',
            'created_at', 'updated_at',
        ]


class ProjectCreateUpdateSerializer(serializers.ModelSerializer):
    tag_ids = serializers.ListField(child=serializers.UUIDField(), required=False, write_only=True)

    class Meta:
        model = Project
        fields = ['id', 'title', 'annotation_style', 'record_on_click_mode', 'tag_ids']
        read_only_fields = ['id']


class ReorderSerializer(serializers.Serializer):
    step_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
    )


class WebhookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Webhook
        fields = ['id', 'url', 'events', 'is_active', 'secret', 'created_at']
        read_only_fields = ['id', 'secret', 'created_at']
