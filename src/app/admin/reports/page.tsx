"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase/client";
import { toMamaDisplayName } from "../../../lib/profile/displayName";

type ReportRow = {
  id: string;
  created_at: string;
  reason: "uncomfortable" | "solicitation" | "pressured_contact" | "suspicious_profile" | "other";
  reporter_user_id: string;
  target_user_id: string;
  chat_id: string;
  note: string | null;
};

type ProfileMapRow = {
  id: string;
  nickname: string;
};

const ADMIN_EMAIL = "enzin-office@gmail.com";

const REASON_LABELS: Record<ReportRow["reason"], string> = {
  uncomfortable: "不快な言動",
  solicitation: "勧誘のように感じた",
  pressured_contact: "外部連絡先交換を強く求められた",
  suspicious_profile: "プロフィールに違和感",
  other: "その他",
};

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [nameMap, setNameMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("ログイン状態を確認できませんでした。");
        setLoading(false);
        return;
      }

      if ((user.email ?? "").toLowerCase() !== ADMIN_EMAIL) {
        setMessage("この画面は管理者のみ利用できます。");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("reports")
        .select("id,created_at,reason,reporter_user_id,target_user_id,chat_id,note")
        .order("created_at", { ascending: false });

      if (error) {
        setMessage("通報一覧の取得に失敗しました。");
        setLoading(false);
        return;
      }

      const reportRows = (data ?? []) as ReportRow[];
      setReports(reportRows);

      const profileIds = Array.from(
        new Set(reportRows.flatMap((row) => [row.reporter_user_id, row.target_user_id]))
      );

      if (profileIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id,nickname")
          .in("id", profileIds);

        const map = new Map<string, string>();
        for (const profile of (profileData ?? []) as ProfileMapRow[]) {
          map.set(profile.id, toMamaDisplayName(profile.nickname));
        }
        setNameMap(map);
      } else {
        setNameMap(new Map());
      }

      setLoading(false);
    };

    fetchReports();
  }, []);

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3">
          <Link href="/admin" className="text-sm muted-text underline underline-offset-3">
            管理者トップに戻る
          </Link>
          <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-blue">管理者</p>
          <h1 className="hero-title text-2xl font-semibold">通報一覧</h1>
          <p className="muted-text text-sm">新しい順に通報内容を確認できます。</p>
        </header>

        {loading ? (
          <section className="soft-card">
            <p className="muted-text text-sm">通報一覧を読み込んでいます...</p>
          </section>
        ) : null}

        {!loading && message ? (
          <section className="soft-card">
            <p className="text-sm text-rose-700">{message}</p>
          </section>
        ) : null}

        {!loading && !message && reports.length === 0 ? (
          <section className="soft-card">
            <p className="muted-text text-sm">まだ通報はありません。必要時にここへ表示されます。</p>
          </section>
        ) : null}

        {!loading &&
          !message &&
          reports.map((row) => (
            <article key={row.id} className="soft-card flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs muted-text">{new Date(row.created_at).toLocaleString("ja-JP")}</p>
                <span className="inline-flex rounded-full px-2.5 py-1 text-xs pill-pink">
                  {REASON_LABELS[row.reason]}
                </span>
              </div>
              <p className="text-sm text-[#365f78]">
                通報者: {nameMap.get(row.reporter_user_id) ?? "不明ユーザー"}
              </p>
              <p className="text-sm text-[#365f78]">
                対象者: {nameMap.get(row.target_user_id) ?? "不明ユーザー"}
              </p>
              <p className="text-xs muted-text">chat_id: {row.chat_id}</p>
              <p className="text-xs muted-text">
                補足コメント: {row.note && row.note.trim().length > 0 ? "あり" : "なし"}
              </p>
              <Link
                href={`/admin/reports/${row.id}`}
                className="secondary-btn !h-10"
              >
                詳細を見る
              </Link>
            </article>
          ))}

        <Link href="/" className="text-center text-sm muted-text underline underline-offset-3">
          ホームに戻る
        </Link>
      </main>
    </div>
  );
}
