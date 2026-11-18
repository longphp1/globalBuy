import { NextResponse } from "next/server";
import { createProduct, listProducts } from "@/lib/admin/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await listProducts({
    name: url.searchParams.get("name") || "",
    brand: url.searchParams.get("brand") || "",
    menuId: url.searchParams.get("menuId") || "",
    from: url.searchParams.get("from") || "",
    to: url.searchParams.get("to") || "",
    page: Number(url.searchParams.get("page") || 1),
    limit: Number(url.searchParams.get("limit") || 15),
    field: url.searchParams.get("field") || "id",
    order: url.searchParams.get("order") || "desc",
  });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const product = await createProduct(body);
    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "保存失败" }, { status: 400 });
  }
}
