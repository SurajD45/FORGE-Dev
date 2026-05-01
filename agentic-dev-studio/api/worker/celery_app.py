"""Celery app configuration"""
from celery import Celery
from api.config import get_settings
import ssl

settings = get_settings()

# SSL configuration for Upstash Redis
broker_use_ssl = {
    'ssl_cert_reqs': ssl.CERT_NONE
}

celery_app = Celery(
    "forge_worker",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=['api.worker.tasks']
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    broker_connection_retry_on_startup=True,
    broker_use_ssl=broker_use_ssl,  # ← ADD THIS
    redis_backend_use_ssl=broker_use_ssl,  # ← ADD THIS
)


# Schema validation on worker startup
from celery.signals import worker_ready

@worker_ready.connect
def on_worker_ready(**kwargs):
    """Validate database schema before accepting any tasks."""
    from api.utils.db_migrator import validate_schema_or_die
    from api.config import get_settings
    validate_schema_or_die(get_settings())