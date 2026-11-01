"use client";

import React, { useState } from "react";
import { SITE_NAME } from "@/lib/config";

/**
 * Newsletter signup component connected to `POST /api/v1/newsletter/subscribe`.
 * Persists `NewsletterSubscriber` as `PENDING_CONFIRMATION` with a SHA-256
 * confirmation token hash. Actual email dispatch is a documented Phase 4+ TODO.
 */
export function Newsletter() {
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/v1/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: trimmed }),
      });

      const payload = (await response.json()) as {
        data?: { message?: string };
        error?: { message?: string };
      };

      if (!response.ok) {
        setErrorMessage(
          payload.error?.message ??
            "Unable to process subscription request. Please try again."
        );
      } else {
        setStatusMessage(
          payload.data?.message ??
            "Subscription request received (PENDING_CONFIRMATION)."
        );
        setEmail("");
      }
    } catch {
      setErrorMessage(
        "Network error while submitting subscription request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      aria-labelledby="newsletter-heading"
      className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-sm sm:p-10"
    >
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-block rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-indigo-200">
          {SITE_NAME} Dispatch • Double Opt-In Newsletter
        </span>
        <h2
          id="newsletter-heading"
          className="mt-3 font-serif text-2xl font-black tracking-tight sm:text-3xl"
        >
          Weekly Music &amp; Culture Briefing
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
          Sign up to receive curated weekly features on studio production, album
          architecture, and global music culture.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-6 flex max-w-md flex-col gap-2.5 sm:flex-row"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            required
            disabled={isSubmitting}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (statusMessage) setStatusMessage(null);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="you@example.com"
            className="w-full rounded-full border border-slate-700 bg-slate-950/90 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="shrink-0 rounded-full bg-indigo-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-400 disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Subscribe"}
          </button>
        </form>

        {statusMessage && (
          <p
            role="status"
            className="mx-auto mt-4 max-w-lg rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-4 py-2.5 text-xs text-emerald-200"
          >
            {statusMessage} (Note: Transactional email delivery provider is a
            Phase 4+ TODO.)
          </p>
        )}

        {errorMessage && (
          <p
            role="alert"
            className="mx-auto mt-4 max-w-lg rounded-lg border border-rose-400/40 bg-rose-500/15 px-4 py-2.5 text-xs text-rose-200"
          >
            {errorMessage}
          </p>
        )}
      </div>
    </section>
  );
}

export default Newsletter;
