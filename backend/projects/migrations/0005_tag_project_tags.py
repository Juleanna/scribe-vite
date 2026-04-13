import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('projects', '0004_project_share'),
    ]

    operations = [
        migrations.CreateModel(
            name='Tag',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=50)),
                ('color', models.CharField(default='#6366f1', max_length=7)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tags', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('name', 'owner')},
            },
        ),
        migrations.AddField(
            model_name='project',
            name='tags',
            field=models.ManyToManyField(blank=True, related_name='projects', to='projects.tag'),
        ),
    ]
