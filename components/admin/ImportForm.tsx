"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Menu = { id: number; site_id: number; name: string };
type Site = { id: number; catalog_id: number; name: string };

export function ImportForm() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [siteId, setSiteId] = useState("");
  const [menuId, setMenuId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/admin/api/products/meta").then((response) => response.json()).then((meta) => {
      setSites(meta.sites ?? []);
      setMenus(meta.menus ?? []);
    });
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setMessage("请先选择商品文件");
      return;
    }
    setBusy(true);
    setMessage("");
    const data = new FormData();
    data.set("file", file);
    data.set("site_id", siteId);
    data.set("menu_id", menuId);
    const response = await fetch("/admin/api/products/import", { method: "POST", body: data });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(body.message);
      return;
    }
    router.push("/admin/products");
    router.refresh();
  }

  const selected = sites.find((site) => site.id === Number(siteId));
  const visibleMenus = menus.filter((menu) => {
    if (!selected) return true;
    const owner = sites.find((site) => site.id === menu.site_id);
    return owner?.catalog_id === selected.catalog_id;
  });

  return (
    <form className="admin-card" onSubmit={submit}>
      <p className="admin-note">支持导出的表格，也支持第一列为分类、后续为品牌、名称、价格、主图、子图、来源链接、Tao 链接的表格。只有一列、标题为“来源商品URL”的文件会按商品链接调用接口补全名称、价格和图片，并使用下面选择的网站和分类。</p>
      <div className="admin-grid">
        <label className="admin-field">网站
          <select required value={siteId} onChange={(event) => setSiteId(event.target.value)}>
            <option value="">请选择</option>
            {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
          </select>
        </label>
        <label className="admin-field">分类
          <select required value={menuId} onChange={(event) => setMenuId(event.target.value)}>
            <option value="">请选择</option>
            {visibleMenus.map((menu) => <option key={menu.id} value={menu.id}>{menu.name}</option>)}
          </select>
        </label>
        <label className="admin-field">商品文件
          <input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
      </div>
      {message ? <p className={message.startsWith("新增") ? "admin-ok" : "admin-error"}>{message}</p> : null}
      <button className="admin-btn" disabled={busy} type="submit">{busy ? "导入中" : "提交"}</button>
    </form>
  );
}
