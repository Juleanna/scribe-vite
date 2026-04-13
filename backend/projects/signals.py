import hashlib
import hmac
import json
import threading

import requests as http_requests
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Project, Step, Webhook


def fire_webhooks(user, event, payload):
    """Send webhook notifications in background thread."""
    webhooks = Webhook.objects.filter(owner=user, is_active=True)
    for wh in webhooks:
        if event in wh.events or '*' in wh.events:
            def send(url, secret, data):
                body = json.dumps(data)
                sig = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
                try:
                    http_requests.post(url, json=data, headers={
                        'X-Scribe-Event': event,
                        'X-Scribe-Signature': sig,
                    }, timeout=5)
                except Exception:
                    pass
            threading.Thread(target=send, args=(wh.url, wh.secret, payload), daemon=True).start()


@receiver(post_save, sender=Project)
def project_saved(sender, instance, created, **kwargs):
    event = 'project.created' if created else 'project.updated'
    fire_webhooks(instance.owner, event, {
        'event': event,
        'project_id': str(instance.id),
        'title': instance.title,
    })


@receiver(post_save, sender=Step)
def step_saved(sender, instance, created, **kwargs):
    if created:
        fire_webhooks(instance.project.owner, 'step.created', {
            'event': 'step.created',
            'project_id': str(instance.project_id),
            'step_id': str(instance.id),
            'title': instance.title,
        })
