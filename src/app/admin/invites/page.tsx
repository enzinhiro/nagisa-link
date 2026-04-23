"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase/client";
import { isAdminEmail } from "../../../lib/admin-access";
import { AdminSectionNav } from "../_components/admin-section-nav";
import { AdminBottomNav } from "../_components/admin-bottom-nav";

type InviteRow = {
  id: string;
  code: string;
  created_at: string;
  is_used: boolean;
  is_active: boolean;
  used_by_user_id: string | null;
  used_by_email: string | null;
  used_at: string | null;
  note: string | null;
};

type InviteStatus = "unused" | "used" | "disabled";

function resolveInviteStatus(invite: InviteRow): InviteStatus {
  if (invite.is_used) return "used";
  if (!invite.is_active) return "disabled";
  return "unused";
}

export default function AdminInvitesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [createNote, setCreateNote] = useState("");
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "unused" | "used" | "disabled">("all");
  const [searchText, setSearchText] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [invites, setInvites] = useState<InviteRow[]>([]);

  const fetchInvites = async () => {
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

    const { data, error } = await supabase.rpc("admin_list_invite_codes");
    if (error) {
      setMessage("招待コード一覧の取得に失敗しました。");
      setLoading(false);
      return;
    }

    const rows = ((data ?? []) as InviteRow[]).sort((a, b) => {
      const rank = (row: InviteRow) => {
        const status = resolveInviteStatus(row);
        if (status === "unused") return 0;
        if (status === "disabled") return 1;
        return 2;
      };
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    setInvites(rows);
    setNoteDrafts(
      rows.reduce<Record<string, string>>((acc, row) => {
        acc[row.id] = row.note ?? "";
        return acc;
      }, {})
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchInvites();
  }, [router]);

  const handleCreateInvite = async () => {
    setCreating(true);
    setFeedbackMessage("");

    const { data, error } = await supabase.rpc("admin_create_invite_code", {
      input_note: createNote,
    });

    setCreating(false);
    if (error) {
      setFeedbackMessage("発行に失敗しました。時間をおいて再度お試しください。");
      return;
    }

    setCreateNote("");
    const issuedCode = ((data ?? [])[0] as { code?: string } | undefined)?.code;
    setFeedbackMessage(
      issuedCode ? `招待コードを発行しました。${issuedCode}` : "招待コードを発行しました。"
    );
    await fetchInvites();
  };

  const handleSaveNote = async (inviteId: string) => {
    setSavingNoteId(inviteId);
    setFeedbackMessage("");

    const { data, error } = await supabase.rpc("admin_update_invite_note", {
      input_invite_id: inviteId,
      input_note: noteDrafts[inviteId] ?? "",
    });

    setSavingNoteId(null);
    if (error || !data) {
      setFeedbackMessage("メモの保存に失敗しました。");
      return;
    }

    setFeedbackMessage("メモを保存しました。");
    await fetchInvites();
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setFeedbackMessage("コピーしました。");
      setTimeout(() => {
        setCopiedCode((prev) => (prev === code ? null : prev));
      }, 1600);
    } catch {
      setFeedbackMessage("コピーに失敗しました。");
    }
  };

  const visibleInvites = invites.filter((invite) => {
    const status = resolveInviteStatus(invite);
    const keyword = searchText.trim().toLowerCase();
    if (keyword) {
      const haystack = [invite.code, invite.used_by_email ?? "", invite.note ?? ""].join(" ").toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    if (statusFilter === "unused") return status === "unused";
    if (statusFilter === "used") return status === "used";
    if (statusFilter === "disabled") return status === "disabled";
    return true;
  });

  const handleToggleActive = async (invite: InviteRow) => {
    setUpdatingStatusId(invite.id);
    setFeedbackMessage("");
    const { data, error } = await supabase.rpc("admin_set_invite_code_active", {
      input_invite_id: invite.id,
      input_is_active: !invite.is_active,
    });
    setUpdatingStatusId(null);
    if (error || !data) {
      setFeedbackMessage("状態の更新に失敗しました。時間をおいて再度お試しください。");
      return;
    }
    setInvites((prev) =>
      prev.map((row) => (row.id === invite.id ? { ...row, is_active: !invite.is_active } : row))
    );
    setFeedbackMessage(invite.is_active ? "招待コードを無効化しました。" : "招待コードを有効化しました。");
  };

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack pb-24">
        <header className="soft-card flex flex-col gap-1 !py-2.5">
          <AdminSectionNav current="invite-codes" />
          <h1 className="hero-title text-2xl font-semibold">招待コード管理</h1>
        </header>

        {!loading && !message ? (
          <section className="soft-card flex flex-col gap-3.5">
            <div className="flex items-end justify-between gap-2">
              <h2 className="section-title">招待コードを発行</h2>
              <p className="section-note">必要なときに1件ずつ発行します</p>
            </div>
            <label className="flex flex-col gap-1.5">
                <span className="label-text">共有先メモ（任意）</span>
              <input
                className="mock-input !h-11"
                value={createNote}
                onChange={(e) => setCreateNote(e.target.value)}
                placeholder="例: 逗子ママ会 田中さん"
              />
            </label>
            <button type="button" className="primary-btn !h-11" disabled={creating} onClick={handleCreateInvite}>
              {creating ? "発行中..." : "招待コードを発行"}
            </button>
          </section>
        ) : null}

        {loading ? (
          <section className="soft-card">
            <p className="muted-text text-sm">招待コードを読み込んでいます...</p>
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

        {!loading && !message && invites.length === 0 ? (
          <section className="soft-card">
            <p className="muted-text text-sm">まだ招待コードはありません。上のボタンから発行できます。</p>
          </section>
        ) : null}

        {!loading && !message && invites.length > 0 ? (
          <section className="soft-card flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="section-title">発行済みコード一覧</h2>
              <select
                className="mock-select admin-select !h-11 !w-auto min-w-[124px] py-0"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | "unused" | "used" | "disabled")
                }
              >
                <option value="all">すべて</option>
                <option value="unused">未使用のみ</option>
                <option value="used">使用済みのみ</option>
                <option value="disabled">無効のみ</option>
              </select>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="label-text">検索（コード / 使用者メール / 共有先メモ）</span>
              <input
                className="mock-input !h-11"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="キーワードで検索"
              />
            </label>
            <p className="text-xs muted-text">表示件数: {visibleInvites.length}件</p>
            <p className="section-note">未使用 → 無効 → 使用済み の順で表示しています。</p>
          </section>
        ) : null}

        {!loading &&
          !message &&
          visibleInvites.map((invite) => (
            <article key={invite.id} className="soft-card flex flex-col gap-3">
              {(() => {
                const status = resolveInviteStatus(invite);
                const isUpdatingStatus = updatingStatusId === invite.id;
                return (
                  <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="break-all text-sm font-semibold leading-6 text-[#2f5f79]">{invite.code}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs ${
                      status === "disabled"
                        ? "bg-[#eef4f8] text-[#6f8796]"
                        : status === "used"
                          ? "pill-pink"
                          : "pill-blue"
                    }`}
                  >
                    {status === "disabled" ? "無効" : status === "used" ? "使用済み" : "未使用"}
                  </span>
                  <button
                    type="button"
                    className="secondary-btn !h-9 !w-auto px-3 text-xs"
                    onClick={() => handleCopyCode(invite.code)}
                  >
                    {copiedCode === invite.code ? "コピーしました" : "コピー"}
                  </button>
                </div>
              </div>
              <p className="text-xs muted-text">発行日: {new Date(invite.created_at).toLocaleString("ja-JP")}</p>
              <p className="text-sm text-[#365f78]">使用者メール: {invite.used_by_email ?? "未使用"}</p>
              {invite.used_at ? (
                <p className="text-xs muted-text">使用日時: {new Date(invite.used_at).toLocaleString("ja-JP")}</p>
              ) : null}
              {invite.used_by_user_id ? (
                <Link href={`/admin/users/${invite.used_by_user_id}`} className="text-xs text-[#3f7aa0] underline underline-offset-2">
                  使用ユーザー詳細を見る
                </Link>
              ) : null}
              <label className="flex flex-col gap-1.5">
                <span className="label-text">共有先メモ</span>
                <input
                  className="mock-input !h-11"
                  value={noteDrafts[invite.id] ?? ""}
                  onChange={(e) =>
                    setNoteDrafts((prev) => ({
                      ...prev,
                      [invite.id]: e.target.value,
                    }))
                  }
                  placeholder="共有先メモを入力"
                />
              </label>
              <button
                type="button"
                className="secondary-btn !h-11"
                disabled={savingNoteId === invite.id || isUpdatingStatus}
                onClick={() => handleSaveNote(invite.id)}
              >
                {savingNoteId === invite.id ? "保存中..." : "メモを保存"}
              </button>
              {status === "used" ? (
                <p className="text-xs muted-text">使用済みのコードは状態変更できません。</p>
              ) : (
                <button
                  type="button"
                  className="secondary-btn !h-11"
                  disabled={isUpdatingStatus || savingNoteId === invite.id}
                  onClick={() => handleToggleActive(invite)}
                >
                  {isUpdatingStatus ? "更新中..." : status === "unused" ? "無効化" : "有効化"}
                </button>
              )}
                  </>
                );
              })()}
            </article>
          ))}

        {!loading && !message && invites.length > 0 && visibleInvites.length === 0 ? (
          <section className="soft-card">
            <p className="muted-text text-sm">該当するコードはありません。</p>
          </section>
        ) : null}
      </main>
      <AdminBottomNav />
    </div>
  );
}
