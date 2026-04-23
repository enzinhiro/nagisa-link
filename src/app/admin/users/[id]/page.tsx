"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase/client";
import { isAdminEmail } from "../../../../lib/admin-access";
import { AdminSectionNav } from "../../_components/admin-section-nav";

type AdminUserDetailRow = {
  id: string;
  real_name: string | null;
  nickname: string;
  email: string | null;
  area: string;
  created_at: string;
  is_suspended: boolean;
  invite_used: boolean;
  invite_code: string | null;
  invite_note: string | null;
  invite_used_at: string | null;
  intro: string | null;
  want_to_connect: string | null;
};

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params.id;

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [userDetail, setUserDetail] = useState<AdminUserDetailRow | null>(null);

  const fetchUserDetail = async () => {
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

    const { data, error } = await supabase.rpc("admin_get_user_detail", {
      input_user_id: userId,
    });

    if (error) {
      setMessage("ユーザー詳細の取得に失敗しました。");
      setLoading(false);
      return;
    }

    const row = ((data ?? [])[0] ?? null) as AdminUserDetailRow | null;
    if (!row) {
      setMessage("対象ユーザーが見つかりませんでした。");
      setLoading(false);
      return;
    }

    setUserDetail(row);
    setLoading(false);
  };

  useEffect(() => {
    fetchUserDetail();
  }, [router, userId]);

  const handleToggleSuspend = async () => {
    if (!userDetail) return;
    setIsUpdating(true);
    setFeedbackMessage("");

    const nextSuspended = !userDetail.is_suspended;
    const { data, error } = await supabase.rpc("admin_set_user_suspension", {
      input_user_id: userDetail.id,
      input_suspended: nextSuspended,
    });

    setIsUpdating(false);

    if (error || !data) {
      setFeedbackMessage("状態の更新に失敗しました。");
      return;
    }

    setFeedbackMessage(nextSuspended ? "利用停止しました。" : "停止を解除しました。");
    await fetchUserDetail();
  };

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3.5">
          <AdminSectionNav current="users" breadcrumb="管理画面 / ユーザー一覧 / 詳細" />
          <div className="flex flex-col gap-2">
            <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-blue">管理者</p>
            <h1 className="hero-title text-2xl font-semibold">ユーザー詳細</h1>
            <p className="muted-text text-sm">ユーザー情報の確認と利用状態の変更ができます。</p>
          </div>
        </header>

        {loading ? (
          <section className="soft-card">
            <p className="muted-text text-sm">ユーザー詳細を読み込んでいます...</p>
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

        {!loading && !message && userDetail ? (
          <section className="soft-card flex flex-col gap-3">
            <Link href="/admin/users" className="text-sm muted-text underline underline-offset-3">
              ユーザー一覧に戻る
            </Link>
            <div className="soft-card-subtle">
              <p className="label-text mb-1">本名</p>
              <p className="text-sm text-[#365f78]">{userDetail.real_name?.trim() ? userDetail.real_name : "未登録"}</p>
            </div>
            <div className="soft-card-subtle">
              <p className="label-text mb-1">ニックネーム</p>
              <p className="text-sm text-[#365f78]">{userDetail.nickname || "未設定"}</p>
            </div>
            <div className="soft-card-subtle">
              <p className="label-text mb-1">メール</p>
              <p className="text-sm break-all text-[#365f78]">{userDetail.email ?? "未登録"}</p>
            </div>
            <div className="soft-card-subtle">
              <p className="label-text mb-1">地域</p>
              <p className="text-sm text-[#365f78]">{userDetail.area || "未設定"}</p>
            </div>
            <div className="soft-card-subtle">
              <p className="label-text mb-1">登録日</p>
              <p className="text-sm text-[#365f78]">{new Date(userDetail.created_at).toLocaleString("ja-JP")}</p>
            </div>
            <div className="soft-card-subtle">
              <p className="label-text mb-1">状態</p>
              <p className="text-sm text-[#365f78]">{userDetail.is_suspended ? "停止中" : "利用中"}</p>
            </div>
            <div className="soft-card-subtle">
              <p className="label-text mb-1">招待コード情報</p>
              <p className="text-sm text-[#365f78]">
                {userDetail.invite_used ? "使用済み" : "未使用"}
                {userDetail.invite_code ? `（${userDetail.invite_code}）` : ""}
              </p>
              <p className="mt-1 text-sm text-[#365f78]">
                共有先メモ: {userDetail.invite_note?.trim() ? userDetail.invite_note : "未設定"}
              </p>
              <p className="mt-1 text-xs muted-text">
                使用日時:{" "}
                {userDetail.invite_used_at
                  ? new Date(userDetail.invite_used_at).toLocaleString("ja-JP")
                  : "未記録"}
              </p>
            </div>
            <div className="soft-card-subtle">
              <p className="label-text mb-1">今つながりたいこと</p>
              <p className="text-sm leading-6 text-[#365f78]">{userDetail.want_to_connect?.trim() ? userDetail.want_to_connect : "未入力"}</p>
            </div>
            <div className="soft-card-subtle">
              <p className="label-text mb-1">自己紹介</p>
              <p className="text-sm leading-6 text-[#365f78]">{userDetail.intro?.trim() ? userDetail.intro : "未入力"}</p>
            </div>
            <button type="button" className="secondary-btn !h-11" onClick={handleToggleSuspend} disabled={isUpdating}>
              {isUpdating ? "更新中..." : userDetail.is_suspended ? "停止を解除" : "利用停止"}
            </button>
          </section>
        ) : null}
      </main>
    </div>
  );
}
