"use client";

import { JoinButton } from "@/components/JoinDialog";
import { productBuyUrl } from "@/lib/platforms";
import type { Product } from "@/lib/types";

export function BuyActions({ product, buyLink }: { product: Product; buyLink: string }) {
  const href = productBuyUrl(buyLink, product);

  async function copyLink() {
    const text = product.sourceProductUrl;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const input = document.createElement("textarea");
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    window.alert(`${text} copied successfully`);
  }

  return (
    <>
      <a
        href={href || undefined}
        className="btn buy"
        target="_blank"
        rel="noreferrer"
        onClick={(event) => {
          if (!href) event.preventDefault();
        }}
      >
        Select Buy On Platform
      </a>
      <a
        href="#"
        className="btn copy"
        onClick={(event) => {
          event.preventDefault();
          void copyLink();
        }}
      >
        Copy original link
      </a>
      <JoinButton className="join-btn btn">Join discord for more discounts</JoinButton>
    </>
  );
}
