import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function Page({ searchParams }: { searchParams: { token?: string } }) {
  return <AuthForm mode="reset" token={typeof searchParams.token === "string" ? searchParams.token : undefined} />;
}
