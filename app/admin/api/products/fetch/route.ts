import { NextResponse } from "next/server";
import { fetchProductByUrl } from "@/lib/admin/source";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const product = await fetchProductByUrl(String(body.url ?? ""));
    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "抓取失败" }, { status: 400 });
  }
}
