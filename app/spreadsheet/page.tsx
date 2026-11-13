import type { Metadata } from "next";
import Link from "next/link";
import { catalog } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Global Buy Spreadsheets",
  description: "Shopping spreadsheets for Acbuy, Cnfans, Kakobuy, Mulebuy, TaooBuy, and Weidian.",
};

export default function SpreadsheetPage() {
  return (
    <>
      <header>
        <div className="container flex">
          <div className="auto">
            <Link href="/spreadsheet" className="logo">
              <h1>Global Buy</h1>
            </Link>
          </div>
        </div>
      </header>
      <section className="products">
        <div className="color-title">
          <span>Spreadsheets</span>
          <div className="textDesc">
            <p>Choose an agent spreadsheet. Each one keeps the same finds, categories, and buying flow.</p>
          </div>
        </div>
        {catalog.sites.length === 0 ? (
          <div className="container extension">
            <div className="text">
              Run php artisan generate:website_next in the lpadmin project to fill this site.
            </div>
          </div>
        ) : (
          <div className="list">
            {catalog.sites.map((site) => (
              <Link key={site.slug} href={`/${site.slug}`} className="item">
                <div className="bottom">
                  <div className="name">{site.name} Spreadsheet</div>
                  <div className="price">{site.title}</div>
                  <span className="buy">Open {site.name}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
