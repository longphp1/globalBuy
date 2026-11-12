import type { PlatformLink, Product } from "@/lib/types";

export function platformLinks(product: Product): PlatformLink[] {
  const id = product.sourceProductId;
  const source = product.sourceProductUrl;
  return [
    {
      name: "TaooBuy",
      letter: "T",
      logo: "/img/taoobuy.png",
      href: product.taoBuyLink,
      recommended: true,
    },
    {
      name: "KakoBuy",
      letter: "K",
      logo: "/img/kakobuy.png",
      href: `https://kakobuy.com/item/details?url=${source}`,
    },
    {
      name: "Mulebuy",
      letter: "M",
      logo: "/img/mulebuy.png",
      href: `https://mulebuy.com/product?id=${id}&platform=WEIDIAN&searchInfo=${source}`,
    },
    {
      name: "JoyagooBuy",
      letter: "J",
      logo: "/img/joyagoo.png",
      href: `https://joyagoo.com/product?id=${id}&platform=WEIDIAN`,
    },
    {
      name: "oopBuy",
      letter: "O",
      logo: "/img/oopbuy.png",
      href: `https://oopbuy.com/product/weidian/${id}`,
    },
    {
      name: "Hooby",
      letter: "H",
      logo: "/img/hoobuy.png",
      href: `https://hoobuy.com/product/2/${id}`,
    },
    {
      name: "CnfansBuy",
      letter: "C",
      logo: "/img/cnfans.png",
      href: `https://cnfans.com/product?id=${id}&platform=WEIDIAN`,
    },
    {
      name: "CssBuy",
      letter: "C",
      logo: "/img/css.png",
      href: `https://www.cssbuy.com/item-micro-${id}.html`,
    },
    {
      name: "AcBuy",
      letter: "A",
      logo: "/img/acbuy.png",
      href: `https://acbuy.com/product?id=${id}&source=WD`,
    },
    {
      name: "AlChinaBuy",
      letter: "A",
      logo: "/img/allchinabuy.png",
      href: `https://www.allchinabuy.com/en/page/buy/?nTag=Home-search&from=search-input&_search=url&position=&url=${source}`,
    },
    {
      name: "SuperBuy",
      letter: "S",
      logo: "/img/superbuy.png",
      href: `https://www.superbuy.com/en/page/buy/?nTag=Home-search&from=search-input&url=${source}`,
    },
  ];
}
