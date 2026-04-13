from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='plan',
            field=models.CharField(
                choices=[('free', 'Free'), ('pro', 'Pro'), ('team', 'Team')],
                default='free',
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='plan_expires_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='brand_name',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='user',
            name='brand_logo_url',
            field=models.URLField(blank=True, default=''),
        ),
    ]
