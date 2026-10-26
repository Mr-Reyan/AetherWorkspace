from django.urls import path
from . import views
urlpatterns = [
    path("workspaces/<uuid:id>/ask/", views.AskView.as_view(), name="workspace-ask"),
    path("workspaces/<uuid:id>/requests/", views.RequestHistoryView.as_view(), name="workspace-requests"),
    # documents list/upload lives in the same app
    path("workspaces/<uuid:id>/documents/", views.DocumentListCreateView.as_view(), name="workspace-documents"),
    path("usage/", views.UsageSummaryView.as_view(), name="usage-summary"),
    path("workspaces/<uuid:id>/requests/<int:request_id>/", views.RequestDetailView.as_view(), name="workspace-request-detail"),
    path("workspaces/<uuid:id>/documents/<uuid:doc_id>/", views.DocumentDetailView.as_view(), name="workspace-document-detail"),
]