from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    class Role(models.TextChoices):
        MEMBER = "member", "Member"
        
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.MEMBER)
