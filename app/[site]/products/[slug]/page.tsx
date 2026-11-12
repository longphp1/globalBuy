import type { Metadata } from "next";
import { ProductDetail } from "@/components/ProductDetail";
import { decodeSegment, findProduct, getSite, getSiteCatalog } from "@/lib/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string; slug: string }>;
}): Promise<Metadata> {
  const { site: siteSlug, slug } = await params;
  const site = getSite(siteSlug);
  if (!site) return {};
  const product = findProduct(getSiteCatalog(site).products, decodeSegment(slug));
  if (!product) return { title: site.name };
  return {
    title: `${product.name}-${product.brand}-${product.menuName}`,
    description: `You can buy this ${product.name} go to ${site.name}`,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ site: string; slug: string }>;
}) {
  const { site, slug } = await params;
  return <ProductDetail siteSlug={site} slug={decodeSegment(slug)} />;
}
