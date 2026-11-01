import React from "react";
import type { Metadata } from "next";
import AuthorProfilePage, {
  generateMetadata as generateAuthorMetadata,
  generateStaticParams as generateAuthorStaticParams,
} from "@/app/author/[slug]/page";

interface AuthorAliasPageProps {
  params: {
    slug: string;
  };
}

export const revalidate = 300;

export async function generateStaticParams() {
  return generateAuthorStaticParams();
}

export async function generateMetadata({
  params,
}: AuthorAliasPageProps): Promise<Metadata> {
  return generateAuthorMetadata({ params: { slug: params.slug } });
}

/**
 * Supports `/authors/[slug]` in addition to `/author/[slug]`.
 * Re-renders the author profile page with canonical URL pointing to `/author/[slug]`.
 */
export default function AuthorAliasPage({ params }: AuthorAliasPageProps) {
  return <AuthorProfilePage params={{ slug: params.slug }} />;
}
