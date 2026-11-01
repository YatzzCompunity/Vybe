"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

type Mode = "login" | "register" | "forgot" | "reset";

const INPUT =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900";
const BUTTON =
  "w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60";

/** Safe same-origin relative redirect only. */
function safeCallback(url: string | undefined): string {
  return url && url.startsWith("/") && !url.startsWith("//") ? url : "/profile";
}

export function AuthForm({
  mode,
  googleEnabled = false,
  callbackUrl,
  token,
}: {
  mode: Mode;
  googleEnabled?: boolean;
  callbackUrl?: string;
  token?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function postJson(url: string, payload: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => ({}))) as {
      data?: { message?: string };
      error?: { message?: string };
    };
    return { ok: res.ok, json };
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "");
    const password = String(f.get("password") ?? "");
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "login") {
        const res = await signIn("credentials", { email, password, redirect: false });
        if (res?.ok && !res.error) {
          window.location.href = safeCallback(callbackUrl);
          return;
        }
        setError(res?.status === 429 ? "Too many attempts. Try again later." : "Invalid email or password.");
      } else if (mode === "register") {
        const r = await postJson("/api/v1/auth/register", {
          email,
          password,
          displayName: String(f.get("displayName") ?? ""),
        });
        if (!r.ok) {
          setError(r.json.error?.message ?? "Registration failed.");
        } else {
          const res = await signIn("credentials", { email, password, redirect: false });
          if (res?.ok) {
            window.location.href = "/profile";
            return;
          }
          setInfo(
            (r.json.data?.message as string | undefined) ??
              "Account created. Please log in."
          );
        }
      } else if (mode === "forgot") {
        const r = await postJson("/api/v1/auth/forgot-password", { email });
        if (r.ok) setInfo(r.json.data?.message ?? "Request received.");
        else setError(r.json.error?.message ?? "Request failed.");
      } else {
        const r = await postJson("/api/v1/auth/reset-password", { token, password });
        if (r.ok) setInfo(r.json.data?.message ?? "Password updated.");
        else setError(r.json.error?.message ?? "Reset failed.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const showEmail = mode !== "reset";
  const showPassword = mode !== "forgot";
  const label = { login: "Log in", register: "Create account", forgot: "Send reset instructions", reset: "Set new password" }[mode];

  return (
    <div className="mx-auto max-w-sm space-y-4 px-4 py-12">
      <h1 className="font-serif text-2xl font-bold">{label}</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        {mode === "register" && (
          <input name="displayName" required minLength={2} maxLength={80} placeholder="Display name" aria-label="Display name" autoComplete="nickname" className={INPUT} />
        )}
        {showEmail && <input name="email" type="email" required placeholder="Email" aria-label="Email" autoComplete="email" className={INPUT} />}
        {showPassword && (
          <input
            name="password"
            type="password"
            required
            minLength={mode === "login" ? 1 : 8}
            maxLength={128}
            placeholder={mode === "reset" ? "New password (min 8)" : "Password"}
            aria-label={mode === "reset" ? "New password" : "Password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className={INPUT}
          />
        )}
        <button type="submit" disabled={busy || (mode === "reset" && !token)} className={BUTTON}>
          {busy ? "Please wait…" : label}
        </button>
      </form>
      {mode === "reset" && !token && <p className="text-sm text-red-600 dark:text-red-400">Missing reset token.</p>}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {info && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{info}</p>}

      {mode === "login" && (
        <>
          {googleEnabled ? (
            <button type="button" onClick={() => signIn("google", { callbackUrl: safeCallback(callbackUrl) })} className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">
              Continue with Google
            </button>
          ) : (
            <div>
              <button type="button" disabled aria-disabled="true" className="w-full cursor-not-allowed rounded-md border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-400 dark:border-slate-700">
                Continue with Google
              </button>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                TODO: Google sign-in is unavailable until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured.
              </p>
            </div>
          )}
          <p className="text-sm">
            <Link href="/forgot-password" className="text-indigo-600 hover:underline">Forgot password?</Link>
            {" · "}
            <Link href="/register" className="text-indigo-600 hover:underline">Create account</Link>
          </p>
        </>
      )}
      {mode === "register" && (
        <p className="text-sm">Already registered? <Link href="/login" className="text-indigo-600 hover:underline">Log in</Link></p>
      )}
      {(mode === "forgot" || mode === "reset") && (
        <p className="text-sm"><Link href="/login" className="text-indigo-600 hover:underline">Back to login</Link></p>
      )}
      {mode === "forgot" && (
        <p className="text-xs text-slate-600 dark:text-slate-400">TODO (Phase 6): email delivery is not configured, so no email is actually sent yet.</p>
      )}
    </div>
  );
}
