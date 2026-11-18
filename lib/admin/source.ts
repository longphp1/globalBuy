import { getDb } from "@/lib/admin/db";

type SourceProduct = {
  name: string;
  brand: string;
  price: string;
  source: string;
  source_product_id: string;
  source_product_url: string;
  main_img: string;
  img: string;
  main_buy_link: string;
  main_buy_platform: string;
};

export function detectChannel(url: string) {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    host = "";
  }
  const haystack = url.toLowerCase();
  if (host.includes("1688.com") || haystack.includes("1688.com")) return "1688";
  if (host.includes("weidian.com") || haystack.includes("weidian.com")) return "weidian";
  if (
    host.includes("taobao.com") ||
    host.includes("tmall.com") ||
    host.includes("tb.cn") ||
    haystack.includes("taobao.com") ||
    haystack.includes("tmall.com") ||
    haystack.includes("tb.cn")
  ) {
    return "taobao";
  }
  return null;
}

function formatPrice(price: unknown) {
  const numeric = Number(price);
  if (!Number.isFinite(numeric)) return String(price);
  return numeric.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function errorMessage(body: Record<string, unknown>, status: number) {
  const raw = body.message ?? body.error ?? body.msg;
  if (typeof raw === "string" && raw.trim()) return raw;
  if (raw && typeof raw === "object" && typeof (raw as Record<string, unknown>).message === "string") {
    return String((raw as Record<string, unknown>).message);
  }
  return `商品接口返回 ${status}`;
}

function mapProduct(product: Record<string, unknown>, inputUrl: string): SourceProduct {
  const title = (product.title ?? {}) as Record<string, unknown>;
  const name = String(title.translated || title.original || "").trim();
  if (!name) throw new Error("商品接口未返回商品名称");
  const priceInfo = (product.price ?? {}) as Record<string, unknown>;
  const priceValue = priceInfo.promotion_amount ?? priceInfo.display_amount ?? priceInfo.original_amount ?? "";
  if (priceValue === "" || priceValue === null) throw new Error("商品接口未返回商品价格");
  const price = formatPrice(priceValue);
  const images: string[] = [];
  let mainImg = "";
  for (const image of (product.images as unknown[]) ?? []) {
    if (!image || typeof image !== "object") continue;
    const item = image as Record<string, unknown>;
    const imageUrl = String(item.url ?? "").trim();
    if (!imageUrl) continue;
    if (!mainImg && item.type === "main") {
      mainImg = imageUrl;
      continue;
    }
    images.push(imageUrl);
  }
  if (!mainImg && images.length) mainImg = images.shift() ?? "";
  const channel = String(product.channel ?? "");
  const source = channel === "weidian" ? "WD" : channel === "taobao" ? "TB" : channel;
  const platform = channel === "weidian" ? "weidian" : channel === "taobao" ? "taobao" : channel;
  const metadata = (product.metadata ?? {}) as Record<string, unknown>;
  const sourceUrl = String(product.source_url || inputUrl);
  return {
    name,
    brand: typeof metadata.brand === "string" ? metadata.brand.trim() : "",
    price: String(price),
    source,
    source_product_id: String(product.source_product_id ?? ""),
    source_product_url: sourceUrl,
    main_img: mainImg,
    img: images.join(","),
    main_buy_link: sourceUrl,
    main_buy_platform: platform,
  };
}

async function metaValue(key: string) {
  const db = await getDb();
  return String(db.prepare("SELECT value FROM meta WHERE key = ?").get(key)?.value ?? "");
}

export async function getHiobuyConfig() {
  const apiKey = (await metaValue("hiobuy_api_key")) || process.env.HIOBUY_API_KEY || "";
  const apiBase = ((await metaValue("hiobuy_api_base")) || process.env.HIOBUY_API_BASE || "https://api.hiobuy.com").replace(/\/$/, "");
  return { apiKey, apiBase };
}

export async function saveHiobuyConfig(input: { apiKey?: string; apiBase?: string }) {
  const apiKey = String(input.apiKey ?? "").trim();
  const apiBase = String(input.apiBase ?? "").trim().replace(/\/$/, "");
  if (!apiKey) throw new Error("请填写 API Key");
  if (!/^https?:\/\//i.test(apiBase)) throw new Error("请填写有效的接口地址");
  const db = await getDb();
  const write = db.prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  write.run("hiobuy_api_key", apiKey);
  write.run("hiobuy_api_base", apiBase);
  return { apiKey, apiBase };
}

export async function fetchProductByUrl(rawUrl: string): Promise<SourceProduct> {
  let url = rawUrl.trim();
  if (!url) throw new Error("请输入商品链接");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  const channel = detectChannel(url);
  if (!channel) throw new Error("无法识别商品链接，请输入 1688、淘宝或微店的商品地址");
  const { apiKey, apiBase } = await getHiobuyConfig();
  if (!apiKey) throw new Error("未配置 HIOBUY_API_KEY，无法查询商品信息");
  const endpoint = `${apiBase}/v1/products/detail`;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel,
        url,
        language: "en",
        response_format: "standard",
      }),
      signal: AbortSignal.timeout(40000),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "请求失败";
    throw new Error(`商品接口请求失败：${detail}`);
  }
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(errorMessage(body, response.status));
  const product = body.product;
  if (!product || typeof product !== "object") throw new Error("商品接口未返回商品信息");
  return mapProduct(product as Record<string, unknown>, url);
}

export async function fetchProductsByUrls(urls: string[], concurrency = 5) {
  if (!(await getHiobuyConfig()).apiKey) throw new Error("未配置 HIOBUY_API_KEY，无法查询商品信息");
  const results: { url: string; success: boolean; product?: SourceProduct; error?: string }[] = [];
  const skipped: { url: string; error: string }[] = [];
  const queue: { url: string; channel: string }[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    let url = raw.trim();
    if (!url) continue;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    let channel: string | null = null;
    try {
      channel = detectChannel(url);
    } catch {
      channel = null;
    }
    if (!channel) {
      skipped.push({ url, error: "无法识别商品链接" });
      continue;
    }
    if (seen.has(url)) continue;
    seen.add(url);
    queue.push({ url, channel });
  }
  for (let i = 0; i < queue.length; i += concurrency) {
    const chunk = queue.slice(i, i + concurrency);
    const batch = await Promise.all(
      chunk.map(async (item) => {
        try {
          const product = await fetchProductByUrl(item.url);
          return { url: item.url, success: true, product };
        } catch (error) {
          return { url: item.url, success: false, error: error instanceof Error ? error.message : "请求失败" };
        }
      }),
    );
    results.push(...batch);
  }
  return { results, skipped };
}
