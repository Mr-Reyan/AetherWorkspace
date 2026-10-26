from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from workspace.models import Workspace, WorkspaceMember
from documents.models import Document, DocumentChunk, DocumentStatus

User = get_user_model()


def make_user(username="alice", password="Str0ngPass!23"):
    return User.objects.create_user(username=username, password=password)


def make_workspace(owner, name="Alpha"):
    ws = Workspace.objects.create(name=name, created_by=owner)
    WorkspaceMember.objects.create(workspace=ws, user=owner)
    return ws


def add_member(ws, user):
    return WorkspaceMember.objects.create(workspace=ws, user=user)


def auth_client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def make_document(workspace, owner, filename="doc.pdf", mime="application/pdf",
                  size=100, storage_key="documents/x.pdf",
                  status=DocumentStatus.READY):
    return Document.objects.create(
        workspace=workspace, owner=owner, filename=filename, mime=mime,
        size_bytes=size, storage_key=storage_key, status=status,
    )


def make_chunk(document, content="Some grounded content.", embedding=None, index=0):
    if embedding is None:
        embedding = [0.01] * 1024
    return DocumentChunk.objects.create(
        document=document, chunk_index=index, content=content, embedding=embedding,
    )