"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminSectionNav } from "../_components/admin-section-nav";
import { supabase } from "../../../lib/supabase/client";
import { PERK_AREAS, PERK_CATEGORIES } from "../../../lib/perks";

type AdminPerkRow = {
  id: string;
  slug: string;
  name: string;
  area: string;
  address: string | null;
  categories: string[];
  benefit: string;
  description: string | null;
  website_url: string | null;
  usage_text: string;
  condition_text: string | null;
  is_published: boolean;
  display_order: number;
  created_at: string;
};

type PerkFormState = {
  id: string | null;
  name: string;
  slug: string;
  area: string;
  address: string;
  categories: string[];
  benefit: string;
  description: string;
  websiteUrl: string;
  usageText: string;
  conditionText: string;
  isPublished: boolean;
  displayOrder: string;
};

const INITIAL_FORM: PerkFormState = {
  id: null,
  name: "",
  slug: "",
  area: "",
  address: "",
  categories: [],
  benefit: "",
  description: "",
  websiteUrl: "",
  usageText: "お店でこの画面をご提示ください。",
  conditionText: "",
  isPublished: false,
  displayOrder: "100",
};

export default function AdminPerksPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [items, setItems] = useState<AdminPerkRow[]>([]);
  const [form, setForm] = useState<PerkFormState>(INITIAL_FORM);

  const fetchPerks = async () => {
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase
      .from("perks")
      .select(
        "id,slug,name,area,address,categories,benefit,description,website_url,usage_text,condition_text,is_published,display_order,created_at"
      )
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("地元特典の取得に失敗しました。");
      setItems([]);
      setLoading(false);
      return;
    }

    setItems((data ?? []) as AdminPerkRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void fetchPerks();
  }, []);

  const publishedCount = useMemo(() => items.filter((row) => row.is_published).length, [items]);

  const handleEdit = (row: AdminPerkRow) => {
    setFeedback("");
    setForm({
      id: row.id,
      name: row.name,
      slug: row.slug,
      area: row.area,
      address: row.address ?? "",
      categories: row.categories ?? [],
      benefit: row.benefit,
      description: row.description ?? "",
      websiteUrl: row.website_url ?? "",
      usageText: row.usage_text,
      conditionText: row.condition_text ?? "",
      isPublished: row.is_published,
      displayOrder: String(row.display_order),
    });
  };

  const handleReset = () => {
    setFeedback("");
    setForm(INITIAL_FORM);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.slug.trim() || !form.area.trim() || !form.benefit.trim()) {
      setFeedback("店舗名・slug・エリア・特典内容は必須です。");
      return;
    }
    if (form.categories.length === 0) {
      setFeedback("カテゴリーを1つ以上選択してください。");
      return;
    }

    setSaving(true);
    setFeedback("");

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      area: form.area.trim(),
      address: form.address.trim() || null,
      categories: form.categories,
      benefit: form.benefit.trim(),
      description: form.description.trim() || null,
      website_url: form.websiteUrl.trim() || null,
      usage_text: form.usageText.trim() || "お店でこの画面をご提示ください。",
      condition_text: form.conditionText.trim() || null,
      is_published: form.isPublished,
      display_order: Number(form.displayOrder) || 100,
    };

    const { error } = form.id
      ? await supabase.from("perks").update(payload).eq("id", form.id)
      : await supabase.from("perks").insert(payload);

    if (error) {
      setSaving(false);
      setFeedback("保存に失敗しました。slug の重複や入力内容を確認してください。");
      return;
    }

    await fetchPerks();
    setSaving(false);
    setFeedback(form.id ? "店舗情報を更新しました。" : "店舗を追加しました。");
    setForm(INITIAL_FORM);
  };

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <header className="soft-card !py-2.5">
          <h1 className="hero-title text-2xl font-semibold">地元特典管理</h1>
          <p className="section-note mt-1">公開中 {publishedCount} 件 / 全 {items.length} 件</p>
        </header>

        <section className="soft-card !py-2.5">
          <AdminSectionNav current="perks" />
        </section>

        {loading ? (
          <section className="soft-card">
            <p className="muted-text text-sm">地元特典を読み込んでいます...</p>
          </section>
        ) : null}

        {!loading && message ? (
          <section className="soft-card">
            <p className="text-sm text-rose-700">{message}</p>
          </section>
        ) : null}

        {!loading && !message ? (
          <section className="soft-card flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="section-title text-[17px]">地元特典一覧</h2>
              <button type="button" onClick={handleReset} className="secondary-btn !h-9 !w-auto px-3 text-xs">
                新規追加
              </button>
            </div>
            {items.length === 0 ? (
              <p className="muted-text text-sm">まだ店舗がありません。</p>
            ) : (
              <div className="flex flex-col gap-2">
                {items.map((item) => (
                  <article key={item.id} className="soft-card-subtle flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#325a72]">{item.name}</p>
                      <p className="text-xs text-[#607a8c]">
                        {item.area} / 表示順 {item.display_order}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs ${item.is_published ? "pill-blue" : "pill-pink"}`}>
                        {item.is_published ? "公開中" : "非公開"}
                      </span>
                      <button type="button" onClick={() => handleEdit(item)} className="secondary-btn !h-8 !w-auto px-3 text-xs">
                        編集
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {!loading && !message ? (
          <section className="soft-card">
            <h2 className="section-title text-[17px]">{form.id ? "店舗編集" : "新規追加"}</h2>
            {feedback ? <p className="mt-2 text-xs text-[#3f6983]">{feedback}</p> : null}
            <form className="mt-3 flex flex-col gap-2.5" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-1">
                <span className="label-text">店舗名 *</span>
                <input className="mock-input" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="label-text">slug *</span>
                <input className="mock-input" value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} />
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="label-text">エリア *</span>
                  <select
                    className="mock-select admin-select"
                    value={form.area}
                    onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))}
                  >
                    <option value="">選択してください</option>
                    {PERK_AREAS.filter((area) => area !== "すべて").map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="label-text">表示順</span>
                  <input
                    className="mock-input"
                    type="number"
                    value={form.displayOrder}
                    onChange={(e) => setForm((prev) => ({ ...prev, displayOrder: e.target.value }))}
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="label-text">住所</span>
                <input className="mock-input" value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="label-text">カテゴリー *（複数選択可）</span>
                <div className="flex flex-wrap gap-2 rounded-[14px] border border-[#d5e0ea] bg-white p-3">
                  {PERK_CATEGORIES.map((category) => {
                    const checked = form.categories.includes(category);
                    return (
                      <label key={category} className="inline-flex items-center gap-1.5 text-xs text-[#4d6f83]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setForm((prev) => ({
                              ...prev,
                              categories: e.target.checked
                                ? [...prev.categories, category]
                                : prev.categories.filter((item) => item !== category),
                            }));
                          }}
                        />
                        {category}
                      </label>
                    );
                  })}
                </div>
              </label>
              <label className="flex flex-col gap-1">
                <span className="label-text">特典内容 *</span>
                <textarea
                  className="mock-textarea"
                  value={form.benefit}
                  onChange={(e) => setForm((prev) => ({ ...prev, benefit: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="label-text">お店からのひとこと</span>
                <textarea
                  className="mock-textarea"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="お店からのひとことを入力"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="label-text">公式サイトURL</span>
                <input
                  className="mock-input"
                  value={form.websiteUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, websiteUrl: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="label-text">使い方</span>
                <textarea
                  className="mock-textarea"
                  value={form.usageText}
                  onChange={(e) => setForm((prev) => ({ ...prev, usageText: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="label-text">利用条件</span>
                <textarea
                  className="mock-textarea"
                  value={form.conditionText}
                  onChange={(e) => setForm((prev) => ({ ...prev, conditionText: e.target.value }))}
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-[#4c6f83]">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                />
                公開する
              </label>
              <button type="submit" className="primary-btn" disabled={saving}>
                {saving ? "保存中..." : form.id ? "更新する" : "追加する"}
              </button>
            </form>
          </section>
        ) : null}
      </main>
    </div>
  );
}
