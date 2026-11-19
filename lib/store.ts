import { catalog } from "@/lib/catalog-data";
import type { Catalog, Site, SiteCatalog } from "@/lib/types";

export function invalidatePublishedCatalog() {}

export function readCatalog(): Promise<Catalog> {
  return Promise.resolve(catalog);
}

export async function getSite(slug: string) {
  return catalog.sites.find((site) => site.slug === slug);
}

export async function getSiteCatalog(site: Site): Promise<SiteCatalog> {
  return catalog.catalogs[site.siteId] ?? { menus: [], products: [] };
}

export async function listSites() {
  return catalog.sites;
}

export async function homeSite() {
  return catalog.sites.find((site) => site.slug === "taoobuy") ?? catalog.sites[0];
}
