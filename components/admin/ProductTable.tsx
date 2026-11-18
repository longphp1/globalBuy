"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Product = {
  id: number;
  menu_name: string;
  name: string;
  brand: string;
  price: string;
  source: string;
  source_product_id: string;
  source_product_url: string;
  main_img: string;
  created_at: string;
};

type Meta = { menus: { id: number; name: string }[]; brands: string[] };

export function ProductTable() {
  const [meta, setMeta] = useState<Meta>({ menus: [], brands: [] });
  const [rows, setRows] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [configOpen, setConfigOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiBase, setApiBase] = useState("https://api.hiobuy.com");
  const [configMessage, setConfigMessage] = useState("");
  const [configSaving, setConfigSaving] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [oldBrand, setOldBrand] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [brandMessage, setBrandMessage] = useState("");
  const [brandSaving, setBrandSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filters, setFilters] = useState({ name: "", brand: "", menuId: "", from: "", to: "" });

  const load = useCallback(async (nextPage = page, nextFilters = filters) => {
    const params = new URLSearchParams({ page: String(nextPage), limit: "15", ...nextFilters });
    const response = await fetch(`/admin/api/products?${params}`);
    const body = await response.json();
    setRows(body.data ?? []);
    setTotal(body.total ?? 0);
    setPage(body.page ?? nextPage);
    setSelected([]);
  }, [filters, page]);

  useEffect(() => {
    fetch("/admin/api/products/meta").then((response) => response.json()).then(setMeta);
    load(1, filters);
    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: number) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function openConfig() {
    setConfigMessage("");
    setConfigOpen(true);
    const response = await fetch("/admin/api/products/hiobuy");
    const body = await response.json();
    setApiKey(body.apiKey ?? "");
    setApiBase(body.apiBase || "https://api.hiobuy.com");
  }

  async function saveConfig(event: React.FormEvent) {
    event.preventDefault();
    setConfigSaving(true);
    setConfigMessage("");
    const response = await fetch("/admin/api/products/hiobuy", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, apiBase }),
    });
    const body = await response.json();
    setConfigSaving(false);
    if (!response.ok) {
      setConfigMessage(body.message);
      return;
    }
    setConfigMessage("已保存");
  }

  async function generateProject() {
    if (!window.confirm("将丢弃本地未提交的修改，拉取 main 最新代码，重新生成网站并推送到远程仓库。确定更新网站吗？")) return;
    setGenerating(true);
    setMessage("");
    try {
      const response = await fetch("/admin/api/products/generate", { method: "POST" });
      const body = await response.json();
      setMessage(body.message || (response.ok ? "更新网站完成" : "更新失败"));
    } catch {
      setMessage("更新失败");
    } finally {
      setGenerating(false);
    }
  }

  function openBrand() {
    setOldBrand("");
    setNewBrand("");
    setBrandMessage("");
    setBrandOpen(true);
  }

  async function saveBrand(event: React.FormEvent) {
    event.preventDefault();
    setBrandSaving(true);
    setBrandMessage("");
    const response = await fetch("/admin/api/products/brand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldBrand, newBrand }),
    });
    const body = await response.json();
    setBrandSaving(false);
    if (!response.ok) {
      setBrandMessage(body.message);
      return;
    }
    setBrandMessage(`已修改 ${body.count} 条`);
    const metaResponse = await fetch("/admin/api/products/meta");
    setMeta(await metaResponse.json());
    load(page, filters);
  }

  async function remove(ids: number[]) {
    if (!ids.length) {
      setMessage("请选择要删除的商品");
      return;
    }
    if (!window.confirm(ids.length > 1 ? "确定删除选中的商品吗？" : "确定删除该商品吗？")) return;
    const response = await fetch("/admin/api/products/batch-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const body = await response.json();
    setMessage(response.ok ? `已删除 ${body.count} 条` : body.message);
    if (response.ok) load(page, filters);
  }

  const pages = Math.max(1, Math.ceil(total / 15));

  return (
    <>
      <div className="admin-card">
        <form className="admin-filters" onSubmit={(event) => { event.preventDefault(); load(1, filters); }}>
          <label className="admin-field">商品名称
            <input value={filters.name} onChange={(event) => setFilters({ ...filters, name: event.target.value })} />
          </label>
          <label className="admin-field">品牌
            <select value={filters.brand} onChange={(event) => setFilters({ ...filters, brand: event.target.value })}>
              <option value="">请选择</option>
              {meta.brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
            </select>
          </label>
          <label className="admin-field">分类
            <select value={filters.menuId} onChange={(event) => setFilters({ ...filters, menuId: event.target.value })}>
              <option value="">请选择</option>
              {meta.menus.map((menu) => <option key={menu.id} value={menu.id}>{menu.name}</option>)}
            </select>
          </label>
          <label className="admin-field">开始时间
            <input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
          </label>
          <label className="admin-field">结束时间
            <input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
          </label>
          <button className="admin-btn" type="submit">查询</button>
          <button className="admin-btn ghost" type="button" onClick={() => { const empty = { name: "", brand: "", menuId: "", from: "", to: "" }; setFilters(empty); load(1, empty); }}>重置</button>
        </form>
      </div>
      <div className="admin-card">
        <div className="admin-actions" style={{ marginBottom: 12 }}>
          <Link className="admin-link" href="/admin/products/new">新增商品</Link>
          <button className="admin-btn" type="button" onClick={openConfig}>HioBuy配置</button>
          <Link className="admin-link ghost" href="/admin/products/website">网站配置</Link>
          <button className="admin-btn" type="button" disabled={generating} onClick={generateProject}>{generating ? "更新中" : "更新网站"}</button>
          <button className="admin-btn danger" type="button" onClick={() => remove(selected)}>删除商品</button>
          <a className="admin-link ghost" href="/admin/api/products/export">导出</a>
          <Link className="admin-link ghost" href="/admin/products/import">导入</Link>
          <button className="admin-btn ghost" type="button" onClick={openBrand}>修改品牌</button>
        </div>
        {message ? <p className="admin-note">{message}</p> : null}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th></th><th>ID</th><th>分类</th><th>商品名称</th><th>品牌</th><th>价格</th><th>来源</th><th>商品ID</th><th>商品链接</th><th>图片</th><th>创建时间</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} /></td>
                  <td>{row.id}</td>
                  <td>{row.menu_name}</td>
                  <td>{row.name}</td>
                  <td>{row.brand}</td>
                  <td>{row.price}</td>
                  <td>{row.source}</td>
                  <td>{row.source_product_id}</td>
                  <td>{row.source_product_url ? <a href={row.source_product_url} target="_blank" rel="noreferrer">打开</a> : ""}</td>
                  <td>{row.main_img ? <img src={row.main_img} alt="" /> : ""}</td>
                  <td>{row.created_at}</td>
                  <td>
                    <Link href={`/admin/products/${row.id}/edit`}>编辑</Link>
                    {" "}
                    <button className="admin-btn danger" type="button" onClick={() => remove([row.id])}>删除商品</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-pager">
          <span className="admin-note">共 {total} 条</span>
          <div className="admin-actions">
            <button className="admin-btn ghost" type="button" disabled={page <= 1} onClick={() => load(page - 1, filters)}>上一页</button>
            <span>{page} / {pages}</span>
            <button className="admin-btn ghost" type="button" disabled={page >= pages} onClick={() => load(page + 1, filters)}>下一页</button>
          </div>
        </div>
      </div>
      {generating ? <div className="admin-loading" role="status">正在同步代码并更新网站....</div> : null}
      {brandOpen ? (
        <div className="admin-modal-backdrop" onClick={() => setBrandOpen(false)}>
          <form className="admin-modal" role="dialog" aria-label="修改品牌" onClick={(event) => event.stopPropagation()} onSubmit={saveBrand}>
            <h2>修改品牌</h2>
            <label className="admin-field">原品牌
              <select required value={oldBrand} onChange={(event) => setOldBrand(event.target.value)}>
                <option value="">请选择</option>
                {meta.brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
              </select>
            </label>
            <label className="admin-field">新品牌
              <input required value={newBrand} onChange={(event) => setNewBrand(event.target.value)} />
            </label>
            {brandMessage ? <p className={brandMessage.startsWith("已修改") ? "admin-ok" : "admin-error"}>{brandMessage}</p> : null}
            <div className="admin-actions">
              <button className="admin-btn" disabled={brandSaving} type="submit">{brandSaving ? "保存中" : "提交"}</button>
              <button className="admin-btn ghost" type="button" onClick={() => setBrandOpen(false)}>取消</button>
            </div>
          </form>
        </div>
      ) : null}
      {configOpen ? (
        <div className="admin-modal-backdrop" onClick={() => setConfigOpen(false)}>
          <form className="admin-modal" role="dialog" aria-label="HioBuy 配置" onClick={(event) => event.stopPropagation()} onSubmit={saveConfig}>
            <h2>HioBuy 配置</h2>
            <label className="admin-field">API Key
              <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" />
            </label>
            <label className="admin-field">接口地址
              <input value={apiBase} onChange={(event) => setApiBase(event.target.value)} />
            </label>
            {configMessage ? <p className={configMessage === "已保存" ? "admin-ok" : "admin-error"}>{configMessage}</p> : null}
            <div className="admin-actions">
              <button className="admin-btn" disabled={configSaving} type="submit">{configSaving ? "保存中" : "保存"}</button>
              <button className="admin-btn ghost" type="button" onClick={() => setConfigOpen(false)}>取消</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
