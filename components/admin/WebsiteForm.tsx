"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type WebsiteLanguage = { code: string; label: string };
type WebsiteSite = { id: number; catalogId: number; slug: string; name: string; url: string; title: string };

const emptySite = (): WebsiteSite => ({ id: -Date.now(), catalogId: 1, slug: "", name: "", url: "", title: "" });

export function WebsiteForm() {
  const router = useRouter();
  const [pageSize, setPageSize] = useState("50");
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [languages, setLanguages] = useState<WebsiteLanguage[]>([{ code: "en", label: "English" }, { code: "zh", label: "中文" }]);
  const [sites, setSites] = useState<WebsiteSite[]>([emptySite()]);
  const [removedIds, setRemovedIds] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/admin/api/products/website").then((response) => response.json()).then((body) => {
      setPageSize(String(body.pageSize ?? 50));
      setDefaultLanguage(body.defaultLanguage ?? "en");
      setLanguages(body.languages?.length ? body.languages : [{ code: "en", label: "English" }, { code: "zh", label: "中文" }]);
      setSites(body.sites?.length ? [body.sites[0]] : [emptySite()]);
    });
  }, []);

  function updateSite(id: number, field: keyof WebsiteSite, value: string) {
    setSites((current) => current.map((site) => site.id === id ? { ...site, [field]: value } : site));
  }

  function addSite() {
    setSites((current) => [...current, emptySite()]);
  }

  function removeSite(id: number) {
    setSites((current) => {
      if (current.length <= 1) return current;
      if (id > 0) setRemovedIds((ids) => [...ids, id]);
      return current.filter((site) => site.id !== id);
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await fetch("/admin/api/products/website", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageSize: Number(pageSize), defaultLanguage, languages, sites, removedIds }),
    });
    const body = await response.json();
    setSaving(false);
    if (!response.ok) {
      setMessage(body.message);
      return;
    }
    const saved = (body.sites ?? []) as WebsiteSite[];
    setSites(sites.map((site) => saved.find((item) => item.slug === (site.slug.trim().toLowerCase() || site.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")) && item.name === site.name.trim()) ?? site));
    setRemovedIds([]);
    setMessage("已保存");
  }

  return (
    <form className="admin-card" onSubmit={save}>
      <div className="admin-actions" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>网站配置</h2>
        <button className="admin-btn ghost" type="button" onClick={() => router.push("/admin/products")}>返回</button>
      </div>
      <div className="admin-grid">
        <label className="admin-field">每页商品数量
          <input required value={pageSize} onChange={(event) => setPageSize(event.target.value)} />
        </label>
        <label className="admin-field">默认语言
          <input required value={defaultLanguage} onChange={(event) => setDefaultLanguage(event.target.value)} />
        </label>
        {languages.map((language, index) => (
          <label className="admin-field" key={language.code || index}>语言 {language.code || index + 1}
            <input value={language.label} onChange={(event) => setLanguages((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} />
          </label>
        ))}
      </div>
      {sites.map((item, index) => (
        <div className="admin-site-block" key={item.id}>
          <div className="admin-actions" style={{ marginBottom: 8 }}>
            <strong>网站 {index + 1}</strong>
            {sites.length > 1 ? <button className="admin-btn danger" type="button" onClick={() => removeSite(item.id)}>删除网站</button> : null}
          </div>
          <div className="admin-grid">
            <label className="admin-field">网站名称
              <input required value={item.name} onChange={(event) => updateSite(item.id, "name", event.target.value)} />
            </label>
            <label className="admin-field">网站标识
              <input value={item.slug} placeholder="留空时按网站名称生成" onChange={(event) => updateSite(item.id, "slug", event.target.value)} />
            </label>
            <label className="admin-field">网站链接
              <input value={item.url} onChange={(event) => updateSite(item.id, "url", event.target.value)} />
            </label>
            <label className="admin-field">网站标题
              <input value={item.title} onChange={(event) => updateSite(item.id, "title", event.target.value)} />
            </label>
          </div>
        </div>
      ))}
      <div className="admin-actions" style={{ marginTop: 12 }}>
        <button className="admin-btn ghost" type="button" onClick={addSite}>添加网站</button>
      </div>
      {message ? <p className={message === "已保存" ? "admin-ok" : "admin-error"}>{message}</p> : null}
      <div className="admin-actions" style={{ marginTop: 16 }}>
        <button className="admin-btn" disabled={saving} type="submit">{saving ? "保存中" : "保存"}</button>
      </div>
    </form>
  );
}
