import type { Metadata } from "next";
import { ProductListing, listingTitle } from "@/components/ProductListing";
import { getSite } from "@/lib/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string }>;
}): Promise<Metadata> {
  const { site: slug } = await params;
  const site = getSite(slug);
  return { title: site ? listingTitle(site.name, "All") : "Spreadsheet" };
}

export default async function SiteHome({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  return <ProductListing siteSlug={site} menuUrl="home" brand="All" page={1} />;
}
