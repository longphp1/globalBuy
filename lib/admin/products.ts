import * as XLSX from "xlsx";
import { getDb, now, touch, uniqueSlug, type SqlDb } from "@/lib/admin/db";
import { storeMainImage } from "@/lib/admin/images";
import { fetchProductsByUrls } from "@/lib/admin/source";

export type ProductInput = {
  site_id: number;
  menu_id: number;
  page?: number;
  range?: number;
  name: string;
  price?: string;
  brand?: string;
  source?: string;
  source_product_id?: string;
  source_product_url?: string;
  main_img?: string;
  img?: string;
  main_buy_link?: string;
  main_buy_platform?: string;
  other_buy_link?: string;
  other_buy_platform?: string;
  note_link?: string;
  note_content?: string;
  tao_buy_platform?: string;
  tao_buy_link?: string;
};

const SORTS = new Set(["id", "name", "price", "brand", "created_at", "range", "page"]);

function text(value: unknown) {
  return value == null ? "" : String(value);
}

function cleanBrand(value: string) {
  return value.replace(/[\r\n,，.]/g, "").trim();
}

function sourceFromUrl(url: string) {
  try {
    const parsed = new URL(url, "https://weidian.com");
    if (url.includes("weidian")) {
      return { source: "WD", source_product_id: parsed.searchParams.get("itemID") ?? "", platform: "weidian" };
    }
    if (url.includes("taobao") || url.includes("tmall")) {
      return { source: "TB", source_product_id: parsed.searchParams.get("id") ?? "", platform: "taobao" };
    }
  } catch {
    return { source: "", source_product_id: "", platform: "" };
  }
  return { source: "", source_product_id: "", platform: "" };
}

function rowToProduct(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    site_id: Number(row.site_id),
    site_name: text(row.site_name),
    menu_id: Number(row.menu_id),
    menu_name: text(row.menu_name),
    page: Number(row.page || 1),
    range: Number(row.range || 1),
    name: text(row.name),
    price: text(row.price),
    brand: text(row.brand),
    source: text(row.source),
    source_product_id: text(row.source_product_id),
    source_product_url: text(row.source_product_url),
    main_img: text(row.main_img),
    img: text(row.img),
    main_buy_link: text(row.main_buy_link),
    main_buy_platform: text(row.main_buy_platform),
    other_buy_link: text(row.other_buy_link),
    other_buy_platform: text(row.other_buy_platform),
    note_link: text(row.note_link),
    note_content: text(row.note_content),
    tao_buy_platform: text(row.tao_buy_platform),
    tao_buy_link: text(row.tao_buy_link),
    slug: text(row.slug),
    created_at: text(row.created_at),
    updated_at: text(row.updated_at),
  };
}

const SELECT = `SELECT p.*, s.name AS site_name, m.name AS menu_name
  FROM products p
  LEFT JOIN sites s ON s.id = p.site_id
  LEFT JOIN menus m ON m.id = p.menu_id`;

export async function listMeta() {
  const db = await getDb();
  return {
    sites: await db.prepare("SELECT id, catalog_id, name FROM sites ORDER BY id").all(),
    menus: await db.prepare("SELECT id, site_id, name FROM menus ORDER BY id").all(),
    brands: (await db
      .prepare("SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand != '' ORDER BY brand")
      .all())
      .map((row) => text(row.brand)),
  };
}

export async function listProducts(query: {
  name?: string;
  brand?: string;
  menuId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  field?: string;
  order?: string;
}) {
  const db = await getDb();
  const where: string[] = [];
  const args: unknown[] = [];
  if (query.name) {
    where.push("p.name LIKE ?");
    args.push(`%${query.name}%`);
  }
  if (query.brand) {
    where.push("p.brand LIKE ?");
    args.push(`%${query.brand}%`);
  }
  if (query.menuId) {
    where.push("p.menu_id = ?");
    args.push(Number(query.menuId));
  }
  if (query.from) {
    where.push("p.created_at >= ?");
    args.push(`${query.from} 00:00:00`);
  }
  if (query.to) {
    where.push("p.created_at <= ?");
    args.push(`${query.to} 23:59:59`);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const field = SORTS.has(query.field || "") ? query.field : "id";
  const order = query.order === "asc" ? "ASC" : "DESC";
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 15));
  const total = Number((await db.prepare(`SELECT COUNT(*) AS count FROM products p ${clause}`).get(...args))?.count ?? 0);
  const rows = (await db
    .prepare(`${SELECT} ${clause} ORDER BY p.${field} ${order} LIMIT ? OFFSET ?`)
    .all(...args, limit, (page - 1) * limit))
    .map(rowToProduct);
  return { total, page, limit, data: rows };
}

export async function getProduct(id: number) {
  const db = await getDb();
  const row = await db.prepare(`${SELECT} WHERE p.id = ?`).get(id);
  return row ? rowToProduct(row) : null;
}

async function normalize(input: ProductInput, db: SqlDb, id = 0) {
  const name = input.name.trim();
  if (!name) throw new Error("请填写商品名称");
  if (!input.site_id || !input.menu_id) throw new Error("请选择网站和分类");
  const menu = await db.prepare(`SELECT m.id FROM menus m
    JOIN sites menu_site ON menu_site.id = m.site_id
    JOIN sites chosen ON chosen.id = ?
    WHERE m.id = ? AND menu_site.catalog_id = chosen.catalog_id`).get(input.site_id, input.menu_id);
  if (!menu) throw new Error("分类不属于所选网站");
  const sourceUrl = (input.source_product_url || input.main_buy_link || "").trim();
  const parsed = sourceUrl ? sourceFromUrl(sourceUrl) : { source: "", source_product_id: "", platform: "" };
  const stamp = now();
  return {
    site_id: Number(input.site_id),
    menu_id: Number(input.menu_id),
    page: Number(input.page || 1),
    range: Number(input.range || 1),
    name,
    price: input.price ?? "",
    brand: cleanBrand(input.brand ?? ""),
    source: (input.source || parsed.source || input.main_buy_platform || "").trim(),
    source_product_id: (input.source_product_id || parsed.source_product_id || "").trim(),
    source_product_url: sourceUrl,
    main_img: input.main_img ?? "",
    img: input.img ?? "",
    main_buy_link: (input.main_buy_link || sourceUrl).trim(),
    main_buy_platform: (input.main_buy_platform || parsed.platform || "").trim(),
    other_buy_link: input.other_buy_link ?? "",
    other_buy_platform: input.other_buy_platform ?? "",
    note_link: input.note_link ?? "",
    note_content: input.note_content ?? "",
    tao_buy_platform: input.tao_buy_platform ?? "",
    tao_buy_link: input.tao_buy_link ?? "",
    slug: await uniqueSlug(db, name, id),
    updated_at: stamp,
    created_at: stamp,
  };
}

export async function createProduct(input: ProductInput) {
  const db = await getDb();
  const data = await normalize(input, db);
  data.main_img = await storeMainImage(data.slug, data.main_img);
  const result = await db.prepare(`INSERT INTO products (
    site_id, menu_id, page, range, name, price, brand, source, source_product_id, source_product_url,
    main_img, img, main_buy_link, main_buy_platform, other_buy_link, other_buy_platform, note_link,
    note_content, tao_buy_platform, tao_buy_link, slug, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    data.site_id, data.menu_id, data.page, data.range, data.name, data.price, data.brand, data.source,
    data.source_product_id, data.source_product_url, data.main_img, data.img, data.main_buy_link,
    data.main_buy_platform, data.other_buy_link, data.other_buy_platform, data.note_link, data.note_content,
    data.tao_buy_platform, data.tao_buy_link, data.slug, data.created_at, data.updated_at,
  );
  await touch(db);
  return getProduct(Number(result.lastInsertRowid));
}

export async function updateProduct(id: number, input: ProductInput) {
  const db = await getDb();
  const current = await db.prepare("SELECT id, slug, created_at FROM products WHERE id = ?").get(id);
  if (!current) return null;
  const data = await normalize(input, db, id);
  const slug = text(current.slug) || data.slug;
  data.main_img = await storeMainImage(slug, data.main_img);
  await db.prepare(`UPDATE products SET
    site_id=?, menu_id=?, page=?, range=?, name=?, price=?, brand=?, source=?, source_product_id=?,
    source_product_url=?, main_img=?, img=?, main_buy_link=?, main_buy_platform=?, other_buy_link=?,
    other_buy_platform=?, note_link=?, note_content=?, tao_buy_platform=?, tao_buy_link=?, slug=?, updated_at=?
    WHERE id=?`).run(
    data.site_id, data.menu_id, data.page, data.range, data.name, data.price, data.brand, data.source,
    data.source_product_id, data.source_product_url, data.main_img, data.img, data.main_buy_link,
    data.main_buy_platform, data.other_buy_link, data.other_buy_platform, data.note_link, data.note_content,
    data.tao_buy_platform, data.tao_buy_link, slug, data.updated_at, id,
  );
  await touch(db);
  return getProduct(id);
}

export async function deleteProducts(ids: number[]) {
  const db = await getDb();
  const unique = [...new Set(ids.map(Number).filter((id) => id > 0))];
  if (!unique.length) throw new Error("Select products to delete");
  const placeholders = unique.map(() => "?").join(",");
  const result = await db.prepare(`DELETE FROM products WHERE id IN (${placeholders})`).run(...unique);
  await touch(db);
  return result.changes;
}

export async function changeBrand(oldBrand: string, newBrand: string) {
  const from = oldBrand.trim();
  const to = cleanBrand(newBrand);
  if (!from || !to) throw new Error("Enter the original brand and the new brand");
  const db = await getDb();
  const result = await db.prepare("UPDATE products SET brand = ?, updated_at = ? WHERE brand = ?").run(to, now(), from);
  await touch(db);
  return result.changes;
}

const EXPORT_HEADER = [
  "分类(Category)",
  "品牌(Brand)",
  "商品名称(Name)",
  "价格(Price)",
  "主图(Main Image)",
  "子图(Img)",
  "主购买链接(Main Buy Link)",
  "主购买平台(Main Buy Platform)",
  "其他购买链接(Other Buy Links)",
  "其他购买平台(Other Buy Platforms)",
  "Note Link",
  "Note Content",
  "来源(Source)",
  "来源商品ID(Source Product ID)",
  "来源商品URL(Source Product URL)",
];

export async function exportWorkbook() {
  const db = await getDb();
  const rows = (await db.prepare(`${SELECT} ORDER BY p.id DESC`).all()).map(rowToProduct);
  const sheet = [EXPORT_HEADER, ...rows.map((item) => [
    item.menu_name,
    item.brand,
    item.name,
    item.price,
    item.main_img,
    item.img,
    item.main_buy_link,
    item.main_buy_platform,
    item.other_buy_link,
    item.other_buy_platform,
    item.note_link,
    item.note_content,
    item.source,
    item.source_product_id,
    item.source_product_url,
  ])];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(sheet), "products");
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function sheetRows(file: Buffer) {
  const book = XLSX.read(file, { type: "buffer" });
  const sheet = book.Sheets[book.SheetNames[0]];
  return XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1, raw: false, defval: "" });
}

function isUrlHeader(header: (string | number | null)[]) {
  const first = text(header[0]);
  return first.includes("来源商品URL") || /source product url/i.test(first);
}

function looksLikeProductUrl(value: string) {
  return /1688\.com|weidian\.com|taobao\.com|tmall\.com|tb\.cn/i.test(value);
}

function isExportHeader(header: (string | number | null)[]) {
  const first = text(header[0]);
  return first.includes("分类") || /category/i.test(first);
}

export async function importWorkbook(file: Buffer, siteId: number, menuId: number) {
  const rows = sheetRows(file);
  if (!rows.length) throw new Error("文件内容为空");
  const header = rows[0] ?? [];
  if (isUrlHeader(header)) return importBySourceUrl(rows.slice(1), siteId, menuId);
  const filled = rows.map((cells) => text(cells[0]).trim()).filter(Boolean);
  if (filled.length && filled.every(looksLikeProductUrl)) return importBySourceUrl(rows, siteId, menuId);
  if (isExportHeader(header)) return importNamedRows(rows.slice(1), header.map((cell) => text(cell)), siteId);
  return importIndexedRows(rows.slice(1), siteId);
}

function importIndexedRows(rows: (string | number | null)[][], fallbackSiteId: number) {
  return writeImported(rows.map((cells) => ({
    menuName: text(cells[0]).trim(),
    brand: cleanBrand(text(cells[1])),
    name: text(cells[2]).trim(),
    price: text(cells[3]).trim(),
    main_img: text(cells[4]),
    img: text(cells[5]),
    source_product_url: text(cells[6]),
    tao_buy_link: text(cells[7]),
    siteId: fallbackSiteId,
  })));
}

function importNamedRows(rows: (string | number | null)[][], header: string[], fallbackSiteId: number) {
  const index = (name: string) => header.findIndex((item) => item.toLowerCase().includes(name.toLowerCase()));
  const at = (cells: (string | number | null)[], key: string) => {
    const position = index(key);
    return position >= 0 ? text(cells[position]) : "";
  };
  return writeImported(rows.map((cells) => ({
    menuName: at(cells, "分类") || at(cells, "category"),
    brand: cleanBrand(at(cells, "品牌") || at(cells, "brand")),
    name: (at(cells, "商品名称") || at(cells, "name")).trim(),
    price: (at(cells, "价格") || at(cells, "price")).trim(),
    main_img: at(cells, "主图") || at(cells, "main image"),
    img: at(cells, "子图") || at(cells, "img"),
    main_buy_link: at(cells, "主购买链接") || at(cells, "main buy link"),
    main_buy_platform: at(cells, "主购买平台") || at(cells, "main buy platform"),
    other_buy_link: at(cells, "其他购买链接"),
    other_buy_platform: at(cells, "其他购买平台"),
    note_link: at(cells, "note link"),
    note_content: at(cells, "note content"),
    source: at(cells, "来源(") || at(cells, "source)"),
    source_product_id: at(cells, "来源商品ID") || at(cells, "source product id"),
    source_product_url: at(cells, "来源商品URL") || at(cells, "source product url") || at(cells, "来源链接"),
    tao_buy_link: at(cells, "Tao"),
    siteId: fallbackSiteId,
  })));
}

async function writeImported(items: Record<string, string | number>[]) {
  const db = await getDb();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const stamp = now();
  const ready: { existingId: number; payload: Record<string, string | number> }[] = [];
  for (const item of items) {
    const name = text(item.name).trim();
    const price = text(item.price).trim();
    if (!name || !price) {
      skipped += 1;
      continue;
    }
    const menu = await db.prepare("SELECT id, site_id FROM menus WHERE name = ? ORDER BY id LIMIT 1").get(text(item.menuName));
    if (!menu) {
      skipped += 1;
      continue;
    }
    const sourceUrl = text(item.source_product_url || item.main_buy_link);
    const parsed = sourceUrl ? sourceFromUrl(sourceUrl) : { source: "", source_product_id: "", platform: "" };
    const existing = await db.prepare("SELECT id, slug FROM products WHERE name = ?").get(name);
    const slug = existing ? text(existing.slug) : await uniqueSlug(db, name);
    const payload = {
      site_id: Number(menu.site_id),
      menu_id: Number(menu.id),
      name,
      price,
      brand: text(item.brand),
      main_img: await storeMainImage(slug, text(item.main_img)),
      img: text(item.img),
      source: text(item.source) || parsed.source,
      source_product_id: text(item.source_product_id) || parsed.source_product_id,
      source_product_url: sourceUrl,
      main_buy_link: text(item.main_buy_link) || sourceUrl,
      main_buy_platform: text(item.main_buy_platform) || parsed.platform || "weidian",
      other_buy_link: text(item.other_buy_link),
      other_buy_platform: text(item.other_buy_platform),
      note_link: text(item.note_link),
      note_content: text(item.note_content),
      tao_buy_platform: text(item.tao_buy_link) ? "Open TaooBuy Link" : "",
      tao_buy_link: text(item.tao_buy_link),
      slug,
    };
    ready.push({ existingId: existing ? Number(existing.id) : 0, payload });
  }
  await db.exec("BEGIN");
  try {
    for (const item of ready) {
      const payload = item.payload;
      if (item.existingId) {
        await db.prepare(`UPDATE products SET brand=?, price=?, main_img=?, img=?, source=?, source_product_id=?,
          source_product_url=?, main_buy_link=?, main_buy_platform=?, other_buy_link=?, other_buy_platform=?,
          note_link=?, note_content=?, tao_buy_platform=?, tao_buy_link=?, updated_at=? WHERE id=?`).run(
          payload.brand, payload.price, payload.main_img, payload.img, payload.source, payload.source_product_id,
          payload.source_product_url, payload.main_buy_link, payload.main_buy_platform, payload.other_buy_link,
          payload.other_buy_platform, payload.note_link, payload.note_content, payload.tao_buy_platform,
          payload.tao_buy_link, stamp, item.existingId,
        );
        updated += 1;
      } else {
        const maxRange = Number((await db.prepare("SELECT MAX(range) AS range FROM products WHERE menu_id = ?").get(payload.menu_id))?.range ?? 0) + 1;
        await db.prepare(`INSERT INTO products (
          site_id, menu_id, page, range, name, price, brand, source, source_product_id, source_product_url,
          main_img, img, main_buy_link, main_buy_platform, other_buy_link, other_buy_platform, note_link,
          note_content, tao_buy_platform, tao_buy_link, slug, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
          payload.site_id, payload.menu_id, Math.ceil(maxRange / 100), maxRange, payload.name, payload.price,
          payload.brand, payload.source, payload.source_product_id, payload.source_product_url, payload.main_img,
          payload.img, payload.main_buy_link, payload.main_buy_platform, payload.other_buy_link, payload.other_buy_platform,
          payload.note_link, payload.note_content, payload.tao_buy_platform, payload.tao_buy_link,
          payload.slug, stamp, stamp,
        );
        created += 1;
      }
    }
    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
  await touch(db);
  return { created, updated, skipped, failed: 0 };
}

async function importBySourceUrl(rows: (string | number | null)[][], siteId: number, menuId: number) {
  const db = await getDb();
  const menu = await db.prepare(`SELECT m.id FROM menus m
    JOIN sites menu_site ON menu_site.id = m.site_id
    JOIN sites chosen ON chosen.id = ?
    WHERE m.id = ? AND menu_site.catalog_id = chosen.catalog_id`).get(siteId, menuId);
  if (!menu) throw new Error("链接导入请先选择商品分类");
  const urls = rows.map((cells) => text(cells[0]).trim()).filter(Boolean);
  if (!urls.length) throw new Error("没有可导入的商品链接");
  const fetched = await fetchProductsByUrls(urls, 5);
  let created = 0;
  let updated = 0;
  const failed = [...fetched.skipped];
  const stamp = now();
  const ready: { existingId: number; slug: string; mainImg: string; product: NonNullable<(typeof fetched.results)[number]["product"]> }[] = [];
  for (const item of fetched.results) {
    if (!item.success || !item.product) {
      failed.push({ url: item.url, error: item.error || "未知错误" });
      continue;
    }
    const product = item.product;
    const existing = await db.prepare(`SELECT id, slug FROM products WHERE site_id = ? AND menu_id = ? AND (
      (source_product_id != '' AND source_product_id = ?) OR (source_product_url != '' AND source_product_url = ?)
    )`).get(siteId, menuId, product.source_product_id, product.source_product_url);
    const slug = existing ? text(existing.slug) : await uniqueSlug(db, product.name);
    ready.push({
      existingId: existing ? Number(existing.id) : 0,
      slug,
      mainImg: await storeMainImage(slug, product.main_img),
      product,
    });
  }
  await db.exec("BEGIN");
  try {
    for (const item of ready) {
      const product = item.product;
      if (item.existingId) {
        await db.prepare(`UPDATE products SET name=?, brand=?, price=?, source=?, source_product_id=?, source_product_url=?,
          main_img=?, img=?, main_buy_link=?, main_buy_platform=?, updated_at=? WHERE id=?`).run(
          product.name, product.brand, product.price, product.source, product.source_product_id,
          product.source_product_url, item.mainImg, product.img, product.main_buy_link,
          product.main_buy_platform, stamp, item.existingId,
        );
        updated += 1;
      } else {
        const maxRange = Number((await db.prepare("SELECT MAX(range) AS range FROM products WHERE site_id = ? AND menu_id = ?").get(siteId, menuId))?.range ?? 0) + 1;
        await db.prepare(`INSERT INTO products (
          site_id, menu_id, page, range, name, price, brand, source, source_product_id, source_product_url,
          main_img, img, main_buy_link, main_buy_platform, other_buy_link, other_buy_platform, note_link,
          note_content, tao_buy_platform, tao_buy_link, slug, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '', '', '', '', ?, ?, ?)`).run(
          siteId, menuId, Math.ceil(maxRange / 100), maxRange, product.name, product.price, product.brand,
          product.source, product.source_product_id, product.source_product_url, item.mainImg, product.img,
          product.main_buy_link, product.main_buy_platform, item.slug, stamp, stamp,
        );
        created += 1;
      }
    }
    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
  await touch(db);
  if (!created && !updated) throw new Error(failed[0]?.error || "没有可导入的商品链接");
  return { created, updated, skipped: 0, failed: failed.length, errors: failed.slice(0, 5) };
}
