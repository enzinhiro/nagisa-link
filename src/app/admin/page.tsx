"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase/client";
import { AdminBottomNav } from "./_components/admin-bottom-nav";

export default function AdminHomePage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [unhandledReportCount, setUnhandledReportCount] = useState<number | null>(null);
  const [activeUserCount, setActiveUserCount] = useState<number | null>(null);
  const [suspendedCount, setSuspendedCount] = useState<number | null>(null);
  const [unusedInviteCount, setUnusedInviteCount] = useState<number | null>(null);
  const [profileCompletedCount, setProfileCompletedCount] = useState<number | null>(null);
  const [profileIncompleteCount, setProfileIncompleteCount] = useState<number | null>(null);
  const [activeChatCount, setActiveChatCount] = useState<number | null>(null);
  const [pendingWantsCount, setPendingWantsCount] = useState<number | null>(null);
  const [metricsNote, setMetricsNote] = useState("");

  useEffect(() => {
    const fetchAdminSummary = async () => {
      setLoading(true);
      setMessage("");

      const [
        { count: unhandledReportsTotal, error: reportsError },
        { count: activeTotal, error: activeError },
        { count: suspendedTotal, error: suspendedError },
        { count: profileCompletedTotal, error: profileCompletedError },
        { count: profileIncompleteTotal, error: profileIncompleteError },
        { count: activeChatsTotal, error: activeChatsError },
        { count: pendingWantsTotal, error: pendingWantsError },
        { data: inviteRows, error: invitesError },
      ] =
        await Promise.all([
          supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "unhandled"),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_suspended", false),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_suspended", true),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("profile_completed", true),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("profile_completed", false),
          supabase
            .from("chats")
            .select("id", { count: "exact", head: true })
            .gt("expires_at", new Date().toISOString()),
          supabase.from("wants").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.rpc("admin_list_invite_codes"),
        ]);

      if (reportsError || activeError || suspendedError || invitesError) {
        setMessage("件数の取得に失敗しました。時間をおいて再度お試しください。");
      } else {
        const unusedCount = ((inviteRows ?? []) as Array<{ is_used?: boolean; is_active?: boolean }>).filter(
          (row) => row.is_used !== true && row.is_active !== false
        ).length;
        const unavailable: string[] = [];
        if (profileCompletedError || profileIncompleteError) unavailable.push("プロフィール完了状況");
        if (activeChatsError) unavailable.push("進行中チャット数");
        if (pendingWantsError) unavailable.push("返答待ち件数");
        setUnhandledReportCount(unhandledReportsTotal ?? 0);
        setActiveUserCount(activeTotal ?? 0);
        setSuspendedCount(suspendedTotal ?? 0);
        setUnusedInviteCount(unusedCount);
        setProfileCompletedCount(profileCompletedError ? null : (profileCompletedTotal ?? 0));
        setProfileIncompleteCount(profileIncompleteError ? null : (profileIncompleteTotal ?? 0));
        setActiveChatCount(activeChatsError ? null : (activeChatsTotal ?? 0));
        setPendingWantsCount(pendingWantsError ? null : (pendingWantsTotal ?? 0));
        setMetricsNote(
          unavailable.length > 0
            ? `一部の件数は取得できませんでした（${unavailable.join(" / ")}）。`
            : ""
        );
      }

      setLoading(false);
    };

    fetchAdminSummary();
  }, []);

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack pb-20">
        <header className="soft-card !py-2.5">
          <h1 className="hero-title text-2xl font-semibold">管理画面</h1>
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
            <section className="grid grid-cols-2 gap-3">
              <Link href="/admin/invite-codes" className="soft-card flex flex-col gap-1.5">
                <p className="text-xs muted-text">未使用の招待コード</p>
                <p className="text-2xl font-semibold text-[#2f5f79]">{unusedInviteCount ?? 0}</p>
              </Link>
              <Link href="/admin/users" className="soft-card flex flex-col gap-1.5">
                <p className="text-xs muted-text">利用中ユーザー</p>
                <p className="text-2xl font-semibold text-[#2f5f79]">{activeUserCount ?? 0}</p>
              </Link>
              <Link href="/admin/users" className="soft-card flex flex-col gap-1.5">
                <p className="text-xs muted-text">停止中ユーザー</p>
                <p className="text-2xl font-semibold text-[#7f4f65]">{suspendedCount ?? 0}</p>
              </Link>
              <Link href="/admin/reports" className="soft-card flex flex-col gap-1.5">
                <p className="text-xs muted-text">未対応の通報</p>
                <p className="text-2xl font-semibold text-[#7f4f65]">{unhandledReportCount ?? 0}</p>
              </Link>
            </section>

            <section className="soft-card flex flex-col gap-2.5">
              <h2 className="section-title">身内テスト状況（簡易）</h2>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="soft-card-subtle">
                  <p className="text-xs muted-text">プロフィール完了済み</p>
                  <p className="text-xl font-semibold text-[#2f5f79]">{profileCompletedCount ?? "—"}</p>
                </div>
                <div className="soft-card-subtle">
                  <p className="text-xs muted-text">プロフィール未完了</p>
                  <p className="text-xl font-semibold text-[#7f4f65]">{profileIncompleteCount ?? "—"}</p>
                </div>
                <div className="soft-card-subtle">
                  <p className="text-xs muted-text">進行中チャット数</p>
                  <p className="text-xl font-semibold text-[#2f5f79]">{activeChatCount ?? "—"}</p>
                </div>
                <div className="soft-card-subtle">
                  <p className="text-xs muted-text">返答待ちの話したい件数</p>
                  <p className="text-xl font-semibold text-[#7f4f65]">{pendingWantsCount ?? "—"}</p>
                </div>
              </div>
              {metricsNote ? <p className="text-xs muted-text">{metricsNote}</p> : null}
            </section>
          </>
        ) : null}
      </main>
      <AdminBottomNav />
    </div>
  );
}
