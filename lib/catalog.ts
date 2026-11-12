import catalogJson from "@/data/catalog.json";
import type { Catalog, Product, Site, SiteCatalog } from "@/lib/types";

export const catalog = catalogJson as Catalog;

export function getSite(slug: string): Site | undefined {
  return catalog.sites.find((site) => site.slug === slug);
}

export function getSiteCatalog(site: Site): SiteCatalog {
  return catalog.catalogs[site.siteId] ?? { menus: [], products: [] };
}

export function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function productSlugPath(siteSlug: string, slug: string) {
  return `/${siteSlug}/products/${encodeURIComponent(slug)}`;
}

export function listingPath(siteSlug: string, menuUrl: string, brand: string, page = 1) {
  if (menuUrl === "home" && brand === "All" && page === 1) {
    return `/${siteSlug}`;
  }
  const base = `/${siteSlug}/item-type/${encodeURIComponent(menuUrl)}/${encodeURIComponent(brand)}`;
  return page <= 1 ? base : `${base}/${page}`;
}

export function filterProducts(products: Product[], menuUrl: string, brand: string) {
  const byMenu = menuUrl === "home" ? products : products.filter((item) => item.menuUrl === menuUrl);
  if (brand === "All") return byMenu;
  return byMenu.filter((item) => item.brand === brand);
}

export function brandList(products: Product[], menuUrl: string) {
  const source = menuUrl === "home" ? products : products.filter((item) => item.menuUrl === menuUrl);
  const brands: string[] = [];
  for (const item of source) {
    if (item.brand && !brands.includes(item.brand)) brands.push(item.brand);
  }
  brands.push("All");
  return brands;
}

export function findProduct(products: Product[], slug: string) {
  return products.find((item) => item.slug === slug);
}

export function relatedProducts(products: Product[], product: Product) {
  const sameMenu = products.filter(
    (item) => item.menuUrl === product.menuUrl && item.slug !== product.slug,
  );
  const sameBrand = sameMenu.filter((item) => item.brand === product.brand);
  const others = sameMenu.filter((item) => item.brand !== product.brand);
  let items = sameBrand.length >= 5 ? sameBrand.slice(0, 5) : [...sameBrand, ...others];
  if (items.length < 5) {
    const picked = new Set(items.map((item) => item.slug));
    for (const item of products) {
      if (item.slug === product.slug || picked.has(item.slug)) continue;
      items.push(item);
      if (items.length >= 5) break;
    }
  }
  return {
    title: sameBrand.length >= 5 ? product.menuName : "Other",
    items: items.slice(0, 5),
  };
}
