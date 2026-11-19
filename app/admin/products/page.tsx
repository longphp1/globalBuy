import { ProductTable } from "@/components/admin/ProductTable";

export default function ProductsPage() {
  return <ProductTable canUpdate={!process.env.VERCEL} />;
}
