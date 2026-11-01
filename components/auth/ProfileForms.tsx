"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";

const INPUT = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900";
const BTN = "rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60";

type Msg = { kind: "ok" | "err"; text: string } | null;

async function send(url: string, method: string, payload: unknown): Promise<Msg> {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const json = (await res.json().catch(() => ({}))) as { data?: { message?: string }; error?: { message?: string } };
    return res.ok
      ? { kind: "ok", text: json.data?.message ?? "Saved." }
      : { kind: "err", text: json.error?.message ?? "Request failed." };
  } catch {
    return { kind: "err", text: "Network error." };
  }
}

function Note({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return <p role="status" className={`text-sm ${msg.kind === "ok" ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{msg.text}</p>;
}

export function ProfileForms({ displayName, avatarUrl, hasPassword }: { displayName: string; avatarUrl: string; hasPassword: boolean }) {
  const [profileMsg, setProfileMsg] = useState<Msg>(null);
  const [pwMsg, setPwMsg] = useState<Msg>(null);

  return (
    <div className="space-y-8">
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setProfileMsg(await send("/api/v1/me", "PATCH", { displayName: f.get("displayName"), avatarUrl: f.get("avatarUrl") }));
        }}
      >
        <h2 className="text-lg font-bold">Profile</h2>
        <input name="displayName" defaultValue={displayName} required minLength={2} maxLength={80} className={INPUT} placeholder="Display name" aria-label="Display name" />
        <input name="avatarUrl" defaultValue={avatarUrl} className={INPUT} placeholder="Avatar URL (https://…, placeholder — no upload yet)" aria-label="Avatar URL" />
        <button className={BTN} type="submit">Save profile</button>
        <Note msg={profileMsg} />
      </form>

      {hasPassword && (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            const m = await send("/api/v1/auth/change-password", "POST", { currentPassword: f.get("currentPassword"), newPassword: f.get("newPassword") });
            setPwMsg(m);
            if (m?.kind === "ok") form.reset();
          }}
        >
          <h2 className="text-lg font-bold">Change password</h2>
          <input name="currentPassword" type="password" required autoComplete="current-password" className={INPUT} placeholder="Current password" aria-label="Current password" />
          <input name="newPassword" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className={INPUT} placeholder="New password (min 8)" aria-label="New password" />
          <button className={BTN} type="submit">Change password</button>
          <Note msg={pwMsg} />
        </form>
      )}

      <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700" onClick={() => signOut({ callbackUrl: "/" })}>
        Log out
      </button>
    </div>
  );
}
