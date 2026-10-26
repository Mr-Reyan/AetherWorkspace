"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Sparkles,
  LayoutGrid,
  Home,
  LogIn,
  UserPlus,
  LogOut,
  Menu,
  X,
  User,
} from "lucide-react";

export default function Navbar() {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push("/");
    } finally {
      setIsLoggingOut(false);
      setMobileMenuOpen(false);
    }
  };

  const isActive = (path) => pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-0.5 shadow-md shadow-indigo-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
              <Sparkles className="h-4 w-4 text-cyan-400" />
            </div>
          </div>
          <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-lg font-bold tracking-tight text-transparent">
            Aether<span className="text-cyan-400">Workspace</span>
          </span>
        </Link>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex md:items-center md:gap-2">
          {/* Home button */}
          <Link
            href="/"
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
              isActive("/")
                ? "bg-white/10 text-white shadow-sm"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Home className="h-4 w-4" />
            Home
          </Link>

          {/* My Workspaces (Shown ONLY if user is logged in) */}
          {mounted && isAuthenticated && (
            <Link
              href="/workspaces"
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                isActive("/workspaces") || pathname.startsWith("/workspaces/")
                  ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <LayoutGrid className="h-4 w-4 text-indigo-400" />
              My Workspaces
            </Link>
          )}
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden md:flex md:items-center md:gap-3">
          {!mounted || loading ? (
            <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-800" />
          ) : isAuthenticated ? (
            <div className="flex items-center gap-3">
              {/* User badge */}
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-[10px] font-bold text-white">
                  {user?.username?.[0]?.toUpperCase() || <User className="h-3 w-3" />}
                </div>
                <span className="font-medium text-slate-200">
                  {user?.username}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-1.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20 hover:text-red-200 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                {isLoggingOut ? "Signing Out..." : "Sign Out"}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
              <Link
                href="/register"
                className="glow-btn flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-indigo-500/25 transition-transform active:scale-95"
              >
                <UserPlus className="h-4 w-4" />
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-white/10 bg-slate-950/95 px-4 pt-2 pb-5 backdrop-blur-2xl md:hidden">
          <div className="flex flex-col gap-2">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium ${
                isActive("/")
                  ? "bg-white/10 text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Home className="h-4 w-4" />
              Home
            </Link>

            {mounted && isAuthenticated && (
              <Link
                href="/workspaces"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium ${
                  isActive("/workspaces")
                    ? "bg-indigo-600/30 text-indigo-300"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <LayoutGrid className="h-4 w-4 text-indigo-400" />
                My Workspaces
              </Link>
            )}

            <div className="mt-2 border-t border-white/10 pt-3">
              {!mounted || loading ? (
                <div className="h-8 w-full animate-pulse rounded-lg bg-slate-800" />
              ) : isAuthenticated ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-3 py-1 text-sm text-slate-400">
                    <User className="h-4 w-4" />
                    <span>Logged in as </span>
                    <strong className="text-white">{user?.username}</strong>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex w-full items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/20"
                  >
                    <LogOut className="h-4 w-4" />
                    {isLoggingOut ? "Signing Out..." : "Sign Out"}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/25"
                  >
                    <UserPlus className="h-4 w-4" />
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
