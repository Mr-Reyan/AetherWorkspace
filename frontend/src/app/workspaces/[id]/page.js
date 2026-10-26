"use client";

import React, { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inviteCreateSchema, askQuestionSchema } from "@/lib/validations";
import { workspaceApi, documentsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  Sparkles,
  Users,
  FileText,
  Upload,
  Trash2,
  Send,
  Copy,
  Check,
  Calendar,
  Clock,
  Shield,
  ArrowLeft,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Bot,
  User,
  Info,
} from "lucide-react";

export default function WorkspaceDetailPage({ params }) {
  const unwrappedParams = use(params);
  const workspaceId = unwrappedParams.id;
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState("invites"); // 'invites', 'ai', 'documents'
  const [workspace, setWorkspace] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successToast, setSuccessToast] = useState("");

  // Invites state
  const [createdInvites, setCreatedInvites] = useState([]);
  const [copiedToken, setCopiedToken] = useState(null);

  // Document upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Ask AI state
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState("");
  const [excludedDocs, setExcludedDocs] = useState([]);

  // Ref to automatically scroll to bottom on new message
  const chatEndRef = useRef(null);

  // Only documents uploaded by the current user are searchable by their AI Assistant
  const userUploadedDocs = documents.filter(
    (doc) =>
      doc.owner_id === user?.id ||
      doc.uploaded_by === user?.username ||
      doc.owner_username === user?.username
  );

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeTab === "ai") {
      scrollToBottom();
    }
  }, [chatHistory, activeTab]);

  // Invite form
  const {
    register: registerInvite,
    handleSubmit: handleInviteSubmit,
    setValue: setInviteValue,
    reset: resetInviteForm,
    formState: { errors: inviteErrors, isSubmitting: isCreatingInvite },
  } = useForm({
    resolver: zodResolver(inviteCreateSchema),
    defaultValues: {
      expires_at: "",
      max_uses: 1,
    },
  });

  // Ask form
  const {
    register: registerAsk,
    handleSubmit: handleAskSubmit,
    reset: resetAskForm,
    formState: { errors: askErrors },
  } = useForm({
    resolver: zodResolver(askQuestionSchema),
    defaultValues: { question: "" },
  });

  // Redirect if unauthenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Load workspace details & data
  const loadWorkspaceData = async () => {
    setLoading(true);
    setError("");
    try {
      const [ws, docs, history] = await Promise.all([
        workspaceApi.get(workspaceId),
        documentsApi.list(workspaceId).catch(() => []),
        documentsApi.requests(workspaceId).catch(() => []),
      ]);

      setWorkspace(ws);
      setDocuments(docs);
      // History is returned newest-first from backend; reverse to display chronologically
      setChatHistory(Array.isArray(history) ? history.slice().reverse() : []);
    } catch (err) {
      console.error("Error loading workspace data:", err);
      setError(err?.data?.detail || err?.message || "Failed to load workspace data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && workspaceId) {
      loadWorkspaceData();
    }
  }, [isAuthenticated, workspaceId]);

  // Helper to quickly fill invite expiry
  const setQuickExpiry = (days) => {
    const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    // Format YYYY-MM-DDTHH:mm
    const iso = d.toISOString().slice(0, 16);
    setInviteValue("expires_at", iso, { shouldValidate: true });
  };

  // Submit invite
  const onCreateInvite = async (data) => {
    try {
      const invite = await workspaceApi.createInvite(workspaceId, {
        expires_at: data.expires_at || null,
        max_uses: data.max_uses,
      });

      setCreatedInvites((prev) => [invite, ...prev]);
      resetInviteForm();
      setSuccessToast("Invite link generated successfully!");
      setTimeout(() => setSuccessToast(""), 4000);
    } catch (err) {
      console.error("Create invite error:", err);
      const detail =
        err?.data?.detail?.[0] ||
        err?.data?.detail ||
        err?.message ||
        "Failed to create invite.";
      setError(detail);
    }
  };

  // Handle document upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check extension
    const allowed = [".pdf", ".txt"];
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setUploadError("Only PDF and TXT files are supported.");
      return;
    }

    setUploading(true);
    setUploadError("");
    try {
      const newDoc = await documentsApi.upload(workspaceId, file);
      setDocuments((prev) => [newDoc, ...prev]);
      setSuccessToast(`Document "${file.name}" uploaded and chunked!`);
      setTimeout(() => setSuccessToast(""), 4000);
      e.target.value = "";
    } catch (err) {
      console.error("Upload error:", err);
      const detail =
        err?.data?.file?.[0] || err?.data?.detail || err?.message || "Failed to upload file.";
      setUploadError(detail);
    } finally {
      setUploading(false);
    }
  };

  // Handle document deletion
  const handleDeleteDocument = async (docId, filename) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;

    try {
      await documentsApi.delete(workspaceId, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setSuccessToast(`Deleted "${filename}".`);
      setTimeout(() => setSuccessToast(""), 4000);
    } catch (err) {
      console.error("Delete doc error:", err);
      setError(err?.data?.detail || err?.message || "Failed to delete document.");
    }
  };

  // Ask AI Q&A
  const onAskQuestion = async (data) => {
    setAsking(true);
    setAskError("");
    try {
      const response = await documentsApi.ask(workspaceId, {
        question: data.question,
        excluded_document_ids: excludedDocs,
      });

      // Append new message under the last message sent
      setChatHistory((prev) => [
        ...prev,
        {
          id: response.request_id,
          question: data.question,
          answer: response.answer,
          status: response.status,
          citations: response.citations || [],
          tokens_in: response.tokens_in,
          tokens_out: response.tokens_out,
          created_at: new Date().toISOString(),
        },
      ]);
      resetAskForm();
    } catch (err) {
      console.error("Ask question error:", err);
      const detail =
        err?.data?.detail || err?.data?.question?.[0] || err?.message || "Failed to generate answer.";
      setAskError(detail);
    } finally {
      setAsking(false);
    }
  };

  const copyToClipboard = (text, tokenKey) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(tokenKey);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error && !workspace) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <h2 className="mt-4 text-xl font-bold text-white">Error Accessing Workspace</h2>
        <p className="mt-2 text-sm text-slate-400">{error}</p>
        <Link
          href="/workspaces"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Workspaces
        </Link>
      </div>
    );
  }

  const isOwner = workspace?.role === "owner";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button & Toast */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/workspaces"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to all workspaces
        </Link>

        {successToast && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>{successToast}</span>
          </div>
        )}
      </div>

      {/* Workspace Header */}
      <div className="glass-card rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {workspace?.name}
              </h1>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isOwner
                    ? "border border-purple-500/30 bg-purple-500/10 text-purple-300"
                    : "border border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                }`}
              >
                <Shield className="h-3 w-3" />
                {isOwner ? "Owner" : "Member"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Created {new Date(workspace?.created_at).toLocaleDateString()} by{" "}
              <strong className="text-slate-300">{workspace?.created_by_username || "You"}</strong> •{" "}
              {documents.length} {documents.length === 1 ? "document" : "documents"} loaded
            </p>
          </div>

          {/* Tab Navigation Controls */}
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/80 p-1">
            <button
              onClick={() => setActiveTab("invites")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === "invites"
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Invites & Team
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === "ai"
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Assistant
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === "documents"
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Documents ({documents.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="mt-8">
        {/* TAB 1: INVITES & TEAM */}
        {activeTab === "invites" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left: Create Invite Card (Only for Owner) */}
            <div className="lg:col-span-1">
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  <Users className="h-4 w-4" /> Workspace Membership
                </div>
                <h2 className="mt-1 text-lg font-bold text-white">Generate Invite Link</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Create shareable invite links with an optional custom expiration date and maximum
                  redemption limit.
                </p>

                {!isOwner ? (
                  <div className="mt-6 rounded-xl border border-white/5 bg-slate-900/60 p-4 text-xs text-slate-400">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span>
                        Only the workspace owner (
                        <strong className="text-white">{workspace?.created_by_username}</strong>) can
                        generate invites for this workspace.
                      </span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleInviteSubmit(onCreateInvite)} className="mt-6 space-y-4">
                    {/* Expiration date & time */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                        Expiration Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        {...registerInvite("expires_at")}
                        className={`w-full rounded-xl border bg-slate-900/80 px-3.5 py-2.5 text-xs text-white outline-none transition-all ${
                          inviteErrors.expires_at
                            ? "border-red-500/50 focus:border-red-500"
                            : "border-white/10 focus:border-indigo-500"
                        }`}
                      />
                      {inviteErrors.expires_at && (
                        <p className="mt-1 text-xs text-red-400">
                          {inviteErrors.expires_at.message}
                        </p>
                      )}

                      {/* Quick helpers */}
                      <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                        <span className="text-slate-500">Quick set:</span>
                        <button
                          type="button"
                          onClick={() => setQuickExpiry(1)}
                          className="rounded bg-white/5 px-2 py-0.5 text-slate-300 hover:bg-white/10 hover:text-white"
                        >
                          24h
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickExpiry(7)}
                          className="rounded bg-white/5 px-2 py-0.5 text-slate-300 hover:bg-white/10 hover:text-white"
                        >
                          7 days
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickExpiry(30)}
                          className="rounded bg-white/5 px-2 py-0.5 text-slate-300 hover:bg-white/10 hover:text-white"
                        >
                          30 days
                        </button>
                      </div>
                    </div>

                    {/* Max Uses */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider">
                          Maximum Uses (1 - 100)
                        </label>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        {...registerInvite("max_uses")}
                        className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                      />
                      {inviteErrors.max_uses && (
                        <p className="mt-1 text-xs text-red-400">
                          {inviteErrors.max_uses.message}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isCreatingInvite}
                      className="glow-btn flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50"
                    >
                      {isCreatingInvite ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Users className="h-4 w-4" />
                          Create Invite Link
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Right: Active/Generated Invites List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-base font-bold text-white">Active Generated Invites</h3>
                    <p className="text-xs text-slate-400">
                      Share these URLs or tokens with users you want to invite to this workspace.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                    {createdInvites.length} Generated
                  </span>
                </div>

                {createdInvites.length === 0 ? (
                  <div className="py-12 text-center">
                    <Clock className="mx-auto h-10 w-10 text-slate-600" />
                    <p className="mt-3 text-sm text-slate-400">
                      No invites created in this session yet.
                    </p>
                    <p className="text-xs text-slate-500">
                      Use the form on the left to generate an invite token with an expiration date.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {createdInvites.map((inv) => {
                      // Build frontend invite link
                      const frontendUrl =
                        typeof window !== "undefined"
                          ? `${window.location.origin}/invite/${inv.token}`
                          : `/invite/${inv.token}`;

                      return (
                        <div
                          key={inv.id || inv.token}
                          className="rounded-xl border border-white/5 bg-slate-900/70 p-4 transition-all hover:border-indigo-500/30"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="truncate max-w-md">
                              <div className="flex items-center gap-2">
                                <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-[11px] text-indigo-300">
                                  Token: {inv.token.slice(0, 12)}...
                                </span>
                                <span className="text-xs text-slate-400">
                                  Uses: {inv.uses} / {inv.max_uses}
                                </span>
                              </div>
                              <p className="mt-1 truncate font-mono text-xs text-cyan-300">
                                {frontendUrl}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => copyToClipboard(frontendUrl, inv.token)}
                                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                              >
                                {copiedToken === inv.token ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Copy URL</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-500 border-t border-white/5 pt-2">
                            <span>
                              Expires:{" "}
                              <strong className="text-slate-400">
                                {inv.expires_at
                                  ? new Date(inv.expires_at).toLocaleString()
                                  : "Never (Default)"}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>Created: {new Date(inv.created_at).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AI ASSISTANT / CHAT */}
        {activeTab === "ai" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left: Chat history & document filter */}
            <div className="lg:col-span-1 space-y-4">
              {/* Document filter for Grounding */}
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Your Grounding Documents ({userUploadedDocs.length})
                  </h3>
                  <span className="text-[10px] text-cyan-400 font-mono">Personal</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Uncheck any document to exclude it from your AI answers. Only documents uploaded by you are used by your assistant.
                </p>

                {userUploadedDocs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-slate-900/40 p-4 text-center">
                    <FileText className="mx-auto h-6 w-6 text-slate-500 mb-1.5" />
                    <p className="text-xs font-medium text-slate-300">
                      No personal documents uploaded
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Documents uploaded by others are visible in the Documents tab, but AI retrieval only searches your own files.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("documents")}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/30 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-600/50"
                    >
                      <Upload className="h-3 w-3" /> Upload Document
                    </button>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {userUploadedDocs.map((doc) => {
                      const isExcluded = excludedDocs.includes(doc.id);
                      return (
                        <label
                          key={doc.id}
                          className="flex items-center gap-2 rounded-lg border border-white/5 bg-slate-900/50 p-2 text-xs text-slate-300 hover:bg-slate-900 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={!isExcluded}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setExcludedDocs((prev) => prev.filter((id) => id !== doc.id));
                              } else {
                                setExcludedDocs((prev) => [...prev, doc.id]);
                              }
                            }}
                            className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-0"
                          />
                          <span className="truncate">{doc.filename}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Questions log */}
              <div className="glass-card rounded-2xl p-5">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Session Questions ({chatHistory.length})
                </h3>
                {chatHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No questions asked yet.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {chatHistory.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-white/5 bg-slate-900/40 p-2.5 text-xs"
                      >
                        <p className="font-medium text-slate-200 line-clamp-2">{item.question}</p>
                        <span className="mt-1 inline-block text-[10px] text-slate-500">
                          {new Date(item.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Interactive Chat Conversation */}
            <div className="lg:col-span-2">
              <div className="glass-card flex flex-col h-[650px] rounded-2xl p-5">
                {/* Chat Messages viewport */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {chatHistory.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
                        <Bot className="h-6 w-6" />
                      </div>
                      <h4 className="mt-3 text-sm font-semibold text-white">
                        AI Document Q&A Ready
                      </h4>
                      <p className="mt-1 max-w-sm text-xs text-slate-400">
                        Ask questions about the uploaded documents in this workspace. Answers are
                        grounded with vector chunk citations.
                      </p>
                    </div>
                  ) : (
                    chatHistory.map((msg) => (
                      <div key={msg.id} className="space-y-3">
                        {/* User Question */}
                        <div className="flex items-start gap-2.5 justify-end">
                          <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-xs text-white shadow-md">
                            {msg.question}
                          </div>
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
                            <User className="h-3.5 w-3.5" />
                          </div>
                        </div>

                        {/* AI Answer */}
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5">
                            <div className="flex h-full w-full items-center justify-center rounded-[5px] bg-slate-950">
                              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                            </div>
                          </div>
                          <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-white/10 bg-slate-900/80 p-3.5 text-xs text-slate-200 space-y-2">
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.answer}</p>

                            {/* Citations if available */}
                            {msg.citations && msg.citations.length > 0 && (
                              <div className="mt-3 border-t border-white/5 pt-2">
                                <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider block mb-1">
                                  Grounding Citations ({msg.citations.length})
                                </span>
                                <div className="space-y-1.5">
                                  {msg.citations.map((c, idx) => (
                                    <div
                                      key={c.id || c.chunk_id || idx}
                                      className="rounded bg-slate-950/70 p-2 text-[11px] border border-white/5"
                                    >
                                      <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] mb-1">
                                        <span className="text-cyan-300 font-medium">
                                          {c.document_name || c.document_filename || "Document"}
                                        </span>
                                        {c.similarity != null && (
                                          <span className="text-emerald-400">
                                            Score: {(c.similarity * 100).toFixed(1)}%
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-slate-300 italic line-clamp-3">
                                        &quot;{c.content || c.text}&quot;
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Token usage badge */}
                            {(msg.tokens_in || msg.tokens_out) && (
                              <div className="text-[10px] text-slate-500 pt-1">
                                Tokens used: {msg.tokens_in || 0} in / {msg.tokens_out || 0} out
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Ask Input form */}
                {askError && (
                  <div className="my-2 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-300">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                    <span>{askError}</span>
                  </div>
                )}

                <form
                  onSubmit={handleAskSubmit(onAskQuestion)}
                  className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3"
                >
                  <input
                    type="text"
                    placeholder="Ask a question about your documents..."
                    {...registerAsk("question")}
                    disabled={asking}
                    className="flex-1 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={asking}
                    className="glow-btn flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50"
                  >
                    {asking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span>Ask</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DOCUMENTS */}
        {activeTab === "documents" && (
          <div className="space-y-6">
            {/* Upload Area */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white">Workspace Documents</h3>
                  <p className="text-xs text-slate-400">
                    Upload PDF or plain text TXT files. Documents are automatically chunked and
                    indexed into the vector store.
                  </p>
                </div>

                {/* Upload Button */}
                <label className="glow-btn inline-flex items-center gap-2 cursor-pointer rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:opacity-95">
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chunking & Vectorizing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload PDF / TXT
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>

              {uploadError && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>

            {/* Document List */}
            <div className="glass-card rounded-2xl p-6">
              {documents.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-slate-600" />
                  <h4 className="mt-3 text-sm font-semibold text-white">No Documents Found</h4>
                  <p className="mt-1 text-xs text-slate-400">
                    Upload your first PDF or TXT document using the button above to enable AI
                    retrieval.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {documents.map((doc) => {
                    const isUploader =
                      doc.owner_id === user?.id ||
                      doc.uploaded_by === user?.username ||
                      doc.owner_username === user?.username;
                    return (
                      <div
                        key={doc.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3.5 gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-white">{doc.filename}</h4>
                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                              <span>{doc.chunk_count ?? 1} chunks</span>
                              <span>•</span>
                              <span>Uploaded by {doc.uploaded_by || doc.owner_username || "User"}</span>
                              <span>•</span>
                              <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                            Indexed
                          </span>
                          {isUploader && (
                            <button
                              onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                              className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                              title="Delete Document"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
