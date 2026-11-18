import { NextResponse } from "next/server";
import { listMeta } from "@/lib/admin/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listMeta());
}
