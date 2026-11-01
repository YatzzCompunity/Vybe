import React from "react";
import type { Metadata } from "next";
import CategoryPage, {
  generateMetadata as generateCategoryMetadata,
} from "@/app/[category]/page";
import { getAllCategories } from "@/lib/articles";

interface CategoryAliasPageProps {
  params: {
    slug: string;
  };
}

export const revalidate = 60;

export async function generateStaticParams() {
  const categories = await getAllCategories();
  return categories.map((cat) => ({
    slug: cat.slug,
  }));
}

export async function generateMetadata({
  params,
}: CategoryAliasPageProps): Promise<Metadata> {
  return generateCategoryMetadata({ params: { category: params.slug } });
}

/**
 * Supports `/category/[slug]` in addition to `/[category]`.
 * Renders the category page from Prisma or returns 404 (`notFound()`) for unknown slugs.
 */
export default function CategoryAliasPage({ params }: CategoryAliasPageProps) {
  return <CategoryPage params={{ category: params.slug }} />;
}
