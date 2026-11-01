import React from "react";
import { listComments } from "@/lib/admin/service";
import { requireAdminSession } from "@/lib/admin/guard";
import { CommentModeration } from "@/components/admin/CommentModeration";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: {
    status?: string;
    page?: string;
  };
}

export default async function AdminCommentsPage({ searchParams }: Props) {
  await requireAdminSession("EDITOR");
  const status = searchParams.status ?? "PENDING";
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const limit = 50;
  const skip = (page - 1) * limit;

  const result = await listComments({
    status,
    page,
    limit,
    skip,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">Comment Moderation Queue</h1>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Review reader submissions, approve constructive discourse, and remove spam.
        </p>
      </div>

      <CommentModeration
        initialComments={result.items.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
        }))}
        total={result.total}
        currentStatus={status}
      />
    </div>
  );
}
