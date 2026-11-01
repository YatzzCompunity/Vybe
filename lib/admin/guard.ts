import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { getSessionUser } from "@/lib/api/auth-guard";

const ROLE_RANK: Record<Role, number> = {
  READER: 0,
  AUTHOR: 1,
  EDITOR: 2,
  ADMIN: 3,
};

/**
 * Server Component guard for admin pages.
 * Re-reads user directly from the database to catch deactivated users or demotions.
 * Unauthenticated visitors are redirected to /login.
 * Insufficient roles are redirected to /admin or root.
 */
export async function requireAdminSession(
  minRole: Role = "EDITOR",
  callbackUrl = "/admin"
): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  if (ROLE_RANK[user.role] < ROLE_RANK[minRole]) {
    redirect(minRole === "ADMIN" ? "/admin" : "/");
  }
  return user;
}
