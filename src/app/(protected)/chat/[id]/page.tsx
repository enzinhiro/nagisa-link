"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase/client";
import { toMamaDisplayName } from "../../../../lib/profile/displayName";

type ChatRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
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
  const [otherProfile, setOtherProfile] = useState<ProfileRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [inputBody, setInputBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const fetchChatDetail = async () => {
    setLoading(true);
    setMessage("");
    setOtherProfile(null);
    setMessages([]);

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
      .select("id,user_a_id,user_b_id")
      .eq("id", chatId)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .maybeSingle();

    if (chatError || !chat) {
      setMessage("このチャットは表示できません。");
      setLoading(false);
      return;
    }

    const chatRow = chat as ChatRow;
    const otherUserId = chatRow.user_a_id === user.id ? chatRow.user_b_id : chatRow.user_a_id;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,nickname,area")
      .eq("id", otherUserId)
      .eq("profile_completed", true)
      .maybeSingle();

    if (profileError || !profile) {
      setMessage("相手プロフィールが見つかりませんでした。");
      setLoading(false);
      return;
    }

    const { data: messageRows, error: messageError } = await supabase
      .from("messages")
      .select("id,created_at,sender_user_id,body")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (messageError) {
      setMessage("メッセージの取得に失敗しました。");
      setLoading(false);
      return;
    }

    setOtherProfile(profile as ProfileRow);
    setMessages((messageRows ?? []) as MessageRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchChatDetail();
  }, [chatId]);

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

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3">
          <Link href="/talk" className="text-sm muted-text underline underline-offset-3">
            話したい一覧に戻る
          </Link>
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
            <section className="soft-card flex items-center gap-3">
              <div className="h-11 w-11 rounded-full border border-[#cde5f2] bg-[#dff2ff]" />
              <div>
                <h1 className="hero-title text-lg font-semibold">{toMamaDisplayName(otherProfile.nickname)}</h1>
                <p className="text-xs muted-text">{otherProfile.area}</p>
              </div>
            </section>

            <section className="soft-card flex flex-col gap-3">
              <div className="soft-card-subtle">
                <p className="text-sm text-[#365f78] leading-6">
                  まずはここからやり取りできます。安心できる範囲で短いメッセージから始めましょう。
                </p>
              </div>
              <div className="flex flex-col gap-2">
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
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                            isMine
                              ? "bg-[#dff2ff] text-[#2f5f79] border border-[#cde5f2]"
                              : "bg-white text-[#365f78] border border-[#d8e7ef]"
                          }`}
                        >
                          {row.body}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="soft-card flex flex-col gap-2.5">
              {feedbackMessage ? <p className="text-sm text-rose-700">{feedbackMessage}</p> : null}
              <div className="flex gap-2">
              <input
                className="mock-input"
                placeholder="メッセージを入力"
                value={inputBody}
                onChange={(e) => setInputBody(e.target.value)}
                maxLength={500}
                disabled={isSending}
              />
              <button
                type="button"
                className="secondary-btn !w-[88px]"
                onClick={handleSend}
                disabled={isSending}
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
