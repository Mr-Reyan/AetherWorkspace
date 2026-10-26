import logging
from datetime import timedelta
from django.conf import settings
from django.db.models import Sum
from django.utils import timezone

from ..models import UsageEvent

logger = logging.getLogger(__name__)
import os
from dotenv import load_dotenv
load_dotenv()
WINDOW_DAYS = int(os.getenv("WINDOW_DAYS", 30))

def get_usage_summary(user) -> dict:
    since = timezone.now() - timedelta(days=WINDOW_DAYS)
    qs = UsageEvent.objects.filter(user=user, occurred_at__gte=since)
    used = int(qs.aggregate(total=Sum("tokens"))["total"] or 0)
    limit = settings.USAGE_TOKEN_LIMIT_30D
    first = qs.order_by("occurred_at").values_list("occurred_at", flat=True).first()
    resets_at = (first + timedelta(days=WINDOW_DAYS)) if first else (timezone.now() + timedelta(days=WINDOW_DAYS))
    return {
        "used_tokens": used,
        "limit_tokens": limit,
        "remaining_tokens": max(0, limit - used),
        "window_days": WINDOW_DAYS,
        "resets_at": resets_at.isoformat(),
        "is_exceeded": used >= limit,
    }

def check_usage_limit(user) -> None:
    """
    Raises UsageLimitExceeded if the user is over the rolling-window limit.
    """
    summary = get_usage_summary(user)
    if summary["is_exceeded"]:
        raise UsageLimitExceeded(summary)


class UsageLimitExceeded(Exception):
    def __init__(self, summary: dict):
        self.summary = summary
        super().__init__("Usage limit exceeded")