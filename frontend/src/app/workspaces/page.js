"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { workspaceCreateSchema } from "@/lib/validations";
import { workspaceApi, documentsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutGrid,
  Plus,
  Users,
  Calendar,
  ArrowRight,
  Shield,
  Loader2,
  FolderOpen,
  Sparkles,
  KeyRound,
  X,
  Gauge,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function WorkspacesPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [workspaces, setWorkspaces] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinToken, setJoinToken] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [successToast, setSuccessToast] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(workspaceCreateSchema),
    defaultValues: { name: "" },
  });

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch workspaces & usage
  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [wsList, usageSummary] = await Promise.allSettled([
        workspaceApi.list(),
        documentsApi.usage(),
      ]);

      if (wsList.status === "fulfilled") {
        setWorkspaces(wsList.value);
      } else {
        throw wsList.reason;
      }

      if (usageSummary.status === "fulfilled") {
        setUsage(usageSummary.value);
      }
    } catch (err) {
      console.error("Failed to load workspaces:", err);
      setError(err?.message || "Failed to load workspaces. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleCreateWorkspace = async (data) => {
    try {
      const created = await workspaceApi.create({ name: data.name });
      setWorkspaces((prev) => [created, ...prev]);
      reset();
      setCreateModalOpen(false);
      setSuccessToast(`Workspace "${created.name}" created successfully!`);
      setTimeout(() => setSuccessToast(""), 4000);
    } catch (err) {
      console.error("Create workspace error:", err);
      const detail =
        err?.data?.name?.[0] || err?.data?.detail || err?.message || "Failed to create workspace";
      throw new Error(detail);
    }
  };

  const handleJoinWorkspace = async (e) => {
    e.preventDefault();
    if (!joinToken.trim()) return;

    setJoinLoading(true);
    setJoinError("");
    try {
      // Allow user to paste either full URL (e.g., http://localhost:3000/invite/XYZ or /join/XYZ) or raw token
      let token = joinToken.trim();
      token = token.split("?")[0].split("#")[0].replace(/\/+$/, "");
      if (token.includes("/")) {
        const parts = token.split("/");
        token = parts[parts.length - 1];
      }

      const ws = await workspaceApi.join(token);
      setJoinModalOpen(false);
      setJoinToken("");
      setSuccessToast(`Successfully joined "${ws.name}"!`);
      setTimeout(() => setSuccessToast(""), 4000);
      loadData();
    } catch (err) {
      console.error("Join workspace error:", err);
      const detail = err?.data?.detail || err?.message || "Invalid or expired invite token.";
      setJoinError(detail);
    } finally {
      setJoinLoading(false);
    }
  };

  if (authLoading || (!isAuthenticated && loading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Success Notification */}
      {successToast && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300 shadow-lg">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            <LayoutGrid className="h-4 w-4" /> Workspace Dashboard
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            My Workspaces
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Collaborate on documents, chat with AI, and manage access invites.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setJoinModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            <KeyRound className="h-4 w-4 text-cyan-400" />
            Join with Invite
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="glow-btn flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition-transform active:scale-95"
          >
            <Plus className="h-4 w-4" />
            New Workspace
          </button>
        </div>
      </div>

      {/* Usage Analytics Banner if available */}
      {usage && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/50 p-4 sm:p-5 backdrop-blur-md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                <Gauge className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Monthly AI Token Quota</h4>
                <p className="text-xs text-slate-400">
                  30-day rolling window for document embeddings & LLM responses
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-slate-400">Used: </span>
                <strong className="text-white">{usage.used_tokens?.toLocaleString()}</strong> /{" "}
                <span className="text-slate-400">{usage.limit_tokens?.toLocaleString()} tokens</span>
              </div>
              <div className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-300">
                Resets: {new Date(usage.resets_at).toLocaleDateString()}
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usage.used_tokens / usage.limit_tokens > 0.85
                  ? "bg-red-500"
                  : usage.used_tokens / usage.limit_tokens > 0.5
                  ? "bg-amber-400"
                  : "bg-indigo-500"
              }`}
              style={{
                width: `${Math.min(
                  100,
                  Math.round((usage.used_tokens / (usage.limit_tokens || 1)) * 100)
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mt-6 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadData}
            className="text-xs font-semibold underline hover:text-red-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Workspaces Grid */}
      <div className="mt-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-white/5 bg-slate-900/40 p-6"
              />
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          /* Empty State */
          <div className="glass-card flex flex-col items-center justify-center rounded-2xl p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
              <FolderOpen className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">No Workspaces Yet</h3>
            <p className="mt-2 max-w-sm text-sm text-slate-400">
              Create your first AI workspace to start uploading documents and querying them with
              grounded vector responses.
            </p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="glow-btn mt-6 flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25"
            >
              <Plus className="h-4 w-4" />
              Create Your First Workspace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((ws) => {
              const isOwner = ws.role === "owner";
              return (
                <div
                  key={ws.id}
                  className="glass-card glass-card-hover group relative flex flex-col justify-between rounded-2xl p-6"
                >
                  <div>
                    {/* Top Meta: Role & Members */}
                    <div className="flex items-center justify-between">
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

                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Users className="h-3.5 w-3.5 text-slate-500" />
                        <span>{ws.member_count ?? 1} {ws.member_count === 1 ? "member" : "members"}</span>
                      </div>
                    </div>

                    {/* Workspace Title */}
                    <h3 className="mt-4 text-xl font-bold tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                      {ws.name}
                    </h3>

                    {/* Metadata */}
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      <span>
                        Created {new Date(ws.created_at).toLocaleDateString()} by{" "}
                        <strong className="text-slate-300">{ws.created_by_username || "You"}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 border-t border-white/5 pt-4">
                    <Link
                      href={`/workspaces/${ws.id}`}
                      className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition-all hover:bg-indigo-600/20 hover:text-indigo-300"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-cyan-400" />
                        Open Workspace
                      </span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Create Workspace */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="glass-card relative w-full max-w-md rounded-2xl p-6 sm:p-8">
            <button
              onClick={() => {
                setCreateModalOpen(false);
                reset();
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              <Sparkles className="h-4 w-4" /> New Workspace
            </div>
            <h2 className="mt-1 text-xl font-bold text-white">Create a Workspace</h2>
            <p className="mt-1 text-xs text-slate-400">
              Workspaces isolate documents, team member access, and AI vector collections.
            </p>

            <form
              onSubmit={handleSubmit(async (data) => {
                try {
                  await handleCreateWorkspace(data);
                } catch (e) {
                  setError(e.message);
                }
              })}
              className="mt-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                  Workspace Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Research & Development, Marketing AI"
                  {...register("name")}
                  className={`w-full rounded-xl border bg-slate-900/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all focus:ring-2 ${
                    errors.name
                      ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
                      : "border-white/10 focus:border-indigo-500 focus:ring-indigo-500/20"
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreateModalOpen(false);
                    reset();
                  }}
                  className="rounded-xl px-4 py-2.5 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="glow-btn flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Workspace"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Join Workspace via Invite Token */}
      {joinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="glass-card relative w-full max-w-md rounded-2xl p-6 sm:p-8">
            <button
              onClick={() => {
                setJoinModalOpen(false);
                setJoinError("");
                setJoinToken("");
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              <KeyRound className="h-4 w-4" /> Redeem Invite
            </div>
            <h2 className="mt-1 text-xl font-bold text-white">Join a Workspace</h2>
            <p className="mt-1 text-xs text-slate-400">
              Paste the invite token or full link shared by a workspace owner.
            </p>

            {joinError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{joinError}</span>
              </div>
            )}

            <form onSubmit={handleJoinWorkspace} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                  Invite Token or Link
                </label>
                <input
                  type="text"
                  value={joinToken}
                  onChange={(e) => setJoinToken(e.target.value)}
                  placeholder="e.g. 4kL9w... or http://localhost:3000/invite/..."
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setJoinModalOpen(false);
                    setJoinError("");
                    setJoinToken("");
                  }}
                  className="rounded-xl px-4 py-2.5 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joinLoading || !joinToken.trim()}
                  className="glow-btn flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {joinLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    "Join Workspace"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
