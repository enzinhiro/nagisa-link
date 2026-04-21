"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase/client";
import { toMamaDisplayName } from "../../../lib/profile/displayName";

type AdminUserRow = {
  id: string;
  nickname: string;
  area: string;
  profile_completed: boolean;
  is_suspended: boolean;
  suspended_at: string | null;
  created_at: string;
};

const ADMIN_EMAIL = "enzin-office@gmail.com";

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);

  const fetchUsers = async () => {
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
      .from("profiles")
      .select("id,nickname,area,profile_completed,is_suspended,suspended_at,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("ユーザー一覧の取得に失敗しました。");
      setLoading(false);
      return;
    }

    setUsers((data ?? []) as AdminUserRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleSuspend = async (target: AdminUserRow) => {
    setFeedbackMessage("");
    setUpdatingUserId(target.id);

    const nextSuspended = !target.is_suspended;
    const { error } = await supabase
      .from("profiles")
      .update({
        is_suspended: nextSuspended,
        suspended_at: nextSuspended ? new Date().toISOString() : null,
      })
      .eq("id", target.id);

    setUpdatingUserId(null);

    if (error) {
      setFeedbackMessage("更新に失敗しました。時間をおいて再度お試しください。");
      return;
    }

    setFeedbackMessage(nextSuspended ? "ユーザーを停止しました。" : "停止を解除しました。");
    await fetchUsers();
  };

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3.5">
          <Link href="/admin" className="text-sm muted-text underline underline-offset-3">
            管理者トップに戻る
          </Link>
          <div className="flex flex-col gap-2">
            <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-blue">管理者</p>
            <h1 className="hero-title text-2xl font-semibold">ユーザー一覧</h1>
            <p className="muted-text text-sm">利用状況を確認し、停止・解除を行えます。</p>
          </div>
        </header>

        {loading ? (
          <section className="soft-card">
            <p className="muted-text text-sm">ユーザー一覧を読み込んでいます...</p>
          </section>
        ) : null}

        {!loading && message ? (
          <section className="soft-card">
            <p className="text-sm text-rose-700">{message}</p>
          </section>
        ) : null}

        {!loading && !message && feedbackMessage ? (
          <section className="soft-card">
            <p className="text-sm text-[#3f6680]">{feedbackMessage}</p>
          </section>
        ) : null}

        {!loading && !message && users.length === 0 ? (
          <section className="soft-card">
            <p className="muted-text text-sm">まだ表示できるユーザー情報がありません。</p>
          </section>
        ) : null}

        {!loading &&
          !message &&
          users.map((u) => (
            <article key={u.id} className="soft-card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-6 text-[#2f5f79]">{toMamaDisplayName(u.nickname)}</h3>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs ${u.profile_completed ? "pill-blue" : "bg-[#eef4f8] text-[#6f8796]"}`}
                  >
                    {u.profile_completed ? "登録済み" : "未完了"}
                  </span>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs ${u.is_suspended ? "pill-pink" : "pill-blue"}`}>
                    {u.is_suspended ? "停止中" : "利用中"}
                  </span>
                </div>
              </div>
              <p className="text-sm text-[#365f78]">地域: {u.area || "未設定"}</p>
              <p className="text-xs muted-text">登録日: {new Date(u.created_at).toLocaleString("ja-JP")}</p>
              <button
                type="button"
                className="secondary-btn !h-11"
                onClick={() => handleToggleSuspend(u)}
                disabled={updatingUserId === u.id}
              >
                {u.is_suspended ? "解除する" : "停止する"}
              </button>
            </article>
          ))}

        <Link href="/" className="text-center text-sm muted-text underline underline-offset-3">
          ホームに戻る
        </Link>
      </main>
    </div>
  );
}
