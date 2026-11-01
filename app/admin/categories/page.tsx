import React from "react";
import { listCategories } from "@/lib/admin/service";
import { requireAdminSession } from "@/lib/admin/guard";
import { CategoryManager } from "@/components/admin/CategoryManager";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const user = await requireAdminSession("EDITOR");
  const categories = await listCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">Categories</h1>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Manage publication taxonomy, navigational sorting, and editorial sections.
        </p>
      </div>

      <CategoryManager initialCategories={categories} userRole={user.role} />
    </div>
  );
}
