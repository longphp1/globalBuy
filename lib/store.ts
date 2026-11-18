import fs from "node:fs";
import path from "node:path";
import { connection } from "next/server";
import type { Catalog, Site, SiteCatalog } from "@/lib/types";

type PublishedCache = { mtimeMs: number; size: number; catalog: Catalog };

const globalCache = globalThis as unknown as { publishedCatalog?: PublishedCache };

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
  const file = catalogFile();
  if (!fs.existsSync(file)) return emptyCatalog();
  const stat = fs.statSync(file);
  const cached = globalCache.publishedCatalog;
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) return cached.catalog;
  const catalog = JSON.parse(fs.readFileSync(file, "utf8")) as Catalog;
  globalCache.publishedCatalog = { mtimeMs: stat.mtimeMs, size: stat.size, catalog };
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
