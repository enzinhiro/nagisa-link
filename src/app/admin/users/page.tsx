"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase/client";
import { isAdminEmail } from "../../../lib/admin-access";
import { AdminSectionNav } from "../_components/admin-section-nav";

type AdminUserRow = {
  id: string;
  real_name: string | null;
  nickname: string;
  email: string | null;
  area: string;
  created_at: string;
  profile_completed: boolean;
  is_suspended: boolean;
  invite_used: boolean;
  invite_code: string | null;
  invite_note: string | null;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [inviteFilter, setInviteFilter] = useState<"all" | "used" | "unused">("all");

  const fetchUsers = async () => {
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

    const { data, error } = await supabase.rpc("admin_list_users");

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
  }, [router]);

  const handleToggleSuspend = async (target: AdminUserRow) => {
    setFeedbackMessage("");
    setUpdatingUserId(target.id);

    const nextSuspended = !target.is_suspended;
    const { data: updated, error } = await supabase.rpc("admin_set_user_suspension", {
      input_user_id: target.id,
      input_suspended: nextSuspended,
    });

    setUpdatingUserId(null);

    if (error || !updated) {
      setFeedbackMessage("更新に失敗しました。時間をおいて再度お試しください。");
      return;
    }

    setFeedbackMessage(nextSuspended ? "ユーザーを停止しました。" : "停止を解除しました。");
    await fetchUsers();
  };

  const filteredUsers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return users.filter((u) => {
      const matchesKeyword =
        keyword.length === 0 ||
        (u.real_name ?? "").toLowerCase().includes(keyword) ||
        (u.nickname ?? "").toLowerCase().includes(keyword) ||
        (u.email ?? "").toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? !u.is_suspended : u.is_suspended);

      const matchesInvite =
        inviteFilter === "all" ||
        (inviteFilter === "used" ? u.invite_used : !u.invite_used);

      return matchesKeyword && matchesStatus && matchesInvite;
    });
  }, [users, searchText, statusFilter, inviteFilter]);

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3.5">
          <AdminSectionNav current="users" />
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

        {!loading && !message ? (
          <section className="soft-card flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="label-text">検索（本名・ニックネーム・メール）</span>
              <input
                className="mock-input !h-11"
                placeholder="キーワードで検索"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[#5b798d]">状態</span>
                <select
                  className="mock-select !h-10"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "suspended")}
                >
                  <option value="all">すべて</option>
                  <option value="active">利用中のみ</option>
                  <option value="suspended">停止中のみ</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[#5b798d]">招待コード</span>
                <select
                  className="mock-select !h-10"
                  value={inviteFilter}
                  onChange={(e) => setInviteFilter(e.target.value as "all" | "used" | "unused")}
                >
                  <option value="all">すべて</option>
                  <option value="used">使用済み</option>
                  <option value="unused">不明/未使用</option>
                </select>
              </label>
            </div>
            <p className="text-xs muted-text">表示件数: {filteredUsers.length}件</p>
          </section>
        ) : null}

        {!loading && !message && users.length === 0 ? (
          <section className="soft-card">
            <p className="muted-text text-sm">まだユーザー情報がありません。登録があるとここに表示されます。</p>
          </section>
        ) : null}

        {!loading && !message && users.length > 0 && filteredUsers.length === 0 ? (
          <section className="soft-card">
            <p className="muted-text text-sm">条件に一致するユーザーはいません。</p>
          </section>
        ) : null}

        {!loading &&
          !message &&
          filteredUsers.map((u) => (
            <article key={u.id} className="soft-card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <h3 className="truncate font-semibold leading-6 text-[#2f5f79]">{u.nickname || "（未設定）"}</h3>
                  <p className="text-xs text-[#5b798d]">本名: {u.real_name?.trim() ? u.real_name : "未登録"}</p>
                  <p className="truncate text-xs text-[#5b798d]">メール: {u.email ?? "未登録"}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs ${
                      u.is_suspended ? "pill-pink" : "pill-blue"
                    }`}
                  >
                    {u.is_suspended ? "停止中" : "利用中"}
                  </span>
                  <span className="text-[11px] text-[#6f8796]">
                    {u.profile_completed ? "プロフィール完了" : "プロフィール未完了"}
                  </span>
                </div>
              </div>
              <p className="text-sm text-[#365f78]">地域: {u.area || "未設定"}</p>
              <p className="text-sm text-[#365f78]">
                招待コード: {u.invite_used ? "使用済み" : "未使用"}
                {u.invite_code ? `（${u.invite_code}）` : ""}
              </p>
              {u.invite_note?.trim() ? (
                <p className="text-xs muted-text">共有先メモ: {u.invite_note}</p>
              ) : null}
              <p className="text-xs muted-text">登録日: {new Date(u.created_at).toLocaleString("ja-JP")}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Link href={`/admin/users/${u.id}`} className="secondary-btn !h-11">
                  詳細を見る
                </Link>
                <button
                  type="button"
                  className="secondary-btn !h-11"
                  onClick={() => handleToggleSuspend(u)}
                  disabled={updatingUserId === u.id}
                >
                  {u.is_suspended ? "停止を解除" : "利用停止"}
                </button>
              </div>
            </article>
          ))}

        <Link href="/" className="text-center text-sm muted-text underline underline-offset-3">
          ホームに戻る
        </Link>
      </main>
    </div>
  );
}
