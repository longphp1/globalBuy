import Link from "next/link";
import "./admin.css";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root">
      <header className="admin-top">
        <Link className="admin-brand" href="/admin/products">Site admin</Link>
        <nav>
          <Link href="/admin/products">Products</Link>
          <Link href="/">Back to site</Link>
        </nav>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
