import type { Metadata } from "next";
import { ProductListing, listingTitle } from "@/components/ProductListing";
import { decodeSegment, getSite } from "@/lib/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string; menu: string; brand: string }>;
}): Promise<Metadata> {
  const { site: slug, brand } = await params;
  const site = getSite(slug);
  return { title: site ? listingTitle(site.name, decodeSegment(brand)) : "Spreadsheet" };
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ site: string; menu: string; brand: string }>;
}) {
  const { site, menu, brand } = await params;
  return (
    <ProductListing
      siteSlug={site}
      menuUrl={decodeSegment(menu)}
      brand={decodeSegment(brand)}
      page={1}
    />
  );
}
