import fs from "node:fs";
import path from "node:path";
import { getDb, touch, type SqlDb } from "@/lib/admin/db";
import { invalidatePublishedCatalog } from "@/lib/store";

export type WebsiteLanguage = { code: string; label: string };
export type WebsiteSite = { id: number; catalogId: number; slug: string; name: string; url: string; title: string };
export type WebsiteConfig = {
  pageSize: number;
  defaultLanguage: string;
  languages: WebsiteLanguage[];
  sites: WebsiteSite[];
};

const DEFAULT_LANGUAGES: WebsiteLanguage[] = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
];

function text(value: unknown) {
  return value == null ? "" : String(value);
}

function meta(db: SqlDb, key: string) {
  return text(db.prepare("SELECT value FROM meta WHERE key = ?").get(key)?.value);
}

function writeMeta(db: SqlDb, key: string, value: string) {
  db.prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}

function productSlug(name: string, id: number) {
  const slug = name.replace(/[^a-zA-Z0-9 ]/g, "").toLowerCase().replace(/ /g, "-").replace(/^-+|-+$/g, "");
  return slug || `product-${id}`;
}

export async function getWebsiteConfig(): Promise<WebsiteConfig> {
  const db = await getDb();
  const storedLanguages = meta(db, "website_languages");
  let languages = DEFAULT_LANGUAGES;
  if (storedLanguages) {
    try {
      const parsed = JSON.parse(storedLanguages) as WebsiteLanguage[];
      if (Array.isArray(parsed) && parsed.length) languages = parsed;
    } catch {
      languages = DEFAULT_LANGUAGES;
    }
  }
  const sites = db.prepare("SELECT id, catalog_id, slug, name, url, title FROM sites ORDER BY id").all().map((row) => ({
    id: Number(row.id),
    catalogId: Number(row.catalog_id),
    slug: text(row.slug),
    name: text(row.name),
    url: text(row.url),
    title: text(row.title),
  }));
  return {
    pageSize: Math.max(1, Number(meta(db, "website_page_size")) || 50),
    defaultLanguage: meta(db, "website_default_language") || "en",
    languages,
    sites,
  };
}

function siteSlug(name: string, slug: string) {
  const typed = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (typed) return typed;
  const fromName = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return fromName || "site";
}

export async function saveWebsiteConfig(input: Partial<WebsiteConfig> & { removedIds?: number[] }) {
  const pageSize = Number(input.pageSize);
  const defaultLanguage = text(input.defaultLanguage).trim();
  const languages = (input.languages ?? []).map((item) => ({ code: text(item.code).trim(), label: text(item.label).trim() })).filter((item) => item.code && item.label);
  const sites = input.sites ?? [];
  if (!Number.isFinite(pageSize) || pageSize < 1) throw new Error("请填写每页商品数量");
  if (!defaultLanguage) throw new Error("请填写默认语言");
  if (!languages.length) throw new Error("请填写语言");
  if (!sites.length) throw new Error("请至少保留一个网站");
  const db = await getDb();
  const slugs = new Set<string>();
  const catalogId = Number(db.prepare("SELECT catalog_id FROM sites ORDER BY id LIMIT 1").get()?.catalog_id) || 1;
  db.exec("BEGIN");
  try {
    const kept = new Set<number>();
    let nextId = Number(db.prepare("SELECT MAX(id) AS id FROM sites").get()?.id) || 0;
    for (const site of sites) {
      const name = text(site.name).trim();
      const slug = siteSlug(name, text(site.slug));
      if (!name) throw new Error("请填写网站名称");
      if (slugs.has(slug)) throw new Error("网站标识不能重复");
      slugs.add(slug);
      const url = text(site.url).trim();
      const title = text(site.title).trim();
      const current = site.id > 0 ? db.prepare("SELECT id FROM sites WHERE id = ?").get(site.id) : undefined;
      if (current) {
        db.prepare("UPDATE sites SET slug = ?, name = ?, url = ?, title = ? WHERE id = ?").run(slug, name, url, title, site.id);
        kept.add(site.id);
      } else {
        nextId += 1;
        db.prepare("INSERT INTO sites (id, catalog_id, slug, name, url, title) VALUES (?, ?, ?, ?, ?, ?)").run(nextId, catalogId, slug, name, url, title);
        kept.add(nextId);
      }
    }
    for (const id of [...new Set((input.removedIds ?? []).map(Number).filter((item) => item > 0))]) {
      if (kept.has(id)) continue;
      const products = Number(db.prepare("SELECT COUNT(*) AS count FROM products WHERE site_id = ?").get(id)?.count ?? 0);
      const menus = Number(db.prepare("SELECT COUNT(*) AS count FROM menus WHERE site_id = ?").get(id)?.count ?? 0);
      if (products || menus) throw new Error("该网站仍有商品或分类，不能删除");
      db.prepare("DELETE FROM sites WHERE id = ?").run(id);
    }
    writeMeta(db, "website_page_size", String(Math.floor(pageSize)));
    writeMeta(db, "website_default_language", defaultLanguage);
    writeMeta(db, "website_languages", JSON.stringify(languages));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  touch(db);
  return getWebsiteConfig();
}

function copyFavicon(name: string, slug: string) {
  const sourceDir = "/Users/xiaoxiaolu/work/tongxiao/lpadmin/public/baseNew";
  if (!fs.existsSync(sourceDir)) return;
  const match = fs.readdirSync(sourceDir).find((file) => file.toLowerCase() === `${name.toLowerCase()}.ico`);
  if (!match) return;
  const destDir = path.join(process.cwd(), "public", "favicons");
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(path.join(sourceDir, match), path.join(destDir, `${slug}.ico`));
}

export async function generateWebsite() {
  const db = await getDb();
  const config = await getWebsiteConfig();
  if (!config.sites.length) throw new Error("There is no website to generate");
  const catalogs: Record<string, { menus: { name: string; nameEn: string; url: string }[]; products: Record<string, unknown>[] }> = {};
  for (const site of config.sites) {
    const key = String(site.catalogId);
    if (catalogs[key]) continue;
    const menus = db.prepare(`SELECT m.id, m.name, m.url FROM menus m
      JOIN sites s ON s.id = m.site_id
      WHERE s.catalog_id = ?
      ORDER BY m.id`).all(site.catalogId);
    const menuById = new Map(menus.map((menu) => [Number(menu.id), menu]));
    const products = db.prepare(`SELECT p.* FROM products p
      JOIN sites s ON s.id = p.site_id
      WHERE s.catalog_id = ?
      ORDER BY p.id DESC`).all(site.catalogId);
    const seen = new Set<string>();
    const rows = [];
    for (const product of products) {
      const id = Number(product.id);
      const slug = text(product.slug) || productSlug(text(product.name), id);
      if (seen.has(slug)) continue;
      seen.add(slug);
      const menu = menuById.get(Number(product.menu_id));
      rows.push({
        id,
        slug,
        name: text(product.name),
        price: text(product.price),
        brand: text(product.brand) || "Other",
        menuName: text(menu?.name) || "Home",
        menuUrl: text(menu?.url) || "home",
        image: text(product.main_img),
        sourceProductId: text(product.source_product_id),
        sourceProductUrl: text(product.source_product_url),
        taoBuyLink: text(product.tao_buy_link),
      });
    }
    catalogs[key] = {
      menus: menus.map((menu) => ({ name: text(menu.name), nameEn: text(menu.name), url: text(menu.url) })),
      products: rows,
    };
  }
  const generatedAt = new Date().toISOString();
  const payload = {
    pageSize: config.pageSize,
    generatedAt,
    defaultLanguage: config.defaultLanguage,
    languages: config.languages,
    catalogs,
    sites: config.sites.map((site) => ({
      slug: site.slug,
      name: site.name,
      url: site.url,
      title: site.title || site.name,
      siteId: String(site.catalogId),
    })),
  };
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const target = path.join(dataDir, "catalog.json");
  const temp = path.join(dataDir, "catalog.json.tmp");
  fs.writeFileSync(temp, JSON.stringify(payload));
  fs.renameSync(temp, target);
  invalidatePublishedCatalog();
  for (const site of config.sites) copyFavicon(site.name, site.slug);
  writeMeta(db, "website_generated_at", generatedAt);
  touch(db);
  const productCount = Object.values(catalogs).reduce((sum, catalog) => sum + catalog.products.length, 0);
  return { sites: config.sites.length, products: productCount, file: "data/catalog.json" };
}
