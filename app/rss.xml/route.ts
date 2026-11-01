import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = getBaseUrl();
  return NextResponse.redirect(`${baseUrl}/feed.xml`, 308);
}
