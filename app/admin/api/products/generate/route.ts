import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { publishWebsite } from "@/lib/admin/publish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  try {
    const result = await publishWebsite();
    revalidatePath("/", "layout");
    return NextResponse.json(result);
  } catch (error) {
    revalidatePath("/", "layout");
    return NextResponse.json({ message: error instanceof Error ? error.message : "Update failed" }, { status: 400 });
  }
}
