import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductListing, listingTitle } from "@/components/ProductListing";
import { SiteFrame } from "@/components/SiteFrame";
import { getSite } from "@/lib/catalog";

const HOME_SITE = "taoobuy";

export function generateMetadata(): Metadata {
  const site = getSite(HOME_SITE);
  if (!site) {
    return { title: "TaooBuy Spreadsheet" };
  }
  return {
    title: listingTitle(site.name, "All"),
    description: `The ${site.name} spreadsheet of popular products, updated with categories, brands, and buying links.`,
    icons: { icon: `/favicons/${site.slug}.ico` },
  };
}

export default function HomePage() {
  const site = getSite(HOME_SITE);
  if (!site) notFound();
  return (
    <SiteFrame site={site}>
      <ProductListing siteSlug={site.slug} menuUrl="home" brand="All" page={1} />
    </SiteFrame>
  );
}
