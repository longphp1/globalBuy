import type { Metadata } from "next";
import { SiteFrame } from "@/components/SiteFrame";
import { catalog } from "@/lib/catalog-data";
import { getSite } from "@/lib/store";
import { notFound } from "next/navigation";

export const revalidate = 86400;

export function generateStaticParams() {
  return catalog.sites.map((site) => ({ site: site.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string }>;
}): Promise<Metadata> {
  const { site: slug } = await params;
  const site = await getSite(slug);
  if (!site) return {};
  return {
    title: `${site.name} Spreadsheet`,
    description: `The ${site.name} spreadsheet of popular products, updated with categories, brands, and buying links.`,
    icons: { icon: `/favicons/${site.slug}.ico` },
  };
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ site: string }>;
}) {
  const { site: slug } = await params;
  const site = await getSite(slug);
  if (!site) notFound();
  return <SiteFrame site={site}>{children}</SiteFrame>;
}
