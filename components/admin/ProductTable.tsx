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

export function ProductTable({ canUpdate = true }: { canUpdate?: boolean }) {
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
    setConfigMessage("Saved");
  }

  async function generateProject() {
    if (!canUpdate) return;
    if (!window.confirm("This discards uncommitted local changes, pulls the latest main branch, regenerates the website, and pushes it to the remote repository. Update the website?")) return;
    setGenerating(true);
    setMessage("");
    try {
      const response = await fetch("/admin/api/products/generate", { method: "POST" });
      const body = await response.json();
      setMessage(body.message || (response.ok ? "Website updated" : "Update failed"));
    } catch {
      setMessage("Update failed");
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
    setBrandMessage(`Updated ${body.count} items`);
    const metaResponse = await fetch("/admin/api/products/meta");
    setMeta(await metaResponse.json());
    load(page, filters);
  }

  async function remove(ids: number[]) {
    if (!ids.length) {
      setMessage("Select products to delete");
      return;
    }
    if (!window.confirm(ids.length > 1 ? "Delete the selected products?" : "Delete this product?")) return;
    const response = await fetch("/admin/api/products/batch-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const body = await response.json();
    setMessage(response.ok ? `Deleted ${body.count} items` : body.message);
    if (response.ok) load(page, filters);
  }

  const pages = Math.max(1, Math.ceil(total / 15));

  return (
    <>
      <div className="admin-card">
        <form className="admin-filters" onSubmit={(event) => { event.preventDefault(); load(1, filters); }}>
          <label className="admin-field">Product name
            <input value={filters.name} onChange={(event) => setFilters({ ...filters, name: event.target.value })} />
          </label>
          <label className="admin-field">Brand
            <select value={filters.brand} onChange={(event) => setFilters({ ...filters, brand: event.target.value })}>
              <option value="">Select</option>
              {meta.brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
            </select>
          </label>
          <label className="admin-field">Category
            <select value={filters.menuId} onChange={(event) => setFilters({ ...filters, menuId: event.target.value })}>
              <option value="">Select</option>
              {meta.menus.map((menu) => <option key={menu.id} value={menu.id}>{menu.name}</option>)}
            </select>
          </label>
          <label className="admin-field">Start date
            <input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
          </label>
          <label className="admin-field">End date
            <input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
          </label>
          <button className="admin-btn" type="submit">Search</button>
          <button className="admin-btn ghost" type="button" onClick={() => { const empty = { name: "", brand: "", menuId: "", from: "", to: "" }; setFilters(empty); load(1, empty); }}>Reset</button>
        </form>
      </div>
      <div className="admin-card">
        <div className="admin-actions" style={{ marginBottom: 12 }}>
          <button className="admin-btn" type="button" onClick={openConfig}>HioBuy settings</button>
          <Link className="admin-link ghost" href="/admin/products/website">Website settings</Link>
          <button className="admin-btn" type="button" disabled={!canUpdate || generating} title={canUpdate ? undefined : "Update website runs on the local machine"} onClick={generateProject}>{generating ? "Updating" : "Update website"}</button>
        </div>
        <div className="admin-actions" style={{ marginBottom: 12 }}>
          <Link className="admin-link" href="/admin/products/new">Add product</Link>
          <button className="admin-btn danger" type="button" onClick={() => remove(selected)}>Delete products</button>
          <a className="admin-link ghost" href="/admin/api/products/export">Export</a>
          <Link className="admin-link ghost" href="/admin/products/import">Import</Link>
          <button className="admin-btn ghost" type="button" onClick={openBrand}>Change brand</button>
        </div>
        {message ? <p className="admin-note">{message}</p> : null}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th></th><th>ID</th><th>Category</th><th>Product name</th><th>Brand</th><th>Price</th><th>Source</th><th>Product ID</th><th>Product link</th><th>Image</th><th>Created</th><th>Actions</th>
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
                  <td>{row.source_product_url ? <a href={row.source_product_url} target="_blank" rel="noreferrer">Open</a> : ""}</td>
                  <td>{row.main_img ? <img src={row.main_img} alt="" /> : ""}</td>
                  <td>{row.created_at}</td>
                  <td>
                    <Link href={`/admin/products/${row.id}/edit`}>Edit</Link>
                    {" "}
                    <button className="admin-btn danger" type="button" onClick={() => remove([row.id])}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-pager">
          <span className="admin-note">{total} items</span>
          <div className="admin-actions">
            <button className="admin-btn ghost" type="button" disabled={page <= 1} onClick={() => load(page - 1, filters)}>Previous</button>
            <span>{page} / {pages}</span>
            <button className="admin-btn ghost" type="button" disabled={page >= pages} onClick={() => load(page + 1, filters)}>Next</button>
          </div>
        </div>
      </div>
      {generating ? <div className="admin-loading" role="status">Syncing code and updating the website....</div> : null}
      {brandOpen ? (
        <div className="admin-modal-backdrop" onClick={() => setBrandOpen(false)}>
          <form className="admin-modal" role="dialog" aria-label="Change brand" onClick={(event) => event.stopPropagation()} onSubmit={saveBrand}>
            <h2>Change brand</h2>
            <label className="admin-field">Original brand
              <select required value={oldBrand} onChange={(event) => setOldBrand(event.target.value)}>
                <option value="">Select</option>
                {meta.brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
              </select>
            </label>
            <label className="admin-field">New brand
              <input required value={newBrand} onChange={(event) => setNewBrand(event.target.value)} />
            </label>
            {brandMessage ? <p className={brandMessage.startsWith("Updated") ? "admin-ok" : "admin-error"}>{brandMessage}</p> : null}
            <div className="admin-actions">
              <button className="admin-btn" disabled={brandSaving} type="submit">{brandSaving ? "Saving" : "Submit"}</button>
              <button className="admin-btn ghost" type="button" onClick={() => setBrandOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      ) : null}
      {configOpen ? (
        <div className="admin-modal-backdrop" onClick={() => setConfigOpen(false)}>
          <form className="admin-modal" role="dialog" aria-label="HioBuy settings" onClick={(event) => event.stopPropagation()} onSubmit={saveConfig}>
            <h2>HioBuy settings</h2>
            <label className="admin-field">API Key
              <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" />
            </label>
            <label className="admin-field">API address
              <input value={apiBase} onChange={(event) => setApiBase(event.target.value)} />
            </label>
            {configMessage ? <p className={configMessage === "Saved" ? "admin-ok" : "admin-error"}>{configMessage}</p> : null}
            <div className="admin-actions">
              <button className="admin-btn" disabled={configSaving} type="submit">{configSaving ? "Saving" : "Save"}</button>
              <button className="admin-btn ghost" type="button" onClick={() => setConfigOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
