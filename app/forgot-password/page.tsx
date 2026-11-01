import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function Page() {
  return <AuthForm mode="forgot" />;
}
