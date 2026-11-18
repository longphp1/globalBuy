import { NextResponse } from "next/server";
import { deleteProducts } from "@/lib/admin/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const count = await deleteProducts(body.ids ?? []);
    return NextResponse.json({ count });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Delete failed" }, { status: 400 });
  }
}
