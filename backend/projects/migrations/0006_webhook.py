import secrets
import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('projects', '0005_tag_project_tags'),
    ]

    operations = [
        migrations.CreateModel(
            name='Webhook',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('url', models.URLField()),
                ('events', models.JSONField(default=list)),
                ('is_active', models.BooleanField(default=True)),
                ('secret', models.CharField(default='', max_length=64)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='webhooks', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
