import Link from "next/link";
import "./admin.css";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root">
      <header className="admin-top">
        <Link className="admin-brand" href="/admin/products">网站管理</Link>
        <nav>
          <Link href="/admin/products">网站商品</Link>
          <Link href="/">返回网站</Link>
        </nav>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
