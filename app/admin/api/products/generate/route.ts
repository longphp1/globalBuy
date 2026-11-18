import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { generateWebsite } from "@/lib/admin/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  try {
    const result = await generateWebsite();
    revalidatePath("/", "layout");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "更新失败" }, { status: 400 });
  }
}
