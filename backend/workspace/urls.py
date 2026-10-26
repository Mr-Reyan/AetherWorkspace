from django.urls import path
from . import views

urlpatterns = [
    path("workspaces/", views.WorkspaceListCreateView.as_view(), name="workspace-list-create"),
    path("workspaces/<uuid:id>/", views.WorkspaceDetailView.as_view(), name="workspace-detail"),
    path("workspaces/<uuid:id>/invites/", views.WorkspaceInviteCreateView.as_view(), name="workspace-invite-create"),
    path("workspaces/join/<str:token>/", views.JoinWorkspaceView.as_view(), name="workspace-join"),
]