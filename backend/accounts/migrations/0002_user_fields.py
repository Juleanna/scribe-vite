from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='is_email_verified',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='email_verification_token',
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
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
