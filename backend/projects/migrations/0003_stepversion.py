import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('projects', '0002_project_is_template'),
    ]
    operations = [
        migrations.CreateModel(
            name='StepVersion',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(default='', max_length=500)),
                ('description', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('step', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='versions', to='projects.step')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
