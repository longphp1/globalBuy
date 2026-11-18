import { NextResponse } from "next/server";
import { changeBrand } from "@/lib/admin/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const count = await changeBrand(body.oldBrand ?? "", body.newBrand ?? "");
    return NextResponse.json({ count });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Update failed" }, { status: 400 });
  }
}
