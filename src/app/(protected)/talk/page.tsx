"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";
import { toMamaDisplayName } from "../../../lib/profile/displayName";
import {
  chatByOtherUserMap,
  pendingReceivedOffers,
  pendingSentOffers,
  splitMatchedAndEnded,
} from "../../../lib/talk/wantsSummary";

type WantRow = {
  id: string;
  from_user: string;
  to_user: string;
  status: "pending" | "matched" | "declined" | "cancelled";
};

type ProfileRow = {
  id: string;
  nickname: string;
  area: string;
  want_to_connect: string;
  connection_achievement_count: number;
  profile_completed: boolean;
};

type TalkCard = {
  wantId?: string;
  otherUserId: string;
  nickname: string;
  area: string;
  wantToConnect: string;
  connectionAchievementCount: number;
  label: string;
  expiresAt?: string;
};

type ChatRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  expires_at: string;
  status: string;
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
      .select("id,from_user,to_user,status")
      .or(`from_user.eq.${user.id},to_user.eq.${user.id}`);

    if (wantsError) {
      setMessage("一覧の取得に失敗しました。時間をおいて再度お試しください。");
      setLoading(false);
      return;
    }

    const wants = (wantsData ?? []).map((raw) => ({
      id: raw.id,
      from_user: raw.from_user,
      to_user: raw.to_user,
      status: String(raw.status ?? "")
        .trim()
        .toLowerCase() as WantRow["status"],
    })) as WantRow[];

    const { data: chatsData } = await supabase
      .from("chats")
      .select("id,user_a_id,user_b_id,expires_at,status")
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

    const chats = (chatsData ?? []) as ChatRow[];
    const chatByOtherUser = chatByOtherUserMap(user.id, chats);

    const { matchedOtherIds, endedOtherIds } = splitMatchedAndEnded(user.id, wants, chatByOtherUser);
    const matchedIdSet = new Set(matchedOtherIds);
    const endedIdSet = new Set(endedOtherIds);

    const receivedWants = pendingReceivedOffers(user.id, wants, matchedIdSet, endedIdSet);
    const sentWants = pendingSentOffers(user.id, wants, matchedIdSet, endedIdSet);

    const uniqueReceived = Array.from(
      new Map(receivedWants.map((item) => [item.otherUserId, item])).values()
    );
    const uniqueSent = Array.from(new Map(sentWants.map((item) => [item.otherUserId, item])).values());

    const profileIds = Array.from(
      new Set([
        ...matchedOtherIds,
        ...endedOtherIds,
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
      .select("id,nickname,area,want_to_connect,connection_achievement_count,profile_completed")
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
        connectionAchievementCount: p.connection_achievement_count ?? 0,
        label,
        expiresAt,
      };
    };

    setMatchedCards(
      matchedOtherIds.map((id) => {
        const card = toCard(id, "一致");
        if (card) return card;
        return {
          otherUserId: id,
          nickname: "相手",
          area: "",
          wantToConnect: "一致しました。下のボタンからチャットへ進めます。",
          connectionAchievementCount: 0,
          label: "一致",
        };
      })
    );
    setReceivedCards(
      uniqueReceived
        .map((item) => toCard(item.otherUserId, "オファーが届いています", item.wantId))
        .filter((v): v is TalkCard => v !== null)
    );
    setSentCards(
      uniqueSent
        .map((item) => toCard(item.otherUserId, "オファー中", item.wantId))
        .filter((v): v is TalkCard => v !== null)
    );
    const ended = Array.from(endedOtherIds)
      .map((id) => toCard(id, "チャットは終了しました", undefined, chatByOtherUser.get(id)?.expires_at))
      .filter((v): v is TalkCard => v !== null)
      .sort((a, b) => new Date(b.expiresAt ?? 0).getTime() - new Date(a.expiresAt ?? 0).getTime());
    setEndedCards(ended);
    setLoading(false);
  };

  useEffect(() => {
    fetchTalks();
  }, []);

  const handleResponse = async (wantId: string | undefined, nextStatus: "matched" | "declined") => {
    if (!wantId || !currentUserId) return;
    setUpdatingWantId(wantId);
    setFeedbackMessage("");

    const respondedAt = new Date().toISOString();
    const { error } = await supabase
      .from("wants")
      .update({ status: nextStatus, responded_at: respondedAt })
      .eq("id", wantId)
      .eq("to_user", currentUserId);

    setUpdatingWantId(null);

    if (error) {
      setFeedbackMessage("更新できませんでした。時間をおいて再度お試しください。");
      return;
    }

    setFeedbackMessage(nextStatus === "matched" ? "承諾しました。" : "今回は見送りました。");
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
    <article key={`${section}-${card.otherUserId}`} className="soft-card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold leading-6 text-[#2f5f79]">{toMamaDisplayName(card.nickname)}</h3>
          <p className="text-xs muted-text">{card.area}</p>
        </div>
        <span className="inline-flex rounded-full px-2.5 py-1 text-xs pill-blue">{card.label}</span>
      </div>
      <p className="text-sm leading-6 text-[#365f78]">{card.wantToConnect}</p>
      {card.connectionAchievementCount > 0 ? (
        <div className="soft-card-subtle !px-3 !py-2">
          <p className="text-xs text-[#5b798d]">つながり実績 {card.connectionAchievementCount}</p>
        </div>
      ) : null}
      {section === "matched" ? (
        <button
          type="button"
          className="secondary-btn !h-11"
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
            className="primary-btn !h-11"
            disabled={updatingWantId === card.wantId}
            onClick={() => handleResponse(card.wantId, "matched")}
          >
            話してみたい
          </button>
          <button
            type="button"
            className="secondary-btn !h-11"
            disabled={updatingWantId === card.wantId}
            onClick={() => handleResponse(card.wantId, "declined")}
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
            <p className="muted-text text-sm">オファーはまだありません。</p>
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
              <h2 className="section-title">一致</h2>
              {matchedCards.length > 0 ? (
                matchedCards.map((card) => renderCard(card, "matched"))
              ) : (
                <div className="soft-card-subtle">
                  <p className="section-note">まだ一致した相手はいません。</p>
                </div>
              )}
            </section>

            <section className="screen-stack">
              <h2 className="section-title">オファーが届いています</h2>
              {receivedCards.length > 0 ? (
                receivedCards.map((card) => renderCard(card, "received"))
              ) : (
                <div className="soft-card-subtle">
                  <p className="section-note">まだ届いたリクエストはありません。</p>
                </div>
              )}
            </section>

            <section className="screen-stack">
              <h2 className="section-title">オファー中</h2>
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

      </main>
    </div>
  );
}
