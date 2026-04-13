import anthropic
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from scribe.throttles import AIRateThrottle


class DescribeImageView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [AIRateThrottle]

    def post(self, request):
        api_key = settings.ANTHROPIC_API_KEY
        if not api_key:
            return Response(
                {'error': 'ANTHROPIC_API_KEY не налаштовано на сервері'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        image_base64 = request.data.get('image')
        previous_image_base64 = request.data.get('previous_image')

        if not image_base64:
            return Response(
                {'error': 'Поле "image" є обов\'язковим (base64 PNG)'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Strip data URL prefix if present
        if ',' in image_base64:
            image_base64 = image_base64.split(',', 1)[1]
        if previous_image_base64 and ',' in previous_image_base64:
            previous_image_base64 = previous_image_base64.split(',', 1)[1]

        content = []
        if previous_image_base64:
            content.append({
                'type': 'image',
                'source': {'type': 'base64', 'media_type': 'image/png', 'data': previous_image_base64},
            })
        content.append({
            'type': 'image',
            'source': {'type': 'base64', 'media_type': 'image/png', 'data': image_base64},
        })
        content.append({
            'type': 'text',
            'text': 'Опиши коротко, що зображено на скріншоті.',
        })

        try:
            client = anthropic.Anthropic(api_key=api_key)
            message = client.messages.create(
                model='claude-sonnet-4-20250514',
                max_tokens=200,
                messages=[{'role': 'user', 'content': content}],
            )
            text = message.content[0].text if message.content else ''
            return Response({'description': text.strip()})
        except anthropic.APIError as e:
            return Response(
                {'error': f'Помилка Anthropic API: {e}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
