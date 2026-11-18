import { NextResponse } from "next/server";
import { getHiobuyConfig, saveHiobuyConfig } from "@/lib/admin/source";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getHiobuyConfig());
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(await saveHiobuyConfig(body));
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Save failed" }, { status: 400 });
  }
}
