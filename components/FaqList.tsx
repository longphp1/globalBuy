"use client";

import { useState } from "react";
import { faqItems } from "@/lib/faq";

export function FaqList({ siteName }: { siteName: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const items = faqItems(siteName);

  return (
    <section className="faq" id="faq">
      <div className="color-title">
        <span>FAQ</span>
      </div>
      <div className="list" id="faq-list">
        {items.map((item, index) => (
          <div
            className={`item flex${openIndex === index ? " active" : ""}`}
            key={item.question}
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          >
            <img src="/img/plus.png" alt="" />
            <div className="auto">
              <div className="question">{item.question}</div>
              <div className="answer">{item.answer}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
