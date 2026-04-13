from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('projects', '0003_stepversion'),
    ]
    operations = [
        migrations.AddField(
            model_name='project',
            name='share_token',
            field=models.CharField(blank=True, max_length=64, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='project',
            name='is_public',
            field=models.BooleanField(default=False),
        ),
    ]
