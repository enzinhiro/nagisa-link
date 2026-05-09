"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase/client";

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  type: "notice" | "event" | "update" | "perk" | "important";
  created_at: string;
};

const ANNOUNCEMENT_TYPE_LABEL: Record<AnnouncementRow["type"], string> = {
  notice: "お知らせ",
  event: "イベント",
  update: "アップデート",
  perk: "ママ応援店舗",
  important: "重要",
};

const ANNOUNCEMENT_TYPE_BADGE_CLASS: Record<AnnouncementRow["type"], string> = {
  notice: "pill-blue",
  event: "pill-pink",
  update: "pill-blue",
  perk: "pill-blue",
  important: "pill-pink",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function AnnouncementsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<AnnouncementRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setMessage("");

      const firstSession = (await supabase.auth.getSession()).data.session;
      if (!firstSession) {
        await supabase.auth.refreshSession();
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        setMessage("ログイン状態を確認できませんでした。");
        setItems([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("announcements")
        .select("id,title,body,type,created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("[announcements] select failed", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        setMessage("お知らせの取得に失敗しました。");
        setItems([]);
        setLoading(false);
        return;
      }

      setItems((data ?? []) as AnnouncementRow[]);
      setLoading(false);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ announcements_last_read_at: new Date().toISOString() })
        .eq("id", user.id);

      if (updateError) {
        console.error("[announcements] announcements_last_read_at update failed", {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
        });
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card !py-2.5">
          <h1 className="hero-title text-2xl font-semibold">運営からのお知らせ</h1>
        </header>

        {loading ? (
          <section className="soft-card">
            <p className="muted-text text-sm">お知らせを読み込んでいます...</p>
          </section>
        ) : null}

        {!loading && message ? (
          <section className="soft-card">
            <p className="text-sm text-rose-700">{message}</p>
          </section>
        ) : null}

        {!loading && !message && items.length === 0 ? (
          <section className="soft-card">
            <p className="muted-text text-sm">現在、お知らせはありません。</p>
          </section>
        ) : null}

        {!loading && !message && items.length > 0 ? (
          <section className="screen-stack">
            {items.map((item) => (
              <article key={item.id} className="soft-card flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs ${ANNOUNCEMENT_TYPE_BADGE_CLASS[item.type]}`}>
                    {ANNOUNCEMENT_TYPE_LABEL[item.type]}
                  </span>
                  <time className="text-xs text-[#6f8797]">{formatDate(item.created_at)}</time>
                </div>
                <h2 className="text-sm font-semibold text-[#315970]">{item.title}</h2>
                <p className="text-sm leading-6 text-[#365f78] whitespace-pre-wrap">{item.body}</p>
              </article>
            ))}
          </section>
        ) : null}
      </main>
    </div>
  );
}
