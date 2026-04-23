"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../../lib/supabase/client";
import { toMamaDisplayName } from "../../../../lib/profile/displayName";

type ChatRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  expires_at: string;
};

type ProfileRow = {
  id: string;
  nickname: string;
  area: string;
};

type MessageRow = {
  id: string;
  created_at: string;
  sender_user_id: string;
  body: string;
};

export default function ChatDetailPage() {
  const params = useParams<{ id: string }>();
  const chatId = params.id;

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherProfile, setOtherProfile] = useState<ProfileRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [inputBody, setInputBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const [reportReason, setReportReason] = useState("uncomfortable");
  const [reportNote, setReportNote] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const fetchChatDetail = async () => {
    setLoading(true);
    setMessage("");
    setOtherProfile(null);
    setMessages([]);
    setOtherUserId(null);
    setExpiresAt(null);
    setIsExpired(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("ログイン状態を確認できませんでした。");
      setLoading(false);
      return;
    }
    setCurrentUserId(user.id);

    if (!chatId) {
      setMessage("チャットが見つかりませんでした。");
      setLoading(false);
      return;
    }

    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("id,user_a_id,user_b_id,expires_at")
      .eq("id", chatId)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .maybeSingle();

    if (chatError || !chat) {
      setMessage("このチャットは表示できません。");
      setLoading(false);
      return;
    }

    const chatRow = chat as ChatRow;
    setExpiresAt(chatRow.expires_at);
    setIsExpired(new Date(chatRow.expires_at).getTime() <= Date.now());
    const otherUserIdFromChat = chatRow.user_a_id === user.id ? chatRow.user_b_id : chatRow.user_a_id;
    setOtherUserId(otherUserIdFromChat);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,nickname,area")
      .eq("id", otherUserIdFromChat)
      .eq("profile_completed", true)
      .maybeSingle();

    if (profileError || !profile) {
      setMessage("このユーザーは現在表示できません。");
      setLoading(false);
      return;
    }

    const profileRow = profile as ProfileRow;
    setOtherProfile(profileRow);

    const { data: messageRows, error: messageError } = await supabase
      .from("messages")
      .select("id,created_at,sender_user_id,body")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (messageError) {
      setMessage("メッセージの取得に失敗しました。");
      setMessages([]);
      setLoading(false);
      return;
    }

    setMessages((messageRows ?? []) as MessageRow[]);
    setLoading(false);
  };

  const handleReportSubmit = async () => {
    if (!chatId || !currentUserId || !otherUserId) return;
    if (currentUserId === otherUserId) {
      setFeedbackMessage("この相手は通報対象にできません。");
      return;
    }

    setFeedbackMessage("");
    setIsReportSubmitting(true);

    const { error } = await supabase.from("reports").insert({
      chat_id: chatId,
      reporter_user_id: currentUserId,
      target_user_id: otherUserId,
      reason: reportReason,
      note: reportNote.trim() || null,
    });

    setIsReportSubmitting(false);

    if (error) {
      setFeedbackMessage("通報を送信できませんでした。時間をおいて再度お試しください。");
      return;
    }

    setIsReportOpen(false);
    setReportNote("");
    setReportReason("uncomfortable");
    setFeedbackMessage("通報を受け付けました。必要な場合のみ運営が確認します。");
  };

  useEffect(() => {
    fetchChatDetail();
  }, [chatId]);

  useEffect(() => {
    if (!chatId || message || !otherProfile) return;

    const channel = supabase
      .channel(`messages:chat:${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const row = payload.new as MessageRow;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, message, otherProfile]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const handleSend = async () => {
    if (!chatId || !currentUserId) return;

    setFeedbackMessage("");
    const trimmed = inputBody.trim();
    if (!trimmed) {
      setFeedbackMessage("メッセージを入力してください。");
      return;
    }
    if (trimmed.length > 500) {
      setFeedbackMessage("メッセージは500文字以内で入力してください。");
      return;
    }
    if (/https?:\/\//i.test(trimmed)) {
      setFeedbackMessage("URLは送信できません。");
      return;
    }

    setIsSending(true);

    const { data: chatRow, error: chatCheckError } = await supabase
      .from("chats")
      .select("expires_at,user_a_id,user_b_id")
      .eq("id", chatId)
      .or(`user_a_id.eq.${currentUserId},user_b_id.eq.${currentUserId}`)
      .maybeSingle();

    if (
      chatCheckError ||
      !chatRow ||
      new Date(chatRow.expires_at as string).getTime() <= Date.now()
    ) {
      setIsSending(false);
      setIsExpired(true);
      setFeedbackMessage("このチャットは終了しました。");
      return;
    }

    const { error } = await supabase.from("messages").insert({
      chat_id: chatId,
      sender_user_id: currentUserId,
      body: trimmed,
    });

    setIsSending(false);

    if (error) {
      setFeedbackMessage("送信に失敗しました。時間をおいて再度お試しください。");
      return;
    }

    setInputBody("");
    await fetchChatDetail();
  };

  const remainingHours = (() => {
    if (!expiresAt) return null;
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60));
  })();

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <Link href="/chat" className="text-sm muted-text underline underline-offset-3">
              チャット一覧に戻る
            </Link>
            <button
              type="button"
              className="secondary-btn !h-9 !w-auto px-3"
              onClick={() => setIsReportOpen((v) => !v)}
              disabled={!otherUserId || !currentUserId}
            >
              運営に知らせる
            </button>
          </div>
          <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-blue">チャット</p>
        </header>

        {loading ? (
          <section className="soft-card">
            <p className="muted-text text-sm">チャット情報を読み込んでいます...</p>
          </section>
        ) : null}

        {!loading && message ? (
          <section className="soft-card">
            <p className="muted-text text-sm">{message}</p>
          </section>
        ) : null}

        {!loading && !message && otherProfile ? (
          <>
            {isReportOpen ? (
              <section className="soft-card flex flex-col gap-3">
                <h2 className="section-title">運営へのご連絡</h2>
                <p className="section-note">必要な場合のみ、運営が内容を確認します。</p>
                <label>
                  <span className="label-text">理由</span>
                  <select
                    className="mock-select"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                  >
                    <option value="uncomfortable">不快な言動があった</option>
                    <option value="solicitation">勧誘のように感じた</option>
                    <option value="pressured_contact">連絡先交換を強く求められた</option>
                    <option value="suspicious_profile">プロフィールに違和感がある</option>
                    <option value="other">その他</option>
                  </select>
                </label>
                <label>
                  <span className="label-text">補足コメント（任意）</span>
                  <textarea
                    className="mock-textarea"
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    placeholder="必要に応じてご記入ください"
                  />
                </label>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleReportSubmit}
                  disabled={isReportSubmitting}
                >
                  {isReportSubmitting ? "送信中..." : "通報を送信する"}
                </button>
              </section>
            ) : null}

            <section className="soft-card flex items-center gap-3">
              <div className="h-11 w-11 rounded-full border border-[#cde5f2] bg-[#dff2ff]" />
              <div className="flex flex-col gap-0.5">
                <h1 className="hero-title text-lg font-semibold">{toMamaDisplayName(otherProfile.nickname)}</h1>
                <p className="text-xs muted-text">{otherProfile.area}</p>
                <p className="text-xs muted-text">
                  {remainingHours === null
                    ? ""
                    : remainingHours > 0
                      ? `残り${remainingHours}時間`
                      : "このチャットは終了しました"}
                </p>
              </div>
            </section>

            <section className="soft-card-subtle">
              <p className="text-xs leading-5 text-[#486f86]">
                このやり取りは期間限定です。URL送信はできません。必要な場合のみ運営が確認することがあります。個人情報の共有は慎重に進めましょう。
              </p>
            </section>

            <section className="soft-card flex flex-col gap-3">
              <div className="soft-card-subtle">
                <p className="text-sm text-[#365f78] leading-6">
                  まずはここからやり取りできます。安心できる範囲で短いメッセージから始めましょう。
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {messages.length === 0 ? (
                  <div className="rounded-2xl border border-[#d8e7ef] bg-white px-4 py-3">
                    <p className="text-sm muted-text">まだメッセージはありません。最初の一言を送ってみましょう。</p>
                  </div>
                ) : (
                  messages.map((row) => {
                    const isMine = row.sender_user_id === currentUserId;
                    return (
                      <div
                        key={row.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"} py-0.5`}
                      >
                        <div className={`max-w-[84%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-1`}>
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                              isMine
                                ? "bg-[#dff2ff] text-[#2f5f79] border border-[#cde5f2]"
                                : "bg-white text-[#365f78] border border-[#d8e7ef]"
                            }`}
                          >
                            {row.body}
                          </div>
                          <p className="px-1 text-[11px] text-[#7f99a8]">
                            {new Date(row.created_at).toLocaleTimeString("ja-JP", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>
            </section>

            <section className="soft-card flex flex-col gap-3">
              {feedbackMessage ? <p className="text-sm text-rose-700">{feedbackMessage}</p> : null}
              {isExpired ? (
                <p className="text-sm muted-text">このチャットは終了しました。</p>
              ) : null}
              <div className="flex items-end gap-2">
                <input
                  className="mock-input"
                  placeholder="メッセージを入力"
                  value={inputBody}
                  onChange={(e) => setInputBody(e.target.value)}
                  maxLength={500}
                  disabled={isSending || isExpired}
                />
                <button
                  type="button"
                  className="secondary-btn !w-[88px]"
                  onClick={handleSend}
                  disabled={isSending || isExpired}
                >
                  送信
                </button>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
