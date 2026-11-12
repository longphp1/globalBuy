import Link from "next/link";
import type { Site } from "@/lib/types";
import { JoinProvider } from "@/components/JoinDialog";

export function SiteFrame({ site, children }: { site: Site; children: React.ReactNode }) {
  return (
    <JoinProvider siteName={site.name} siteUrl={site.url}>
      <header>
        <div className="container flex">
          <div className="auto">
            <Link href={`/${site.slug}`} className="logo">
              <h1>{site.name} Spreadsheet</h1>
            </Link>
          </div>
          <div className="nav">
            <a href="#faq">FAQ</a>
            <Link href={`/${site.slug}/howTo`}>How-To</Link>
            <a href={site.url} target="_blank" rel="noreferrer">
              Get more discounts
            </a>
            <a href={site.url} className="btn" target="_blank" rel="noreferrer">
              <span className="inner">Join the {site.name}</span>
            </a>
          </div>
        </div>
      </header>
      {children}
      <section className="help">
        <div className="need">NEED HELP?</div>
        <div className="join">Join the community for 24/7 support!</div>
        <a href={site.url} className="discord" target="_blank" rel="noreferrer">
          Join the {site.name}
        </a>
      </section>
      <footer>
        <div className="container" id="footer">
          <div>&copy; {site.name} Spreadsheet. 2026</div>
          <div>
            <img src="/img/discord.png" alt="" />
            <img src="/img/reddit.png" alt="" />
          </div>
          <div>{site.name} spreadsheet does not sell physical products directly.</div>
          <div>
            Links point to Taobao, Weidian, and buying agents so shoppers can compare listings.
          </div>
        </div>
      </footer>
    </JoinProvider>
  );
}
