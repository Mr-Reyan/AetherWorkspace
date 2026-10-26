import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "AetherWorkspace AI — Collaborative Document Intelligence & RAG",
  description:
    "Next-generation AI Workspace platform featuring vector-grounded document intelligence, team workspaces, and expiring invite access.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
        <AuthProvider>
          <div className="bg-ambient-glow" />
          <Suspense fallback={<div className="h-16 w-full border-b border-white/10 bg-slate-950/80" />}>
            <Navbar />
          </Suspense>
          <Suspense fallback={<div className="flex-1 flex items-center justify-center p-8 text-slate-500">Loading...</div>}>
            <main className="relative z-10 flex-1">{children}</main>
          </Suspense>
          <footer className="relative z-10 border-t border-white/5 bg-slate-950/60 py-6 text-center text-xs text-slate-500 backdrop-blur-sm">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <p>
                © 2026 AetherWorkspace AI Platform. Grounded RAG & Team Intelligence.
              </p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
