import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { isGoogleConfigured } from "@/lib/auth";
export const metadata: Metadata = { title: "Log in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function Page({ searchParams }: { searchParams: { callbackUrl?: string } }) {
  return <AuthForm mode="login" googleEnabled={isGoogleConfigured()} callbackUrl={typeof searchParams.callbackUrl === "string" ? searchParams.callbackUrl : undefined} />;
}
