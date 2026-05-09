"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase/client";

type AnnouncementType = "notice" | "event" | "update" | "perk" | "important";
type AdminAnnouncementRow = {
  id: string;
  title: string;
  body: string;
  type: AnnouncementType;
  is_published: boolean;
  created_at: string;
};

const TYPE_OPTIONS: AnnouncementType[] = ["notice", "event", "update", "perk", "important"];
const TYPE_LABEL: Record<AnnouncementType, string> = {
  notice: "お知らせ",
  event: "イベント",
  update: "アップデート",
  perk: "ママ応援店舗",
  important: "重要",
};

export default function AdminAnnouncementsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [items, setItems] = useState<AdminAnnouncementRow[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<AnnouncementType>("notice");
  const [isPublished, setIsPublished] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase
      .from("announcements")
      .select("id,title,body,type,is_published,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin/announcements] select failed", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setMessage("お知らせ一覧の取得に失敗しました。");
      setItems([]);
      setLoading(false);
      return;
    }

    setItems((data ?? []) as AdminAnnouncementRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void fetchItems();
  }, []);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      setFeedback("タイトルと本文は必須です。");
      return;
    }
    setSaving(true);
    setFeedback("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("announcements").insert({
      title: title.trim(),
      body: body.trim(),
      type,
      is_published: isPublished,
      created_by: user?.id ?? null,
    });

    if (error) {
      setSaving(false);
      setFeedback("作成に失敗しました。入力内容を確認してください。");
      return;
    }

    setTitle("");
    setBody("");
    setType("notice");
    setIsPublished(true);
    setFeedback("お知らせを作成しました。");
    setSaving(false);
    await fetchItems();
  };

  const handleTogglePublished = async (row: AdminAnnouncementRow) => {
    const { error } = await supabase
      .from("announcements")
      .update({ is_published: !row.is_published })
      .eq("id", row.id);
    if (error) {
      setFeedback("公開状態の更新に失敗しました。");
      return;
    }
    setFeedback(row.is_published ? "非公開にしました。" : "公開しました。");
    await fetchItems();
  };

  const handleDelete = async (row: AdminAnnouncementRow) => {
    const { error } = await supabase.from("announcements").delete().eq("id", row.id);
    if (error) {
      setFeedback("削除に失敗しました。");
      return;
    }
    setFeedback("お知らせを削除しました。");
    await fetchItems();
  };

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card !py-2.5">
          <h1 className="hero-title text-2xl font-semibold">お知らせ管理</h1>
        </header>

        <section className="soft-card">
          <h2 className="section-title text-[17px]">新規作成</h2>
          {feedback ? <p className="mt-2 text-xs text-[#3f6983]">{feedback}</p> : null}
          <form className="mt-3 flex flex-col gap-2.5" onSubmit={handleCreate}>
            <label className="flex flex-col gap-1">
              <span className="label-text">タイトル *</span>
              <input className="mock-input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label-text">本文 *</span>
              <textarea className="mock-textarea" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="label-text">種別</span>
                <select className="mock-select admin-select" value={type} onChange={(e) => setType(e.target.value as AnnouncementType)}>
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {TYPE_LABEL[option]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-[#dbe8f0] bg-[#f9fcfe] px-3 py-2.5">
                <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
                <span className="text-sm text-[#3f6a83]">公開する</span>
              </label>
            </div>
            <button type="submit" className="primary-btn !h-11" disabled={saving}>
              {saving ? "保存中..." : "お知らせを作成"}
            </button>
          </form>
        </section>

        {loading ? (
          <section className="soft-card">
            <p className="muted-text text-sm">お知らせ一覧を読み込んでいます...</p>
          </section>
        ) : null}

        {!loading && message ? (
          <section className="soft-card">
            <p className="text-sm text-rose-700">{message}</p>
          </section>
        ) : null}

        {!loading && !message ? (
          <section className="soft-card flex flex-col gap-2.5">
            <h2 className="section-title text-[17px]">お知らせ一覧</h2>
            {items.length === 0 ? (
              <p className="muted-text text-sm">まだお知らせはありません。</p>
            ) : (
              <div className="flex flex-col gap-2">
                {items.map((item) => (
                  <article key={item.id} className="soft-card-subtle flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#325a72]">{item.title}</p>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs ${item.is_published ? "pill-blue" : "pill-pink"}`}>
                        {item.is_published ? "公開中" : "非公開"}
                      </span>
                    </div>
                    <p className="text-xs text-[#607a8c]">{TYPE_LABEL[item.type]}</p>
                    <p className="text-sm text-[#4b687b] whitespace-pre-wrap">{item.body}</p>
                    <div className="flex gap-2">
                      <button type="button" className="secondary-btn !h-9 !w-auto px-3 text-xs" onClick={() => handleTogglePublished(item)}>
                        {item.is_published ? "非公開にする" : "公開する"}
                      </button>
                      <button type="button" className="secondary-btn !h-9 !w-auto px-3 text-xs" onClick={() => handleDelete(item)}>
                        削除
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
