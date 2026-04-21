"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase/client";

const ADMIN_EMAIL = "enzin-office@gmail.com";

export default function AdminHomePage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [reportCount, setReportCount] = useState<number | null>(null);
  const [suspendedCount, setSuspendedCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchAdminSummary = async () => {
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

      const [{ count: reportsTotal, error: reportsError }, { count: suspendedTotal, error: suspendedError }] =
        await Promise.all([
          supabase.from("reports").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_suspended", true),
        ]);

      if (reportsError || suspendedError) {
        setMessage("件数の取得に失敗しました。時間をおいて再度お試しください。");
      } else {
        setReportCount(reportsTotal ?? 0);
        setSuspendedCount(suspendedTotal ?? 0);
      }

      setLoading(false);
    };

    fetchAdminSummary();
  }, []);

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3">
          <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-blue">管理者</p>
          <h1 className="hero-title text-2xl font-semibold">運営メニュー</h1>
          <p className="muted-text text-sm">必要な管理画面へ、ここからすぐ移動できます。</p>
        </header>

        {loading ? (
          <section className="soft-card">
            <p className="muted-text text-sm">管理メニューを読み込んでいます...</p>
          </section>
        ) : null}

        {!loading && message ? (
          <section className="soft-card">
            <p className="text-sm text-rose-700">{message}</p>
          </section>
        ) : null}

        {!loading && !message ? (
          <>
            <article className="soft-card flex flex-col gap-2.5">
              <h2 className="section-title">通報管理</h2>
              <p className="muted-text text-sm">通報内容を確認します。</p>
              <p className="text-sm text-[#365f78]">件数: {reportCount ?? 0}件</p>
              <Link href="/admin/reports" className="secondary-btn !h-10">
                通報一覧へ
              </Link>
            </article>

            <article className="soft-card flex flex-col gap-2.5">
              <h2 className="section-title">ユーザー管理</h2>
              <p className="muted-text text-sm">停止 / 解除を行います。</p>
              <p className="text-sm text-[#365f78]">停止中ユーザー: {suspendedCount ?? 0}人</p>
              <Link href="/admin/users" className="secondary-btn !h-10">
                ユーザー一覧へ
              </Link>
            </article>
          </>
        ) : null}

        <Link href="/" className="text-center text-sm muted-text underline underline-offset-3">
          ホームに戻る
        </Link>
      </main>
    </div>
  );
}
