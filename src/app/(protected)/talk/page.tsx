"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";
import { toMamaDisplayName } from "../../../lib/profile/displayName";
import { canPerformUserWriteAction } from "../../../lib/account-status";
import { ProfileAvatar } from "../../../components/profile-avatar";
import { isMissingProfileColumnError } from "../../../lib/supabase/profile-query";
import {
  chatByOtherUserMap,
  pendingReceivedOffers,
  pendingSentOffers,
  splitMatchedAndEnded,
} from "../../../lib/talk/wantsSummary";
import { isVisiblePublicValue } from "../../../lib/profile/public-visibility";
import { toDisplayChildAgeGroups } from "../../../lib/profile/age-groups";

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
  child_age_group: string;
  child_age_groups: string[];
  want_to_connect: string;
  connection_achievement_count: number;
  avatar_seed: number | null;
};

type TalkCard = {
  wantId?: string;
  otherUserId: string;
  nickname: string;
  area: string;
  childAgeLabel: string;
  wantToConnect: string;
  connectionAchievementCount: number;
  avatarSeed: number | null;
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

  const fetchTalks = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
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

    let { data: profilesData, error: profilesError } = await supabase
      .from("public_profiles")
      .select("id,nickname,area,child_age_group,child_age_groups,want_to_connect,connection_achievement_count,avatar_seed")
      .in("id", profileIds);

    if (profilesError && isMissingProfileColumnError(profilesError)) {
      const fallback = await supabase
        .from("public_profiles")
        .select("id,nickname,area,child_age_group,want_to_connect,connection_achievement_count")
        .in("id", profileIds);
      profilesData = Array.isArray(fallback.data)
        ? fallback.data.map((row) => ({ ...row, avatar_seed: null, child_age_groups: [] }))
        : fallback.data;
      profilesError = fallback.error;
    }

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
        childAgeLabel: toDisplayChildAgeGroups(p.child_age_groups, p.child_age_group).join("・"),
        wantToConnect: p.want_to_connect,
        connectionAchievementCount: p.connection_achievement_count ?? 0,
        avatarSeed: p.avatar_seed,
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
          childAgeLabel: "",
          wantToConnect: "一致しました。下のボタンからチャットへ進めます。",
          connectionAchievementCount: 0,
          avatarSeed: null,
          label: "一致",
        };
      })
    );
    setReceivedCards(
      uniqueReceived
        .map((item) => toCard(item.otherUserId, "話したいが届いています", item.wantId))
        .filter((v): v is TalkCard => v !== null)
    );
    setSentCards(
      uniqueSent
        .map((item) => toCard(item.otherUserId, "話したい中", item.wantId))
        .filter((v): v is TalkCard => v !== null)
    );
    const ended = Array.from(endedOtherIds)
      .map((id) => toCard(id, "チャットは終了しました", undefined, chatByOtherUser.get(id)?.expires_at))
      .filter((v): v is TalkCard => v !== null)
      .sort((a, b) => new Date(b.expiresAt ?? 0).getTime() - new Date(a.expiresAt ?? 0).getTime());
    setEndedCards(ended);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchTalks();
  }, [fetchTalks]);

  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel(`talk-sync:${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wants" },
        (payload) => {
          const row = payload.new ?? payload.old;
          const fromUser = String((row as { from_user?: string } | null)?.from_user ?? "");
          const toUser = String((row as { to_user?: string } | null)?.to_user ?? "");
          if (fromUser !== currentUserId && toUser !== currentUserId) return;
          void fetchTalks(false);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chats" },
        (payload) => {
          const row = payload.new ?? payload.old;
          const userA = String((row as { user_a_id?: string } | null)?.user_a_id ?? "");
          const userB = String((row as { user_b_id?: string } | null)?.user_b_id ?? "");
          if (userA !== currentUserId && userB !== currentUserId) return;
          void fetchTalks(false);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchTalks]);

  const handleResponse = async (
    wantId: string | undefined,
    otherUserId: string,
    nextStatus: "matched" | "declined"
  ) => {
    if (!wantId || !currentUserId) return;
    setUpdatingWantId(wantId);
    setFeedbackMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await canPerformUserWriteAction(currentUserId, user.email))) {
      setUpdatingWantId(null);
      setFeedbackMessage("ご利用停止中のため、この操作はできません。");
      return;
    }

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

    if (nextStatus === "matched") {
      setFeedbackMessage("承諾しました。チャットへ移動します...");
      await handleCreateOrOpenChat(otherUserId);
      return;
    }
    setFeedbackMessage("今回は見送りました。");
    await fetchTalks(false);
  };

  const handleCreateOrOpenChat = async (otherUserId: string) => {
    if (!currentUserId) return;
    setFeedbackMessage("");
    setCreatingChatUserId(otherUserId);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await canPerformUserWriteAction(currentUserId, user.email))) {
      setCreatingChatUserId(null);
      setFeedbackMessage("ご利用停止中のため、この操作はできません。");
      return;
    }

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
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar
            userId={card.otherUserId}
            avatarSeed={card.avatarSeed}
            nickname={card.nickname}
            className="h-10 w-10"
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold leading-6 text-[#2f5f79]">{toMamaDisplayName(card.nickname)}</h3>
            {isVisiblePublicValue(card.area) || isVisiblePublicValue(card.childAgeLabel) ? (
              <p className="text-xs muted-text">
                {[card.area, card.childAgeLabel].filter((value) => isVisiblePublicValue(value)).join(" ・ ")}
              </p>
            ) : null}
          </div>
        </div>
        <span className={`talk-state-badge ${section === "matched" ? "talk-state-matched" : ""} ${section === "received" ? "talk-state-received" : ""} ${section === "sent" ? "talk-state-sent" : ""} ${section === "ended" ? "talk-state-ended" : ""}`}>
          {section === "matched"
            ? "一致しました"
            : section === "received"
              ? "届いています"
              : section === "sent"
                ? "返答待ち"
                : "終了"}
        </span>
      </div>
      {isVisiblePublicValue(card.wantToConnect) ? (
        <p className="person-summary-strip text-sm leading-6 text-[#365f78]">{card.wantToConnect}</p>
      ) : null}
      {card.connectionAchievementCount > 0 ? <p className="text-xs text-[#6a8292]">つながり実績 {card.connectionAchievementCount}</p> : null}
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
            onClick={() => handleResponse(card.wantId, card.otherUserId, "matched")}
          >
            話してみたい
          </button>
          <button
            type="button"
            className="secondary-btn !h-11"
            disabled={updatingWantId === card.wantId}
            onClick={() => handleResponse(card.wantId, card.otherUserId, "declined")}
          >
            今回は見送る
          </button>
        </div>
      ) : null}
      {section === "ended" && card.expiresAt ? (
        <p className="section-note">
          終了日時: {new Date(card.expiresAt).toLocaleDateString("ja-JP")}
        </p>
      ) : null}
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
            <p className="muted-text text-sm">まだ「話したい」はありません。</p>
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
              <h2 className="section-title">一致した相手</h2>
              {matchedCards.length > 0 ? (
                matchedCards.map((card) => renderCard(card, "matched"))
              ) : (
                <div className="empty-state-card">
                  <p className="section-note">まだ一致した相手はいません。</p>
                </div>
              )}
            </section>

            <section className="screen-stack">
              <h2 className="section-title">届いた話したい</h2>
              {receivedCards.length > 0 ? (
                receivedCards.map((card) => renderCard(card, "received"))
              ) : (
                <div className="empty-state-card">
                  <p className="section-note">届いている話したいはありません。</p>
                </div>
              )}
            </section>

            <section className="screen-stack">
              <h2 className="section-title">送った話したい</h2>
              {sentCards.length > 0 ? (
                sentCards.map((card) => renderCard(card, "sent"))
              ) : (
                <div className="empty-state-card">
                  <p className="section-note">送信中の話したいはありません。</p>
                </div>
              )}
            </section>

            <section className="screen-stack">
              <h2 className="section-title">終了済み</h2>
              {endedCards.length > 0 ? (
                endedCards.map((card) => renderCard(card, "ended"))
              ) : (
                <div className="empty-state-card">
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
