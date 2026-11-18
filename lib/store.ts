import { catalog as jsonCatalog } from "@/lib/catalog";
import type { Catalog, Product, Site, SiteCatalog } from "@/lib/types";
import { getDb, revision } from "@/lib/admin/db";

export const pageSize = jsonCatalog.pageSize || 50;

let memory: { rev: number; catalog: Catalog } | null = null;

function text(value: unknown) {
  return value == null ? "" : String(value);
}

async function buildCatalog(): Promise<Catalog> {
  const db = await getDb();
  const configuredSize = Number(db.prepare("SELECT value FROM meta WHERE key = 'website_page_size'").get()?.value);
  const siteRows = db.prepare("SELECT * FROM sites ORDER BY id").all();
  const sites = siteRows.map((row) => ({
    slug: text(row.slug),
    name: text(row.name),
    url: text(row.url),
    title: text(row.title),
    siteId: String(row.catalog_id),
  })) satisfies Site[];
  const menus = db.prepare("SELECT m.*, s.catalog_id FROM menus m JOIN sites s ON s.id = m.site_id ORDER BY m.id").all();
  const products = db.prepare("SELECT p.*, s.catalog_id FROM products p JOIN sites s ON s.id = p.site_id ORDER BY p.range, p.id").all();
  const catalogs: Catalog["catalogs"] = {};
  for (const site of sites) {
    const siteMenus = menus
      .filter((menu) => String(menu.catalog_id) === site.siteId)
      .map((menu) => ({ name: text(menu.name), url: text(menu.url) }));
    const menuById = new Map(menus.filter((menu) => String(menu.catalog_id) === site.siteId).map((menu) => [Number(menu.id), menu]));
    const siteProducts: Product[] = products
      .filter((product) => String(product.catalog_id) === site.siteId)
      .map((product) => {
        const menu = menuById.get(Number(product.menu_id));
        return {
          id: Number(product.id),
          slug: text(product.slug),
          name: text(product.name),
          price: text(product.price),
          brand: text(product.brand),
          menuName: text(menu?.name || "Home"),
          menuUrl: text(menu?.url || "home"),
          image: text(product.main_img),
          sourceProductId: text(product.source_product_id),
          sourceProductUrl: text(product.source_product_url),
          taoBuyLink: text(product.tao_buy_link),
        };
      });
    catalogs[site.siteId] = { menus: siteMenus, products: siteProducts };
  }
  return {
    pageSize: configuredSize > 0 ? configuredSize : pageSize,
    generatedAt: jsonCatalog.generatedAt,
    sites,
    catalogs,
  };
}

export async function readCatalog(): Promise<Catalog> {
  const db = await getDb();
  const rev = revision(db);
  if (memory && memory.rev === rev) return memory.catalog;
  const catalog = await buildCatalog();
  memory = { rev, catalog };
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
