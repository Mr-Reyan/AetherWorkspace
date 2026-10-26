"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  Sparkles,
  ArrowRight,
  FileText,
  ShieldCheck,
  Zap,
  Users,
  Clock,
  Layers,
  ChevronRight,
} from "lucide-react";

export default function HomePage() {
  const { isAuthenticated, user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative overflow-hidden py-12 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>AI Workspace & Document Intelligence SaaS</span>
          </div>

          {/* Heading */}
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Turn Documents into{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
              Intelligent Workspaces
            </span>
          </h1>

          {/* Description */}
          <p className="mt-6 text-lg leading-8 text-slate-300 sm:text-xl">
            Upload PDFs and TXT files, collaborate across workspaces, and query
            your private knowledge base with RAG-powered vector similarity and
            instant citations.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {mounted && !loading && isAuthenticated ? (
              <>
                <Link
                  href="/workspaces"
                  className="glow-btn flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-cyan-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 sm:w-auto"
                >
                  <Layers className="h-5 w-5" />
                  Go to My Workspaces
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <div className="text-sm text-slate-400">
                  Welcome back, <strong className="text-white">{user?.username}</strong>!
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="glow-btn flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-cyan-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 sm:w-auto"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-7 py-3.5 text-base font-semibold text-slate-200 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white sm:w-auto"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Visual Mock Showcase */}
        <div className="mt-16 sm:mt-24">
          <div className="relative mx-auto max-w-5xl rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-4 shadow-2xl backdrop-blur-xl sm:p-6 lg:p-8">
            {/* Window bar */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
                <span className="ml-2 text-xs font-mono text-slate-400">
                  workspace-qa-studio // RAG v1.0
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-indigo-400">
                <span className="inline-block h-2 w-2 animate-ping rounded-full bg-emerald-400" />
                AI Online (Gemma & Vector DB)
              </div>
            </div>

            {/* Simulated Workspace Preview */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left Column: Documents */}
              <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-cyan-400" /> Workspace Documents
                  </span>
                  <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-indigo-300">
                    2 Active
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-900/60 p-2.5 text-xs text-slate-300">
                    <div className="flex items-center gap-2 truncate">
                      <div className="rounded bg-blue-500/20 p-1 text-blue-400">PDF</div>
                      <span className="truncate font-medium">Q3_Financial_Analysis.pdf</span>
                    </div>
                    <span className="text-[10px] text-emerald-400">Ready</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-900/60 p-2.5 text-xs text-slate-300">
                    <div className="flex items-center gap-2 truncate">
                      <div className="rounded bg-amber-500/20 p-1 text-amber-400">TXT</div>
                      <span className="truncate font-medium">Product_Requirements.txt</span>
                    </div>
                    <span className="text-[10px] text-emerald-400">Ready</span>
                  </div>
                </div>
              </div>

              {/* Middle/Right Column: Chat & Citations */}
              <div className="lg:col-span-2 space-y-4">
                {/* User Prompt */}
                <div className="flex items-start gap-3 justify-end">
                  <div className="rounded-2xl rounded-tr-sm bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm text-white shadow-md">
                    What was our gross revenue growth according to the Q3 report?
                  </div>
                </div>

                {/* AI Response with Citations */}
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5">
                    <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-slate-950">
                      <Sparkles className="h-4 w-4 text-cyan-400" />
                    </div>
                  </div>
                  <div className="space-y-3 rounded-2xl rounded-tl-sm border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-200">
                    <p>
                      According to Section 3.2 of the Q3 Financial Analysis, gross revenue
                      expanded by <strong>34.8% year-over-year</strong>, driven primarily by
                      enterprise workspace subscriptions.
                    </p>
                    {/* Citations Preview */}
                    <div className="rounded-lg border border-white/5 bg-slate-950/80 p-3">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        Grounded Document Citation
                      </div>
                      <p className="text-xs text-slate-400 italic">
                        &quot;Gross revenue grew 34.8% YoY to $4.2M, reflecting expanded uptake
                        of collaborative multi-seat workspaces...&quot;
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mt-24 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass-card glass-card-hover rounded-2xl p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">Multi-Tenant Workspaces</h3>
            <p className="mt-2 text-sm text-slate-400">
              Create separated project workspaces with isolated permissions and team roles.
            </p>
          </div>

          <div className="glass-card glass-card-hover rounded-2xl p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">RAG AI Q&A</h3>
            <p className="mt-2 text-sm text-slate-400">
              Ask deep questions against uploaded PDF & TXT documents with vector similarity.
            </p>
          </div>

          <div className="glass-card glass-card-hover rounded-2xl p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">Expiring Invites</h3>
            <p className="mt-2 text-sm text-slate-400">
              Generate invite links with custom expiration dates and maximum redeem limits.
            </p>
          </div>

          <div className="glass-card glass-card-hover rounded-2xl p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">Token Guardrails</h3>
            <p className="mt-2 text-sm text-slate-400">
              Built-in 30-day token budget tracking, rate limit monitoring, and auto-reset metrics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
