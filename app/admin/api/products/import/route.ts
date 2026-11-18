import { NextResponse } from "next/server";
import { importWorkbook } from "@/lib/admin/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const siteId = Number(form.get("site_id") || 0);
    const menuId = Number(form.get("menu_id") || 0);
    if (!(file instanceof File)) return NextResponse.json({ message: "请先选择商品文件" }, { status: 400 });
    const result = await importWorkbook(Buffer.from(await file.arrayBuffer()), siteId, menuId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "导入失败" }, { status: 400 });
  }
}
