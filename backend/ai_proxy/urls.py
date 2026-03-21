from django.urls import path

from .views import DescribeImageView

urlpatterns = [
    path('describe/', DescribeImageView.as_view(), name='ai-describe'),
]
