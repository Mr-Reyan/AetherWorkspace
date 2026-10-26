"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { workspaceApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  LogIn,
  KeyRound,
} from "lucide-react";

export default function InviteJoinPage({ params }) {
  const unwrappedParams = use(params);
  const token = unwrappedParams.token;
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [joinedWorkspace, setJoinedWorkspace] = useState(null);

  const handleJoin = async () => {
    setJoining(true);
    setError("");
    try {
      const ws = await workspaceApi.join(token);
      setJoinedWorkspace(ws);
      // Wait 1.5 seconds and redirect into the workspace
      setTimeout(() => {
        router.push(`/workspaces/${ws.id}`);
      }, 1500);
    } catch (err) {
      console.error("Redeem invite error:", err);
      const detail =
        err?.data?.detail ||
        err?.message ||
        "This invite token is invalid, expired, or has reached its maximum uses.";
      setError(detail);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Header Icon */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-0.5 shadow-xl shadow-indigo-500/25">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-slate-950">
              <KeyRound className="h-7 w-7 text-cyan-400" />
            </div>
          </div>
          <h2 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Workspace Invitation
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            You&apos;ve been invited to join a collaborative AI workspace
          </p>
        </div>

        {/* Card */}
        <div className="glass-card mt-8 rounded-2xl p-6 sm:p-8">
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {joinedWorkspace ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">Welcome aboard!</h3>
              <p className="text-xs text-slate-300">
                You successfully joined <strong>{joinedWorkspace.name}</strong>. Redirecting you to
                the workspace studio...
              </p>
              <div className="pt-2">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-indigo-400" />
              </div>
            </div>
          ) : authLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            </div>
          ) : isAuthenticated ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-4 text-xs text-slate-300">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-indigo-400" />
                  <span className="font-semibold text-white">Signed in as {user?.username}</span>
                </div>
                <p className="text-slate-400">
                  Click the button below to accept this invitation and gain access to this
                  workspace&apos;s documents and AI assistant.
                </p>
              </div>

              <button
                onClick={handleJoin}
                disabled={joining}
                className="glow-btn flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-cyan-500 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:opacity-95 disabled:opacity-50"
              >
                {joining ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Joining Workspace...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Accept Invitation & Join
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-xs text-slate-300">
                You must be logged in to redeem this workspace invite.
              </p>
              <div className="flex flex-col gap-2.5">
                <Link
                  href="/login"
                  className="glow-btn flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/25"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In to Accept
                </Link>
                <Link
                  href="/register"
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
                >
                  Create New Account
                </Link>
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-white/5 pt-4 text-center">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
