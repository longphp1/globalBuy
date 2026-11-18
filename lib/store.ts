import fs from "node:fs";
import path from "node:path";
import { connection } from "next/server";
import type { Catalog, Site, SiteCatalog } from "@/lib/types";

type PublishedCache = { key: string; catalog: Catalog };

const globalCache = globalThis as unknown as { publishedCatalog?: PublishedCache };

function usesSupabase() {
  return process.env.VERCEL === "1";
}

function catalogFile() {
  return path.join(process.cwd(), "data", "catalog.json");
}

function emptyCatalog(): Catalog {
  return { pageSize: 50, generatedAt: "", catalogs: {}, sites: [] };
}

export function invalidatePublishedCatalog() {
  globalCache.publishedCatalog = undefined;
}

export async function readCatalog(): Promise<Catalog> {
  await connection();
  if (usesSupabase()) {
    const { readPublishedCatalog } = await import("@/lib/admin/db");
    const published = await readPublishedCatalog();
    if (published) {
      const key = published.generatedAt || "published";
      if (globalCache.publishedCatalog?.key === key) return globalCache.publishedCatalog.catalog;
      globalCache.publishedCatalog = { key, catalog: published };
      return published;
    }
  }
  const file = catalogFile();
  if (!fs.existsSync(file)) return emptyCatalog();
  const stat = fs.statSync(file);
  const key = `${stat.mtimeMs}:${stat.size}`;
  if (globalCache.publishedCatalog?.key === key) return globalCache.publishedCatalog.catalog;
  const catalog = JSON.parse(fs.readFileSync(file, "utf8")) as Catalog;
  globalCache.publishedCatalog = { key, catalog };
  return catalog;
}

export async function getSite(slug: string) {
  const catalog = await readCatalog();
  return catalog.sites.find((site) => site.slug === slug);
}

export async function getSiteCatalog(site: Site): Promise<SiteCatalog> {
  const catalog = await readCatalog();
  return catalog.catalogs[site.siteId] ?? { menus: [], products: [] };
}

export async function listSites() {
  const catalog = await readCatalog();
  return catalog.sites;
}

export async function homeSite() {
  const sites = await listSites();
  return sites.find((site) => site.slug === "taoobuy") ?? sites[0];
}
