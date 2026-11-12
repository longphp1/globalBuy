import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyActions } from "@/components/BuyActions";
import { RelatedCard } from "@/components/ProductCard";
import {
  findProduct,
  getSite,
  getSiteCatalog,
  listingPath,
  relatedProducts,
} from "@/lib/catalog";
import type { MenuItem } from "@/lib/types";

export function ProductDetail({ siteSlug, slug }: { siteSlug: string; slug: string }) {
  const site = getSite(siteSlug);
  if (!site) notFound();
  const data = getSiteCatalog(site);
  const product = findProduct(data.products, slug);
  if (!product) notFound();
  const related = relatedProducts(data.products, product);
  const menuHref =
    product.menuUrl === "home"
      ? `/${site.slug}`
      : listingPath(site.slug, product.menuUrl, "All");
  const brandHref = listingPath(site.slug, product.menuUrl === "home" ? "home" : product.menuUrl, product.brand);

  return (
    <>
      <section className="breadcrumbs">
        <div className="container">
          <h3>
            <Link href={`/${site.slug}`}>{site.name} Spreadsheet</Link>
            <span>/</span>
            <Link href={menuHref}>{product.menuName}</Link>
            <span>/</span>
            <Link href={brandHref}>{product.brand}</Link>
            <span>/</span>
            <span>{product.name}</span>
          </h3>
        </div>
      </section>
      <section className="products">
        <div className="color-title">
          <span>
            <Link href={brandHref}>{product.brand}</Link>
          </span>
          <h1>
            You can buy this {product.name} go to {site.name}
          </h1>
        </div>
        <DetailTabs menus={data.menus} siteSlug={site.slug} activeUrl={product.menuUrl} />
        <div className="detail">
          <div className="detail-img">
            <img src={product.image} alt={product.name} />
          </div>
          <div className="detail-info">
            <div className="best">Best Selling</div>
            <div className="price">${product.price}</div>
            <h1 className="name">{product.name}</h1>
            <BuyActions product={product} />
          </div>
        </div>
        <div className="container extension">
          <div className="text">
            Important！ How to bypass <br /> “Non - purchasable item” warning automatically!
          </div>
          <a
            href="https://chromewebstore.google.com/detail/risk-reminder-remover/afgegfoedkeffjkkkjkbpnegceleakeo?hl=zh-CN&utm_source=ext_sidebar"
            className="link"
            target="_blank"
            rel="noreferrer"
          >
            <img src="/img/chrome.svg" alt="" />
            <span>Download chrome extension</span>
          </a>
        </div>
        <div className="container">
          <div className="sub-title">
            <Link href={brandHref}>{related.title} Product More</Link>
          </div>
          <div className="related grid-5">
            {related.items.map((item) => (
              <RelatedCard key={item.slug} site={site} product={item} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function DetailTabs({
  menus,
  siteSlug,
  activeUrl,
}: {
  menus: MenuItem[];
  siteSlug: string;
  activeUrl: string;
}) {
  return (
    <div className="tab">
      {menus.map((menu) => {
        const href = menu.url === "home" ? `/${siteSlug}` : listingPath(siteSlug, menu.url, "All");
        return (
          <Link key={menu.url} href={href} className={menu.url === activeUrl ? "active" : "no"}>
            <h2>{menu.name}</h2>
          </Link>
        );
      })}
    </div>
  );
}
