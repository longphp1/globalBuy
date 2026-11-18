import { NextResponse } from "next/server";
import { getWebsiteConfig, saveWebsiteConfig } from "@/lib/admin/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json(await getWebsiteConfig());
}

export async function PUT(request: Request) {
  try {
    return NextResponse.json(await saveWebsiteConfig(await request.json()));
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "保存失败" }, { status: 400 });
  }
}
