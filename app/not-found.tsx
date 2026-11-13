import Link from "next/link";

export default function NotFound() {
  return (
    <section className="products">
      <div className="color-title">
        <span>Not found</span>
        <div className="textDesc">
          <p>This page is not in the spreadsheet.</p>
          <p>
            <Link href="/">Back to TaooBuy</Link>
            {" · "}
            <Link href="/spreadsheet">All spreadsheets</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
