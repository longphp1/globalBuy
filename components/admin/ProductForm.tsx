"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Menu = { id: number; site_id: number; name: string };
type Site = { id: number; catalog_id: number; name: string };

const empty = {
  site_id: "",
  menu_id: "",
  name: "",
  brand: "",
  price: "",
  source: "",
  source_product_id: "",
  source_product_url: "",
  img: "",
  main_img: "",
  main_buy_platform: "",
  main_buy_link: "",
  tao_buy_platform: "",
  tao_buy_link: "",
  note_link: "",
  note_content: "",
  page: "1",
  range: "1",
};

export function ProductForm({ id }: { id?: number }) {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [form, setForm] = useState(empty);
  const [fetchUrl, setFetchUrl] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [siteName, setSiteName] = useState("");

  useEffect(() => {
    fetch("/admin/api/products/meta").then((response) => response.json()).then((meta) => {
      setSites(meta.sites ?? []);
      setMenus(meta.menus ?? []);
    });
    if (!id) return;
    fetch(`/admin/api/products/${id}`).then((response) => response.json()).then((body) => {
      const product = body.product;
      if (!product) return;
      setForm({
        site_id: String(product.site_id ?? ""),
        menu_id: String(product.menu_id ?? ""),
        name: product.name ?? "",
        brand: product.brand ?? "",
        price: product.price ?? "",
        source: product.source ?? "",
        source_product_id: product.source_product_id ?? "",
        source_product_url: product.source_product_url ?? "",
        img: product.img ?? "",
        main_img: product.main_img ?? "",
        main_buy_platform: product.main_buy_platform ?? "",
        main_buy_link: product.main_buy_link ?? "",
        tao_buy_platform: product.tao_buy_platform ?? "",
        tao_buy_link: product.tao_buy_link ?? "",
        note_link: product.note_link ?? "",
        note_content: product.note_content ?? "",
        page: String(product.page ?? 1),
        range: String(product.range ?? 1),
      });
    });
  }, [id]);

  function set(name: keyof typeof empty, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function fetchSource() {
    setFetching(true);
    setMessage("");
    try {
      const response = await fetch("/admin/api/products/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: fetchUrl }),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body.message);
        return;
      }
      setForm((current) => ({ ...current, ...Object.fromEntries(Object.entries(body.product).map(([key, value]) => [key, String(value ?? "")])) }));
      setMessage("已填入商品信息");
    } finally {
      setFetching(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const typedSite = sites.find((site) => site.name.toLowerCase() === siteName.trim().toLowerCase());
    const siteId = id ? Number(form.site_id) : typedSite?.id;
    if (!siteId) {
      setSaving(false);
      setMessage("请填写已有网站");
      return;
    }
    const payload = { ...form, site_id: siteId, menu_id: Number(form.menu_id), page: Number(form.page), range: Number(form.range) };
    const response = await fetch(id ? `/admin/api/products/${id}` : "/admin/api/products", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    setSaving(false);
    if (!response.ok) {
      setMessage(body.message);
      return;
    }
    router.push("/admin/products");
    router.refresh();
  }

  const selected = id
    ? sites.find((site) => site.id === Number(form.site_id))
    : sites.find((site) => site.name.toLowerCase() === siteName.trim().toLowerCase());
  const visibleMenus = menus.filter((menu) => {
    if (!selected) return true;
    const owner = sites.find((site) => site.id === menu.site_id);
    return owner?.catalog_id === selected.catalog_id;
  });
  const fields: [keyof typeof empty, string][] = [
    ["name", "商品名称"],
    ["brand", "品牌"],
    ["price", "价格"],
    ["source", "来源"],
    ["source_product_id", "商品ID"],
    ["source_product_url", "商品链接"],
    ["main_img", "主图"],
    ["img", "子图"],
    ["main_buy_platform", "购买平台"],
    ["main_buy_link", "购买链接"],
    ["tao_buy_platform", "taoobuy"],
    ["tao_buy_link", "Tao 链接"],
    ["note_link", "注释链接"],
    ["note_content", "注释内容"],
    ["page", "页码"],
    ["range", "排序"],
  ];

  return (
    <form className="admin-card" onSubmit={save}>
      <div className="admin-grid">
        <label className="admin-field">网站
          {id ? (
            <select required value={form.site_id} onChange={(event) => set("site_id", event.target.value)}>
              <option value="">请选择</option>
              {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
            </select>
          ) : (
            <input required value={siteName} placeholder="请输入网站" onChange={(event) => setSiteName(event.target.value)} />
          )}
        </label>
        <label className="admin-field">分类
          <select required value={form.menu_id} onChange={(event) => set("menu_id", event.target.value)}>
            <option value="">请选择</option>
            {visibleMenus.map((menu) => <option key={menu.id} value={menu.id}>{menu.name}</option>)}
          </select>
        </label>
      </div>
      <div className="admin-actions" style={{ margin: "12px 0" }}>
        <label className="admin-field wide">来源商品链接
          <input value={fetchUrl} placeholder="1688、淘宝或微店商品地址" onChange={(event) => setFetchUrl(event.target.value)} />
        </label>
        <button className="admin-btn" type="button" disabled={fetching} onClick={fetchSource}>{fetching ? "Loading...." : "抓取商品"}</button>
      </div>
      <div className="admin-grid">
        {fields.map(([name, label]) => (
          <label className="admin-field" key={name}>{label}
            {name === "note_content" || name === "img" ? (
              <textarea value={form[name]} onChange={(event) => set(name, event.target.value)} />
            ) : (
              <input required={name === "name"} value={form[name]} onChange={(event) => set(name, event.target.value)} />
            )}
          </label>
        ))}
      </div>
      {fetching ? <div className="admin-loading" role="status">Loading....</div> : null}
      {message ? <p className={message.startsWith("已") ? "admin-ok" : "admin-error"}>{message}</p> : null}
      <div className="admin-actions" style={{ marginTop: 16 }}>
        <button className="admin-btn" disabled={saving} type="submit">{saving ? "保存中" : "提交"}</button>
        <button className="admin-btn ghost" type="button" onClick={() => router.push("/admin/products")}>返回</button>
      </div>
    </form>
  );
}
