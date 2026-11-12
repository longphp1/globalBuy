"use client";

import { useState } from "react";
import { JoinButton } from "@/components/JoinDialog";
import { platformLinks } from "@/lib/platforms";
import type { Product } from "@/lib/types";

export function BuyActions({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const links = platformLinks(product);

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
        href="#"
        className="btn buy"
        onClick={(event) => {
          event.preventDefault();
          setOpen(true);
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
      <div
        className={`modal-overlay${open ? " active" : ""}`}
        id="modalOverlay"
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <div className="modal-content">
          <div className="modal-header">Please choose a platform</div>
          <ul className="options-list">
            {links.map((item) => (
              <li className="option-item" key={item.name}>
                <a className="platform-info" target="_blank" href={item.href} rel="noreferrer">
                  <span className="platform-letter">{item.letter}</span>
                  <span>
                    <img src={item.logo} alt={item.name} width={120} height={24} />
                  </span>
                  <span className="platform-name">{item.name}</span>
                  {item.recommended ? <span className="platform-badge">REC</span> : null}
                </a>
                <a className="buy-btn" target="_blank" href={item.href} rel="noreferrer">
                  Buy Now
                </a>
              </li>
            ))}
          </ul>
          <div className="modal-footer">
            <button className="close-btn" type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
