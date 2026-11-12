import Link from "next/link";
import { JoinButton } from "@/components/JoinDialog";
import { productSlugPath } from "@/lib/catalog";
import type { Product, Site } from "@/lib/types";

export function ProductCard({ site, product }: { site: Site; product: Product }) {
  const href = productSlugPath(site.slug, product.slug);
  return (
    <div className="item">
      <a href={href} target="_blank" className="thumbnail" rel="noreferrer">
        <img src={product.image} alt={product.name} />
      </a>
      <div className="bottom">
        <div className="name">
          <a href={href} target="_blank" rel="noreferrer">
            {product.name}
          </a>
        </div>
        <div className="price">
          <a href={href} target="_blank" rel="noreferrer">
            ${product.price}
          </a>
        </div>
        <a href={href} target="_blank" className="buy" rel="noreferrer">
          View details and Buy on {site.name}
        </a>
        <JoinButton className="join-btn">Join {site.name} for more discounts</JoinButton>
      </div>
    </div>
  );
}

export function RelatedCard({ site, product }: { site: Site; product: Product }) {
  const href = productSlugPath(site.slug, product.slug);
  return (
    <div className="item">
      <a href={href} className="thumbnail">
        <img src={product.image} alt={product.name} />
      </a>
      <div className="bottom">
        <div className="name">
          <Link href={href}>{product.name}</Link>
        </div>
        <div className="price">${product.price}</div>
        <Link href={href} className="buy">
          View details
        </Link>
      </div>
    </div>
  );
}
