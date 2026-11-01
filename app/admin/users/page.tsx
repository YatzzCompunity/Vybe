import React from "react";
import { listUsers } from "@/lib/admin/service";
import { requireAdminSession } from "@/lib/admin/guard";
import { UserManager } from "@/components/admin/UserManager";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: {
    search?: string;
    page?: string;
  };
}

export default async function AdminUsersPage({ searchParams }: Props) {
  // Only ADMIN can access user management
  await requireAdminSession("ADMIN");

  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const limit = 50;
  const skip = (page - 1) * limit;

  const result = await listUsers({
    search: searchParams.search,
    page,
    limit,
    skip,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">User Accounts &amp; Roles</h1>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Manage user permissions and staff access. Passwords and sensitive secrets are never exposed.
        </p>
      </div>

      <UserManager
        initialUsers={result.items.map((u) => ({
          ...u,
          emailVerifiedAt: u.emailVerifiedAt ? u.emailVerifiedAt.toISOString() : null,
          createdAt: u.createdAt.toISOString(),
        }))}
        total={result.total}
        currentSearch={searchParams.search}
      />
    </div>
  );
}
