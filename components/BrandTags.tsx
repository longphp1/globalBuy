"use client";

import { useState } from "react";
import Link from "next/link";
import { listingPath } from "@/lib/catalog";

export function BrandTags({
  siteSlug,
  menuUrl,
  brands,
  active,
}: {
  siteSlug: string;
  menuUrl: string;
  brands: string[];
  active: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="tag container">
      <div className="flex title">
        <div>Product Categories</div>
        <a
          href="#"
          id="more-collapse"
          onClick={(event) => {
            event.preventDefault();
            setExpanded((value) => !value);
          }}
        >
          {expanded ? "Less" : "More"}
        </a>
      </div>
      <div className="content">
        {brands.map((brand, index) => (
          <span key={brand} className={index >= 18 && !expanded ? "more-tag" : undefined}>
            <Link
              href={listingPath(siteSlug, menuUrl, brand)}
              className={brand === active ? "active" : "no"}
            >
              {brand}
            </Link>
          </span>
        ))}
      </div>
    </div>
  );
}
