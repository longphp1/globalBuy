import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const PRODUCTS_DIR = path.join(process.cwd(), "public", "products");
const MAX_BYTES = 12 * 1024 * 1024;

function imageSlug(slug: string) {
  const clean = slug.trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(clean)) throw new Error("商品标识无效，无法保存主图");
  return clean;
}

function targetFor(slug: string) {
  const safe = imageSlug(slug);
  const dir = path.join(PRODUCTS_DIR, safe);
  return { dir, file: path.join(dir, "main.png"), publicPath: `/products/${safe}/main.png` };
}

function readOnly(error: unknown) {
  const code = (error as NodeJS.ErrnoException).code;
  const message = error instanceof Error ? error.message : "";
  return code === "EROFS" || code === "EACCES" || code === "EPERM" || /read-only|EROFS/i.test(message);
}

function ensureDir(dir: string) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (error) {
    if (readOnly(error)) throw new Error("当前环境不能把商品主图写入 public/products，请在本机新增或导入商品");
    throw error;
  }
}

function imageReferer(url: string) {
  try {
    const host = new URL(url).hostname;
    if (host.includes("geilicdn.com") || host.includes("weidian.com")) return "https://weidian.com/";
    if (host.includes("alicdn.com") || host.includes("1688.com") || host.includes("taobao.com") || host.includes("tmall.com")) {
      return "https://detail.1688.com/";
    }
  } catch {
    return "";
  }
  return "";
}

async function downloadImage(url: string) {
  const referers = [imageReferer(url), ""].filter((value, index, list) => list.indexOf(value) === index);
  let last = "请求失败";
  for (const referer of referers) {
    try {
      const headers: Record<string, string> = {
        Accept: "image/jpeg,image/png,image/webp,image/gif,image/*;q=0.8",
        "User-Agent": "Mozilla/5.0",
      };
      if (referer) headers.Referer = referer;
      const response = await fetch(url, { redirect: "follow", headers, signal: AbortSignal.timeout(30000) });
      if (response.ok) return response;
      last = `HTTP ${response.status}`;
      if (response.status !== 401 && response.status !== 403) return response;
    } catch (error) {
      last = error instanceof Error ? error.message : "请求失败";
    }
  }
  throw new Error(last);
}

function localFile(imagePath: string) {
  const file = path.resolve(process.cwd(), "public", imagePath.replace(/^\/+/, ""));
  const root = path.resolve(PRODUCTS_DIR);
  if (file !== root && !file.startsWith(root + path.sep)) return "";
  return fs.existsSync(file) ? file : "";
}

export async function storeMainImage(slug: string, source: string) {
  const current = source.trim();
  if (!current) return "";
  const target = targetFor(slug);
  if (current.startsWith("/products/")) {
    const existing = localFile(current);
    if (!existing) throw new Error(`商品主图文件不存在：${current}`);
    if (existing === target.file) return target.publicPath;
    ensureDir(target.dir);
    fs.copyFileSync(existing, target.file);
    return target.publicPath;
  }
  if (!/^https?:\/\//i.test(current)) return current;

  let response: Response;
  try {
    response = await downloadImage(current);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "请求失败";
    throw new Error(`商品主图下载失败：${detail}`);
  }
  if (!response.ok) throw new Error(`商品主图下载失败：HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error("商品主图下载失败：文件为空");
  if (bytes.length > MAX_BYTES) throw new Error("商品主图下载失败：文件超过 12MB");
  let png: Buffer;
  try {
    png = await sharp(bytes, { failOn: "none" }).png().toBuffer();
  } catch (error) {
    const detail = error instanceof Error ? error.message : "无法转换";
    throw new Error(`商品主图无法保存为 PNG：${detail}`);
  }
  ensureDir(target.dir);
  for (const name of fs.readdirSync(target.dir)) {
    if (name.startsWith("main.") && name !== "main.png") fs.unlinkSync(path.join(target.dir, name));
  }
  try {
    fs.writeFileSync(target.file, png);
  } catch (error) {
    if (readOnly(error)) throw new Error("当前环境不能把商品主图写入 public/products，请在本机新增或导入商品");
    throw error;
  }
  return target.publicPath;
}
