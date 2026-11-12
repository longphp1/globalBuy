import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductListing, listingTitle } from "@/components/ProductListing";
import { decodeSegment, getSite } from "@/lib/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string; menu: string; brand: string; page: string }>;
}): Promise<Metadata> {
  const { site: slug, brand } = await params;
  const site = getSite(slug);
  return { title: site ? listingTitle(site.name, decodeSegment(brand)) : "Spreadsheet" };
}

export default async function BrandPageNumber({
  params,
}: {
  params: Promise<{ site: string; menu: string; brand: string; page: string }>;
}) {
  const { site, menu, brand, page } = await params;
  const pageNumber = Number(page);
  if (!Number.isInteger(pageNumber) || pageNumber < 1) notFound();
  return (
    <ProductListing
      siteSlug={site}
      menuUrl={decodeSegment(menu)}
      brand={decodeSegment(brand)}
      page={pageNumber}
    />
  );
}
