"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase/client";
import { isAdminEmail } from "../../lib/admin-access";

export default function AdminHomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [unhandledReportCount, setUnhandledReportCount] = useState<number | null>(null);
  const [activeUserCount, setActiveUserCount] = useState<number | null>(null);
  const [suspendedCount, setSuspendedCount] = useState<number | null>(null);
  const [unusedInviteCount, setUnusedInviteCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchAdminSummary = async () => {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth");
        return;
      }

      if (!isAdminEmail(user.email)) {
        router.replace("/");
        return;
      }

      const [
        { count: unhandledReportsTotal, error: reportsError },
        { count: activeTotal, error: activeError },
        { count: suspendedTotal, error: suspendedError },
        { data: inviteRows, error: invitesError },
      ] =
        await Promise.all([
          supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "unhandled"),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_suspended", false),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_suspended", true),
          supabase.rpc("admin_list_invite_codes"),
        ]);

      if (reportsError || activeError || suspendedError || invitesError) {
        setMessage("件数の取得に失敗しました。時間をおいて再度お試しください。");
      } else {
        const unusedCount = ((inviteRows ?? []) as Array<{ is_used?: boolean }>).filter(
          (row) => row.is_used !== true
        ).length;
        setUnhandledReportCount(unhandledReportsTotal ?? 0);
        setActiveUserCount(activeTotal ?? 0);
        setSuspendedCount(suspendedTotal ?? 0);
        setUnusedInviteCount(unusedCount);
      }

      setLoading(false);
    };

    fetchAdminSummary();
  }, [router]);

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3">
          <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-blue">管理</p>
          <h1 className="hero-title text-2xl font-semibold">管理画面</h1>
          <p className="muted-text text-sm">運営用メニュー / 現在の状況</p>
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
              <h2 className="section-title">管理メニュー</h2>
              <div className="grid grid-cols-1 gap-2.5">
                <Link href="/admin/invite-codes" className="secondary-btn !h-10">
                  招待コード管理
                </Link>
                <Link href="/admin/users" className="secondary-btn !h-10">
                  ユーザー一覧
                </Link>
                <Link href="/admin/reports" className="secondary-btn !h-10">
                  通報管理
                </Link>
              </div>
            </section>
          </>
        ) : null}

        <Link href="/" className="text-center text-sm muted-text underline underline-offset-3">
          ホームに戻る
        </Link>
      </main>
    </div>
  );
}
