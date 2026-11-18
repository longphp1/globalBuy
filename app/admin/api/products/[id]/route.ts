import { NextResponse } from "next/server";
import { deleteProducts, getProduct, updateProduct } from "@/lib/admin/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const product = await getProduct(Number(id));
  if (!product) return NextResponse.json({ message: "商品不存在" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const product = await updateProduct(Number(id), await request.json());
    if (!product) return NextResponse.json({ message: "商品不存在" }, { status: 404 });
    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "保存失败" }, { status: 400 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await deleteProducts([Number(id)]);
  return NextResponse.json({ ok: true });
}
