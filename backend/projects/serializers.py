from rest_framework import serializers

from .models import Project, Step


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
        if not media and not media_base64:
            raise serializers.ValidationError(
                'Either "media" or "media_base64" must be provided.'
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


class ProjectListSerializer(serializers.ModelSerializer):
    step_count = serializers.IntegerField(read_only=True)
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'title', 'annotation_style', 'record_on_click_mode',
            'step_count', 'thumbnail_url', 'created_at', 'updated_at',
        ]

    def get_thumbnail_url(self, obj):
        first_image_step = obj.steps.filter(
            media_type='image',
        ).exclude(media_file='').order_by('order').first()
        if first_image_step and first_image_step.media_file:
            request = self.context.get('request')
            url = first_image_step.media_file.url
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        return None


class ProjectDetailSerializer(serializers.ModelSerializer):
    step_count = serializers.IntegerField(read_only=True)
    thumbnail_url = serializers.SerializerMethodField()
    steps = StepSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = [
            'id', 'title', 'annotation_style', 'record_on_click_mode',
            'step_count', 'thumbnail_url', 'steps',
            'created_at', 'updated_at',
        ]

    def get_thumbnail_url(self, obj):
        first_image_step = obj.steps.filter(
            media_type='image',
        ).exclude(media_file='').order_by('order').first()
        if first_image_step and first_image_step.media_file:
            request = self.context.get('request')
            url = first_image_step.media_file.url
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        return None


class ProjectCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'title', 'annotation_style', 'record_on_click_mode']
        read_only_fields = ['id']


class ReorderSerializer(serializers.Serializer):
    step_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
    )
