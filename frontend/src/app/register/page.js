"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@/lib/validations";
import { useAuth } from "@/lib/auth-context";
import { UserPlus, Sparkles, AlertCircle, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerAuth, isAuthenticated, loading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const passwordValue = watch("password", "");

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/workspaces");
    }
  }, [authLoading, isAuthenticated, router]);

  const onSubmit = async (data) => {
    setServerError("");
    try {
      await registerAuth(data.username, data.password);
      router.push("/workspaces");
    } catch (err) {
      console.error("Registration failed:", err);
      const detail =
        err?.data?.username?.[0] ||
        err?.data?.password?.[0] ||
        err?.data?.detail ||
        (err?.data && Object.values(err.data).flat().join(" ")) ||
        err?.message ||
        "Registration failed. Please check your information.";
      setServerError(detail);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/25">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-slate-950">
              <Sparkles className="h-6 w-6 text-cyan-400" />
            </div>
          </div>
          <h2 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Create an account
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Get started with AI-augmented workspaces in seconds
          </p>
        </div>

        {/* Card */}
        <div className="glass-card mt-8 rounded-2xl p-6 sm:p-8">
          {serverError && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="Choose a unique username"
                {...register("username")}
                className={`w-full rounded-xl border bg-slate-900/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all focus:ring-2 ${
                  errors.username
                    ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
                    : "border-white/10 focus:border-indigo-500 focus:ring-indigo-500/20"
                }`}
              />
              {errors.username && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  {...register("password")}
                  className={`w-full rounded-xl border bg-slate-900/80 px-3.5 py-2.5 pr-10 text-sm text-white placeholder-slate-500 outline-none transition-all focus:ring-2 ${
                    errors.password
                      ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
                      : "border-white/10 focus:border-indigo-500 focus:ring-indigo-500/20"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password ? (
                <p className="mt-1 text-xs text-red-400">
                  {errors.password.message}
                </p>
              ) : (
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
                  <CheckCircle2
                    className={`h-3 w-3 ${
                      passwordValue.length >= 8 ? "text-emerald-400" : "text-slate-600"
                    }`}
                  />
                  <span>Must be at least 8 characters</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Confirm your password"
                {...register("confirmPassword")}
                className={`w-full rounded-xl border bg-slate-900/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all focus:ring-2 ${
                  errors.confirmPassword
                    ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
                    : "border-white/10 focus:border-indigo-500 focus:ring-indigo-500/20"
                }`}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="glow-btn mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-cyan-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition-all hover:opacity-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Switch to Login */}
          <div className="mt-6 border-t border-white/5 pt-4 text-center text-xs text-slate-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-cyan-400 hover:text-cyan-300"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
