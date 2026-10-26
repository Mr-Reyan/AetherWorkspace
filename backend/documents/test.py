import os, sys, django

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend folder
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from documents.models import Request
r = Request.objects.latest("id")
print(r.workspace_id, r.user_id, r.status, r.question)

# from django.contrib.auth import get_user_model
# from documents.models import Document
# from documents.services.retrieval import retrieve_context

# USERNAME = "reyan"
# WS_ID = "bc8766b6-0b50-40f1-9d6e-d9487b8ec62a"
# QUERY = "what are the projects for the second weekend assignment"

# user = get_user_model().objects.get(username=USERNAME)
# for d in Document.objects.filter(workspace_id=WS_ID):
#     print(d.filename, d.status, d.chunks.count(), d.owner_id, (d.error or "")[:150])

# top, raw, _ = retrieve_context(workspace_id=WS_ID, user_id=user.id, query=QUERY)
# for c in raw:
#     print(f'{c["similarity"]:.3f}', c["document_name"], repr(c["content"][:80]))