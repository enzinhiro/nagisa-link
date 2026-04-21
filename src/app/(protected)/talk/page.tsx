"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";
import { toMamaDisplayName } from "../../../lib/profile/displayName";

type WantRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "rejected";
};

type ProfileRow = {
  id: string;
  nickname: string;
  area: string;
  want_to_connect: string;
  profile_completed: boolean;
};

type TalkCard = {
  wantId?: string;
  otherUserId: string;
  nickname: string;
  area: string;
  wantToConnect: string;
  label: string;
  expiresAt?: string;
};

type ChatRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  expires_at: string;
  status: "active";
};

export default function TalkPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [updatingWantId, setUpdatingWantId] = useState<string | null>(null);
  const [creatingChatUserId, setCreatingChatUserId] = useState<string | null>(null);
  const [matchedCards, setMatchedCards] = useState<TalkCard[]>([]);
  const [receivedCards, setReceivedCards] = useState<TalkCard[]>([]);
  const [sentCards, setSentCards] = useState<TalkCard[]>([]);
  const [endedCards, setEndedCards] = useState<TalkCard[]>([]);

  const hasAnyCards = useMemo(
    () => matchedCards.length + receivedCards.length + sentCards.length + endedCards.length > 0,
    [matchedCards.length, receivedCards.length, sentCards.length, endedCards.length]
  );

  const fetchTalks = async () => {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("ログイン情報を確認できませんでした。");
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const { data: wantsData, error: wantsError } = await supabase
      .from("wants")
      .select("id,from_user_id,to_user_id,status")
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

    if (wantsError) {
      setMessage("一覧の取得に失敗しました。時間をおいて再度お試しください。");
      setLoading(false);
      return;
    }

    const wants = (wantsData ?? []) as WantRow[];
    const acceptedSet = new Set(
      wants
        .filter((w) => w.status === "accepted")
        .map((w) => `${w.from_user_id}->${w.to_user_id}`)
    );

    const matchedUserIds = new Set<string>();
    const endedUserIds = new Set<string>();
    const receivedWants: { wantId: string; otherUserId: string }[] = [];
    const sentWants: { wantId: string; otherUserId: string }[] = [];

    const { data: chatsData } = await supabase
      .from("chats")
      .select("id,user_a_id,user_b_id,expires_at,status")
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

    const chats = (chatsData ?? []) as ChatRow[];
    const chatByOtherUser = new Map<string, ChatRow>();
    for (const chat of chats) {
      const otherId = chat.user_a_id === user.id ? chat.user_b_id : chat.user_a_id;
      const prev = chatByOtherUser.get(otherId);
      if (!prev || new Date(chat.expires_at).getTime() > new Date(prev.expires_at).getTime()) {
        chatByOtherUser.set(otherId, chat);
      }
    }

    for (const want of wants) {
      const otherUserId = want.from_user_id === user.id ? want.to_user_id : want.from_user_id;
      if (!otherUserId || otherUserId === user.id) continue;

      const isMutualAccepted =
        acceptedSet.has(`${user.id}->${otherUserId}`) && acceptedSet.has(`${otherUserId}->${user.id}`);
      if (isMutualAccepted) {
        const relatedChat = chatByOtherUser.get(otherUserId);
        if (relatedChat && new Date(relatedChat.expires_at).getTime() <= Date.now()) {
          endedUserIds.add(otherUserId);
        } else {
          matchedUserIds.add(otherUserId);
        }
      }

      if (
        want.to_user_id === user.id &&
        want.status === "pending" &&
        !isMutualAccepted
      ) {
        receivedWants.push({ wantId: want.id, otherUserId });
      }

      if (
        want.from_user_id === user.id &&
        want.status === "pending" &&
        !isMutualAccepted
      ) {
        sentWants.push({ wantId: want.id, otherUserId });
      }
    }

    const matchedIdSet = new Set(Array.from(matchedUserIds));
    const endedIdSet = new Set(Array.from(endedUserIds));
    const uniqueReceived = Array.from(
      new Map(
        receivedWants
          .filter((item) => !matchedIdSet.has(item.otherUserId) && !endedIdSet.has(item.otherUserId))
          .map((item) => [item.otherUserId, item])
      ).values()
    );
    const uniqueSent = Array.from(
      new Map(
        sentWants
          .filter((item) => !matchedIdSet.has(item.otherUserId) && !endedIdSet.has(item.otherUserId))
          .map((item) => [item.otherUserId, item])
      ).values()
    );

    const profileIds = Array.from(
      new Set([
        ...Array.from(matchedUserIds),
        ...Array.from(endedUserIds),
        ...uniqueReceived.map((item) => item.otherUserId),
        ...uniqueSent.map((item) => item.otherUserId),
      ])
    );

    if (profileIds.length === 0) {
      setMatchedCards([]);
      setReceivedCards([]);
      setSentCards([]);
      setEndedCards([]);
      setLoading(false);
      return;
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id,nickname,area,want_to_connect,profile_completed")
      .in("id", profileIds)
      .eq("profile_completed", true);

    if (profilesError) {
      setMessage("相手プロフィールの取得に失敗しました。");
      setLoading(false);
      return;
    }

    const profileMap = new Map<string, ProfileRow>();
    for (const profile of (profilesData ?? []) as ProfileRow[]) {
      profileMap.set(profile.id, profile);
    }

    const toCard = (id: string, label: string, wantId?: string, expiresAt?: string): TalkCard | null => {
      const p = profileMap.get(id);
      if (!p) return null;
      return {
        wantId,
        otherUserId: id,
        nickname: p.nickname,
        area: p.area,
        wantToConnect: p.want_to_connect,
        label,
        expiresAt,
      };
    };

    setMatchedCards(
      Array.from(matchedUserIds).map((id) => toCard(id, "一致した")).filter((v): v is TalkCard => v !== null)
    );
    setReceivedCards(
      uniqueReceived
        .map((item) => toCard(item.otherUserId, "届いた", item.wantId))
        .filter((v): v is TalkCard => v !== null)
    );
    setSentCards(
      uniqueSent
        .map((item) => toCard(item.otherUserId, "送った", item.wantId))
        .filter((v): v is TalkCard => v !== null)
    );
    const ended = Array.from(endedUserIds)
      .map((id) => toCard(id, "チャットは終了しました", undefined, chatByOtherUser.get(id)?.expires_at))
      .filter((v): v is TalkCard => v !== null)
      .sort((a, b) => new Date(b.expiresAt ?? 0).getTime() - new Date(a.expiresAt ?? 0).getTime());
    setEndedCards(ended);
    setLoading(false);
  };

  useEffect(() => {
    fetchTalks();
  }, []);

  const handleResponse = async (wantId: string | undefined, nextStatus: "accepted" | "rejected") => {
    if (!wantId || !currentUserId) return;
    setUpdatingWantId(wantId);
    setFeedbackMessage("");

    const { error } = await supabase
      .from("wants")
      .update({ status: nextStatus })
      .eq("id", wantId)
      .eq("to_user_id", currentUserId);

    setUpdatingWantId(null);

    if (error) {
      setFeedbackMessage("更新できませんでした。時間をおいて再度お試しください。");
      return;
    }

    setFeedbackMessage(nextStatus === "accepted" ? "承諾しました。" : "今回は見送りました。");
    await fetchTalks();
  };

  const handleCreateOrOpenChat = async (otherUserId: string) => {
    setFeedbackMessage("");
    setCreatingChatUserId(otherUserId);

    const { data: chatId, error } = await supabase.rpc("create_or_get_chat_with_user", {
      target_user_id: otherUserId,
    });

    setCreatingChatUserId(null);

    if (error || !chatId) {
      setFeedbackMessage("チャットの準備に失敗しました。時間をおいて再度お試しください。");
      return;
    }

    router.push(`/chat/${chatId}`);
  };

  const renderCard = (card: TalkCard, section: "matched" | "received" | "sent" | "ended") => (
    <article key={`${section}-${card.otherUserId}`} className="soft-card flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#2f5f79]">{toMamaDisplayName(card.nickname)}</h3>
        <span className="inline-flex rounded-full px-2.5 py-1 text-xs pill-blue">{card.label}</span>
      </div>
      <p className="text-xs muted-text">{card.area}</p>
      <p className="text-sm text-[#365f78]">{card.wantToConnect}</p>
      {section === "matched" ? (
        <button
          type="button"
          className="secondary-btn !h-10"
          onClick={() => handleCreateOrOpenChat(card.otherUserId)}
          disabled={creatingChatUserId === card.otherUserId}
        >
          {creatingChatUserId === card.otherUserId ? "準備中..." : "チャットへ進む"}
        </button>
      ) : null}
      {section === "received" ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="primary-btn !h-10"
            disabled={updatingWantId === card.wantId}
            onClick={() => handleResponse(card.wantId, "accepted")}
          >
            話してみたい
          </button>
          <button
            type="button"
            className="secondary-btn !h-10"
            disabled={updatingWantId === card.wantId}
            onClick={() => handleResponse(card.wantId, "rejected")}
          >
            今回は見送る
          </button>
        </div>
      ) : null}
      {section === "sent" ? <p className="section-note">返答待ち</p> : null}
      {section === "ended" ? <p className="section-note">チャットは終了しました</p> : null}
    </article>
  );

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3">
          <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-blue">話したい</p>
          <h1 className="hero-title text-2xl font-semibold">つながりリクエスト</h1>
          <p className="muted-text text-sm">一致した・届いた・送ったを確認できます。</p>
        </header>

        {loading ? (
          <section className="soft-card">
            <p className="muted-text text-sm">一覧を読み込んでいます...</p>
          </section>
        ) : null}

        {!loading && message ? (
          <section className="soft-card">
            <p className="text-sm text-rose-700">{message}</p>
          </section>
        ) : null}

        {!loading && !message && !hasAnyCards ? (
          <section className="soft-card">
            <p className="muted-text text-sm">
              まだ「話したい」の動きはありません。気になる相手がいたら、さがす画面から送ってみましょう。
            </p>
          </section>
        ) : null}

        {!loading && !message && feedbackMessage ? (
          <section className="soft-card">
            <p className="text-sm text-[#3f6680]">{feedbackMessage}</p>
          </section>
        ) : null}

        {!loading && !message ? (
          <>
            <section className="screen-stack">
              <h2 className="section-title">一致した</h2>
              {matchedCards.length > 0 ? (
                matchedCards.map((card) => renderCard(card, "matched"))
              ) : (
                <div className="soft-card-subtle">
                  <p className="section-note">まだ一致した相手はいません。</p>
                </div>
              )}
            </section>

            <section className="screen-stack">
              <h2 className="section-title">届いた</h2>
              {receivedCards.length > 0 ? (
                receivedCards.map((card) => renderCard(card, "received"))
              ) : (
                <div className="soft-card-subtle">
                  <p className="section-note">まだ届いたリクエストはありません。</p>
                </div>
              )}
            </section>

            <section className="screen-stack">
              <h2 className="section-title">送った</h2>
              {sentCards.length > 0 ? (
                sentCards.map((card) => renderCard(card, "sent"))
              ) : (
                <div className="soft-card-subtle">
                  <p className="section-note">まだ送ったリクエストはありません。</p>
                </div>
              )}
            </section>

            <section className="screen-stack">
              <h2 className="section-title">終了済み</h2>
              {endedCards.length > 0 ? (
                endedCards.map((card) => renderCard(card, "ended"))
              ) : (
                <div className="soft-card-subtle">
                  <p className="section-note">終了済みのチャットはありません。</p>
                </div>
              )}
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
