import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()
REGISTER = "/api/v1/auth/register/"
LOGIN = "/api/v1/auth/login/"
LOGOUT = "/api/v1/auth/logout/"
ME = "/api/v1/auth/me/"


@pytest.mark.django_db
class TestRegister:
    def test_positive_creates_user_with_member_role(self):
        r = APIClient().post(REGISTER, {"username": "khalid", "password": "Str0ng!pass9"})
        assert r.status_code == 201
        assert r.data["username"] == "khalid"
        u = User.objects.get(username="khalid")
        assert u.role == User.Role.MEMBER
        assert u.check_password("Str0ng!pass9")

    def test_negative_short_password(self):
        r = APIClient().post(REGISTER, {"username": "khalid", "password": "short"})
        assert r.status_code == 400
        assert "password" in r.data

    def test_negative_duplicate_username_case_insensitive(self):
        User.objects.create_user(username="Khalid", password="Str0ng!pass9")
        r = APIClient().post(REGISTER, {"username": "khalid", "password": "Str0ng!pass9"})
        assert r.status_code == 400
        assert "username" in r.data

    def test_negative_missing_fields(self):
        r = APIClient().post(REGISTER, {})
        assert r.status_code == 400
        assert "username" in r.data and "password" in r.data

    def test_negative_invalid_username_characters(self):
        r = APIClient().post(REGISTER, {"username": "kha lid!", "password": "Str0ng!pass9"})
        assert r.status_code == 400


@pytest.mark.django_db
class TestLogin:
    def setup_method(self):
        self.user = User.objects.create_user(username="khalid", password="Str0ng!pass9")

    def test_positive_returns_access_and_refresh(self):
        r = APIClient().post(LOGIN, {"username": "khalid", "password": "Str0ng!pass9"})
        assert r.status_code == 200
        assert "access" in r.data and "refresh" in r.data

    def test_negative_wrong_password(self):
        r = APIClient().post(LOGIN, {"username": "khalid", "password": "wrong"})
        assert r.status_code == 401

    def test_negative_nonexistent_user(self):
        r = APIClient().post(LOGIN, {"username": "nobody", "password": "x"})
        assert r.status_code == 401


@pytest.mark.django_db
class TestMe:
    def test_requires_auth(self):
        assert APIClient().get(ME).status_code == 401

    def test_returns_current_user(self):
        u = User.objects.create_user(username="sara", password="Str0ng!pass9")
        c = APIClient(); c.force_authenticate(u)
        r = c.get(ME)
        assert r.status_code == 200
        assert r.data["username"] == "sara"


@pytest.mark.django_db
class TestLogout:
    def test_positive_blacklists_refresh(self):
        u = User.objects.create_user(username="khalid", password="Str0ng!pass9")
        c = APIClient()
        tokens = c.post(LOGIN, {"username": "khalid", "password": "Str0ng!pass9"}).data
        c.force_authenticate(u)
        r = c.post(LOGOUT, {"refresh": tokens["refresh"]})
        assert r.status_code == 204
        # Same refresh token cannot be used again
        r2 = APIClient().post("/api/v1/auth/refresh/", {"refresh": tokens["refresh"]})
        assert r2.status_code == 401

    def test_negative_missing_refresh(self):
        u = User.objects.create_user(username="khalid", password="Str0ng!pass9")
        c = APIClient(); c.force_authenticate(u)
        r = c.post(LOGOUT, {})
        assert r.status_code == 400

    def test_negative_invalid_refresh(self):
        u = User.objects.create_user(username="khalid", password="Str0ng!pass9")
        c = APIClient(); c.force_authenticate(u)
        r = c.post(LOGOUT, {"refresh": "garbage"})
        assert r.status_code == 400

    def test_requires_auth(self):
        assert APIClient().post(LOGOUT, {"refresh": "x"}).status_code == 401