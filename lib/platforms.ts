import type { Product } from "@/lib/types";

const TEMPLATES: { match: RegExp; template: string }[] = [
  { match: /taoobuy|taoo/, template: "{tao_buy_link}" },
  { match: /kakobuy|kako/, template: "https://kakobuy.com/item/details?url={原始链接}" },
  { match: /mulebuy/, template: "https://mulebuy.com/product?id={商品ID}&platform=WEIDIAN&searchInfo={原始链接}" },
  { match: /joyagoo/, template: "https://joyagoo.com/product?id={商品ID}&platform=WEIDIAN" },
  { match: /oopbuy/, template: "https://oopbuy.com/product/weidian/{商品ID}" },
  { match: /hooby|hoobuy/, template: "https://hoobuy.com/product/2/{商品ID}" },
  { match: /cnfans/, template: "https://cnfans.com/product?id={商品ID}&platform=WEIDIAN" },
  { match: /cssbuy/, template: "https://www.cssbuy.com/item-micro-{商品ID}.html" },
  { match: /acbuy/, template: "https://acbuy.com/product?id={商品ID}&source=WD" },
  { match: /alchinabuy|allchinabuy/, template: "https://www.allchinabuy.com/en/page/buy/?nTag=Home-search&from=search-input&_search=url&position=&url={原始链接}" },
  { match: /superbuy/, template: "https://www.superbuy.com/en/page/buy/?nTag=Home-search&from=search-input&url={原始链接}" },
];

export function defaultBuyLink(name: string, slug = "") {
  const key = `${name} ${slug}`.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return TEMPLATES.find((item) => item.match.test(key))?.template ?? "";
}

export function productBuyUrl(
  template: string,
  product: Pick<Product, "sourceProductId" | "sourceProductUrl" | "taoBuyLink">,
) {
  const value = template.trim();
  if (!value) return "";
  return value
    .replaceAll("{tao_buy_link}", product.taoBuyLink)
    .replaceAll("{商品ID}", encodeURIComponent(product.sourceProductId))
    .replaceAll("{原始链接}", encodeURIComponent(product.sourceProductUrl));
}
