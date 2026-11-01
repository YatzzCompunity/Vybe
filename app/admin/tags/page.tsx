import React from "react";
import { listTags } from "@/lib/admin/service";
import { requireAdminSession } from "@/lib/admin/guard";
import { TagManager } from "@/components/admin/TagManager";

export const dynamic = "force-dynamic";

export default async function AdminTagsPage() {
  const user = await requireAdminSession("EDITOR");
  const tags = await listTags();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">Tags Management</h1>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Manage topic tags attached to articles across categories.
        </p>
      </div>

      <TagManager initialTags={tags} userRole={user.role} />
    </div>
  );
}
