"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function BrandForm() {
  const router = useRouter();
  const [brands, setBrands] = useState<string[]>([]);
  const [oldBrand, setOldBrand] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/admin/api/products/meta").then((response) => response.json()).then((meta) => setBrands(meta.brands ?? []));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/admin/api/products/brand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldBrand, newBrand }),
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.message);
      return;
    }
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form className="admin-card" onSubmit={submit}>
      <div className="admin-grid">
        <label className="admin-field">原品牌
          <select required value={oldBrand} onChange={(event) => setOldBrand(event.target.value)}>
            <option value="">请选择</option>
            {brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
          </select>
        </label>
        <label className="admin-field">新品牌
          <input required value={newBrand} onChange={(event) => setNewBrand(event.target.value)} />
        </label>
      </div>
      {message ? <p className={message.startsWith("已") ? "admin-ok" : "admin-error"}>{message}</p> : null}
      <button className="admin-btn" type="submit">提交</button>
    </form>
  );
}
