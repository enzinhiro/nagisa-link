"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase/client";
import { isAdminEmail } from "../../../lib/admin-access";

type InviteRow = {
  id: string;
  code: string;
  created_at: string;
  is_used: boolean;
  used_by_email: string | null;
  note: string | null;
};

export default function AdminInvitesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [createNote, setCreateNote] = useState("");
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
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

    const rows = (data ?? []) as InviteRow[];
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

    const { error } = await supabase.rpc("admin_create_invite_code", {
      input_note: createNote,
    });

    setCreating(false);
    if (error) {
      setFeedbackMessage("発行に失敗しました。時間をおいて再度お試しください。");
      return;
    }

    setCreateNote("");
    setFeedbackMessage("招待コードを発行しました。");
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

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3.5">
          <Link href="/admin" className="text-sm muted-text underline underline-offset-3">
            管理者トップに戻る
          </Link>
          <div className="flex flex-col gap-2">
            <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-blue">管理者</p>
            <h1 className="hero-title text-2xl font-semibold">招待コード管理</h1>
            <p className="muted-text text-sm">発行・利用状況・共有先メモをここで確認できます。</p>
          </div>
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
          <section className="soft-card">
            <h2 className="section-title">発行済みコード一覧</h2>
          </section>
        ) : null}

        {!loading &&
          !message &&
          invites.map((invite) => (
            <article key={invite.id} className="soft-card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold leading-6 text-[#2f5f79] break-all">{invite.code}</p>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs ${invite.is_used ? "pill-pink" : "pill-blue"}`}
                >
                  {invite.is_used ? "使用済み" : "未使用"}
                </span>
              </div>
              <p className="text-xs muted-text">発行日: {new Date(invite.created_at).toLocaleString("ja-JP")}</p>
              <p className="text-sm text-[#365f78]">使用者メール: {invite.used_by_email ?? "未使用"}</p>
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
                disabled={savingNoteId === invite.id}
                onClick={() => handleSaveNote(invite.id)}
              >
                {savingNoteId === invite.id ? "保存中..." : "メモを保存"}
              </button>
            </article>
          ))}
      </main>
    </div>
  );
}
