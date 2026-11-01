import React from "react";
import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/guard";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = {
  title: "Admin Dashboard | VYBE",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminSession("EDITOR");

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <AdminNav
        user={{
          displayName: user.displayName,
          email: user.email,
          role: user.role,
        }}
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
