import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandTags } from "@/components/BrandTags";
import { FaqList } from "@/components/FaqList";
import { ProductCard } from "@/components/ProductCard";
import {
  brandList,
  catalog,
  filterProducts,
  getSite,
  getSiteCatalog,
  listingPath,
} from "@/lib/catalog";
import type { MenuItem, Site } from "@/lib/types";

export function listingTitle(siteName: string, brand: string) {
  return `${siteName} spreadsheet 2025 Fall/${brand}`;
}

export function ProductListing({
  siteSlug,
  menuUrl,
  brand,
  page,
}: {
  siteSlug: string;
  menuUrl: string;
  brand: string;
  page: number;
}) {
  const site = getSite(siteSlug);
  if (!site || page < 1) notFound();
  const data = getSiteCatalog(site);
  const menu = data.menus.find((item) => item.url === menuUrl);
  if (!menu && menuUrl !== "home") notFound();
  const menuName = menu?.name ?? "Home";
  const brands = brandList(data.products, menuUrl);
  if (!brands.includes(brand)) notFound();

  const filtered = filterProducts(data.products, menuUrl, brand);
  const pageSize = catalog.pageSize || 50;
  const maxPage = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (page > maxPage) notFound();
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <>
      <section className="products">
        <Intro site={site} menuName={menuName} menuUrl={menuUrl} />
        <CategoryTabs menus={data.menus} siteSlug={site.slug} activeUrl={menuUrl} />
        <BrandTags siteSlug={site.slug} menuUrl={menuUrl} brands={brands} active={brand} />
        <div className="list">
          {items.map((product) => (
            <ProductCard key={product.slug} site={site} product={product} />
          ))}
        </div>
        <Pagination
          siteSlug={site.slug}
          menuUrl={menuUrl}
          brand={brand}
          page={page}
          maxPage={maxPage}
          total={filtered.length}
        />
      </section>
      {menuUrl === "home" && brand === "All" ? <FaqList siteName={site.name} /> : null}
    </>
  );
}

function Intro({ site, menuName, menuUrl }: { site: Site; menuName: string; menuUrl: string }) {
  if (menuUrl === "home") {
    return (
      <div className="color-title">
        <span>
          <Link href={`/${site.slug}`}>{site.name}</Link>
        </span>
        <div className="textDesc">
          <p>
            1、The website is a {site.name} spreadsheet containing over 5,000+ {site.name} popular
            Chinese products. New and cheap products are updated every day.
          </p>
          <p>2、You can use &quot;Ctrl+D&quot; to add this {site.name} spreadsheet to your bookmarks list.</p>
          <p>3、You need to “join discord” to receive messages or communicate with us in time.</p>
          <h4 className="special-offer">
            <a href={site.url} target="_blank" rel="noreferrer">
              Special Partnership Offer(welcome Bonus): Register Now to Receive $140 in Coupons +10 off
              Shipping
            </a>
          </h4>
        </div>
      </div>
    );
  }

  return (
    <div className="color-title">
      <span>{menuName}</span>
      <div className="textDesc">
        <h1>
          <p>
            This spreadsheet displays {menuName} from {site.name}. We update this page with more {menuName}{" "}
            daily.
          </p>
          <p>
            You can use &quot;Ctrl+D&quot; to add this {site.name} spreadsheet {menuName} list to your
            bookmarks list.
          </p>
          <p>
            We sincerely wish you that you can find your favorite {menuName} on this {site.name} spreadsheet
          </p>
        </h1>
      </div>
    </div>
  );
}

function CategoryTabs({
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
        const href =
          menu.url === "home" ? `/${siteSlug}` : listingPath(siteSlug, menu.url, "All");
        return (
          <Link key={menu.url} href={href} className={menu.url === activeUrl ? "active" : "no"}>
            <h2>{menu.name}</h2>
          </Link>
        );
      })}
    </div>
  );
}

function Pagination({
  siteSlug,
  menuUrl,
  brand,
  page,
  maxPage,
  total,
}: {
  siteSlug: string;
  menuUrl: string;
  brand: string;
  page: number;
  maxPage: number;
  total: number;
}) {
  return (
    <div className="pagination container">
      <span className="item">
        Total Page: {maxPage} Total Elements: {total}
      </span>
      {page > 1 ? (
        <Link className="item" href={listingPath(siteSlug, menuUrl, brand, page - 1)}>
          Previous
        </Link>
      ) : null}
      <span className="item">{page}</span>
      {page < maxPage ? (
        <Link className="item" href={listingPath(siteSlug, menuUrl, brand, page + 1)}>
          Next
        </Link>
      ) : null}
    </div>
  );
}
