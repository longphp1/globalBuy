import Link from "next/link";
import { FaqList } from "@/components/FaqList";
import type { Site } from "@/lib/types";

const steps = [
  {
    tag: "Finding the items",
    title: "Step 1",
    blocks: [
      { heading: "Method 1", text: "You can check to find the goods you like or interested in Taobao www.taobao.com, Tmall www.tianmao.com, 1688 www.1688.com, Weidian www.weidian.com." },
      { heading: "Method 2", text: "You can use Reddit, Discord, Instagram, TikTok, and YouTube. Search for {name}, follow communities, and look through spreadsheets to find links to products you like." },
    ],
  },
  {
    tag: "Using product links",
    title: "Step 2",
    blocks: [
      { text: "Once you've decided on a product link, copy and paste it into the search box on the {name} website. You can also open the product from this spreadsheet and choose a buying platform. Select the color, size, and version, and leave a note if you have special requirements." },
      { text: "Items may have different versions or batches. Compare photos and details before you choose the version you want." },
    ],
  },
  {
    tag: "View QC item photos",
    title: "Step 3",
    blocks: [
      { text: "To check actual photos instead of stock images, paste the original product link into a QC photo gallery. Review the item from several angles before you ship it." },
    ],
  },
  {
    tag: "Calculate the cost",
    title: "Step 4",
    blocks: [
      { text: "{name} and most agents offer an estimator after you add items to the cart. Check weight, dimensions, and shipping cost. Removing a shoebox or choosing a different line changes the total." },
    ],
  },
  {
    tag: "Submit your order",
    title: "Step 5",
    blocks: [
      { text: "Add the items to your cart, fill in the checkout details, agree to the terms, and pay. If a payment method is unavailable, top up the balance and pay with that balance." },
    ],
  },
  {
    tag: "Order processing and shipping",
    title: "Step 6",
    blocks: [
      { text: "After you place an order it moves from pending, to purchased, to seller shipped, and then to warehouse received. Use the domestic tracking number while the parcel is still in China." },
    ],
  },
  {
    tag: "Quality check and shipping options",
    title: "Step 7",
    blocks: [
      { text: "When the item reaches the warehouse you receive QC photos. After you accept the item, choose a shipping line. Faster lines usually cost more." },
    ],
  },
  {
    tag: "Complete shipping",
    title: "Step 8",
    blocks: [
      { text: "Confirm the shipment after you are satisfied with the QC photos and shipping option. The warehouse packs the parcel and sends a tracking number." },
      { text: "That is the full path for buying through {name}: find the item here, open it on an agent, check the photos, then ship it. Happy shopping." },
    ],
  },
];

export function HowToGuide({ site }: { site: Site }) {
  return (
    <>
      <section className="breadcrumbs">
        <div className="container">
          <Link href={`/${site.slug}`}>{site.name} Spreadsheet</Link>
          <span>/</span>
          <span>How-To</span>
        </div>
      </section>
      <section className="how-to">
        <div className="title">
          Welcome to a comprehensive <br /> guide on purchasing from <br />
          {site.name}
        </div>
        <div className="links">
          <a href={site.url} className="colorful" target="_blank" rel="noreferrer">
            SIGN UP HERE
          </a>
        </div>
        <img src="/img/how-to-taobao.png" alt="" />
      </section>
      <section className="how-to-list">
        <div className="title">How do I buy from {site.name}</div>
        {steps.map((step) => (
          <div className="item flex" key={step.title}>
            <div className="step">
              <span className="tag">{step.tag}</span>
              <div className="number">{step.title}</div>
            </div>
            <div className="auto">
              {step.blocks.map((block) => (
                <div key={block.text}>
                  {"heading" in block ? <div className="sub-title">{block.heading}</div> : null}
                  <div className="text">{block.text.replaceAll("{name}", site.name)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
      <FaqList siteName={site.name} />
      <section className="purchase">
        <a href={site.url} target="_blank" rel="noreferrer">
          <img src="/img/purchase.png" alt="" />
        </a>
      </section>
    </>
  );
}
