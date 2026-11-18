import fs from "node:fs";
import path from "node:path";
import { catalog as seedCatalog } from "@/lib/catalog";

type Statement = {
  all: (...args: unknown[]) => Record<string, unknown>[];
  get: (...args: unknown[]) => Record<string, unknown> | undefined;
  run: (...args: unknown[]) => { lastInsertRowid: number | bigint; changes: number };
};

export type SqlDb = {
  exec: (sql: string) => void;
  prepare: (sql: string) => Statement;
};

const globalDb = globalThis as unknown as { adminSql?: SqlDb };

function dbFile() {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "admin.sqlite");
}

function now() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "product";
}

function seed(db: SqlDb) {
  const existing = db.prepare("SELECT COUNT(*) AS count FROM sites").get();
  if (Number(existing?.count ?? 0) > 0) return;

  const stamp = seedCatalog.generatedAt?.slice(0, 19).replace("T", " ") || now();
  const menuIds = new Map<string, number>();
  let menuId = 1;

  db.exec("BEGIN");
  try {
    const insertSite = db.prepare(
      "INSERT INTO sites (id, catalog_id, slug, name, url, title) VALUES (?, ?, ?, ?, ?, ?)",
    );
    const insertMenu = db.prepare(
      "INSERT INTO menus (id, site_id, name, url) VALUES (?, ?, ?, ?)",
    );
    const insertProduct = db.prepare(`INSERT INTO products (
      id, site_id, menu_id, page, range, name, price, brand, source, source_product_id,
      source_product_url, main_img, img, main_buy_link, main_buy_platform, other_buy_link,
      other_buy_platform, note_link, note_content, tao_buy_platform, tao_buy_link, slug,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    const seenCatalogs = new Set<string>();
    seedCatalog.sites.forEach((site, index) => {
      const siteId = index + 1;
      const catalogId = Number(site.siteId) || 1;
      insertSite.run(siteId, catalogId, site.slug, site.name, site.url, site.title);
      if (seenCatalogs.has(String(catalogId))) return;
      seenCatalogs.add(String(catalogId));
      const data = seedCatalog.catalogs[String(catalogId)];
      if (!data) return;
      for (const menu of data.menus) {
        const key = `${catalogId}:${menu.url}`;
        menuIds.set(key, menuId);
        insertMenu.run(menuId, siteId, menu.name, menu.url);
        menuId += 1;
      }
      data.products.forEach((product, indexInCatalog) => {
        const range = indexInCatalog + 1;
        const menuKey = `${catalogId}:${product.menuUrl}`;
        const linkedMenu = menuIds.get(menuKey) ?? menuIds.get(`${catalogId}:home`) ?? 0;
        const source = product.sourceProductUrl.includes("weidian")
          ? "WD"
          : product.sourceProductUrl.includes("taobao")
            ? "TB"
            : "";
        insertProduct.run(
          product.id,
          siteId,
          linkedMenu,
          Math.ceil(range / 100),
          range,
          product.name,
          product.price,
          product.brand,
          source,
          product.sourceProductId,
          product.sourceProductUrl,
          product.image,
          "",
          product.sourceProductUrl,
          source === "WD" ? "weidian" : source === "TB" ? "taobao" : "",
          "",
          "",
          "",
          "",
          product.taoBuyLink ? "Open TaooBuy Link" : "",
          product.taoBuyLink,
          product.slug,
          stamp,
          stamp,
        );
      });
    });
    db.prepare("INSERT INTO meta (key, value) VALUES ('rev', '1')").run();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export async function getDb(): Promise<SqlDb> {
  if (globalDb.adminSql) return globalDb.adminSql;
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(dbFile()) as unknown as SqlDb;
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS sites (
      id INTEGER PRIMARY KEY,
      catalog_id INTEGER NOT NULL,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT,
      title TEXT
    );
    CREATE TABLE IF NOT EXISTS menus (
      id INTEGER PRIMARY KEY,
      site_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      site_id INTEGER NOT NULL,
      menu_id INTEGER NOT NULL,
      page INTEGER,
      range INTEGER,
      name TEXT,
      price TEXT,
      brand TEXT,
      source TEXT,
      source_product_id TEXT,
      source_product_url TEXT,
      main_img TEXT,
      img TEXT,
      main_buy_link TEXT,
      main_buy_platform TEXT,
      other_buy_link TEXT,
      other_buy_platform TEXT,
      note_link TEXT,
      note_content TEXT,
      tao_buy_platform TEXT,
      tao_buy_link TEXT,
      slug TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
    CREATE INDEX IF NOT EXISTS idx_products_menu ON products(menu_id);
  `);
  seed(db);
  globalDb.adminSql = db;
  return db;
}

export function touch(db: SqlDb) {
  const row = db.prepare("SELECT value FROM meta WHERE key = 'rev'").get();
  const next = Number(row?.value ?? 0) + 1;
  db.prepare("INSERT INTO meta (key, value) VALUES ('rev', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(next));
}

export function revision(db: SqlDb) {
  return Number(db.prepare("SELECT value FROM meta WHERE key = 'rev'").get()?.value ?? 0);
}

export function uniqueSlug(db: SqlDb, name: string, ignoreId = 0) {
  const base = slugify(name);
  let slug = base;
  let n = 2;
  while (db.prepare("SELECT id FROM products WHERE slug = ? AND id != ?").get(slug, ignoreId)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

export { now };
