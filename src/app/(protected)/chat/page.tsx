"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase/client";
import { toMamaDisplayName } from "../../../lib/profile/displayName";
import { ProfileAvatar } from "../../../components/profile-avatar";
import { isMissingProfileColumnError } from "../../../lib/supabase/profile-query";
import { getChatLastReadAt } from "../../../lib/chat/read-state";
import { isVisiblePublicValue } from "../../../lib/profile/public-visibility";

type ChatRow = {
  id: string;
  created_at: string;
  user_a_id: string;
  user_b_id: string;
  expires_at: string;
};

type ProfileRow = {
  id: string;
  nickname: string;
  avatar_seed: number | null;
  area: string | null;
  child_age_group: string | null;
};

type MessageSummaryRow = {
  chat_id: string;
  sender_user_id: string;
  created_at: string;
  body: string;
};

type ChatCard = {
  id: string;
  otherUserId: string;
  otherDisplayName: string;
  otherNickname: string;
  otherAvatarSeed: number | null;
  expiresAt: string;
  area: string;
  childAgeGroup: string;
  isFallback: boolean;
  hasUnread: boolean;
  latestMessageBody: string;
  latestMessageAt: string | null;
};

export default function ChatIndexPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeChats, setActiveChats] = useState<ChatCard[]>([]);
  const [endedChats, setEndedChats] = useState<ChatCard[]>([]);

  const logRealtime = useCallback((label: string, extra?: unknown) => {
    if (process.env.NODE_ENV === "production") return;
    if (extra !== undefined) {
      console.info(`[chat list realtime] ${label}`, extra);
      return;
    }
    console.info(`[chat list realtime] ${label}`);
  }, []);

  const fetchChats = useCallback(
    async (showLoading = true) => {
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

      const { data, error } = await supabase
        .from("chats")
        .select("id,created_at,user_a_id,user_b_id,expires_at")
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

      if (error) {
        setMessage("チャット一覧の取得に失敗しました。");
        setLoading(false);
        return;
      }

      const chats = (data ?? []) as ChatRow[];
      if (chats.length === 0) {
        setActiveChats([]);
        setEndedChats([]);
        setLoading(false);
        return;
      }

      const otherIds = Array.from(
        new Set(
          chats
            .map((c) => (c.user_a_id === user.id ? c.user_b_id : c.user_a_id))
            .filter((id) => id !== user.id)
        )
      );
      const chatIds = chats.map((c) => c.id);

      let { data: profilesData, error: profilesError } = await supabase
        .from("public_profiles")
        .select("id,nickname,avatar_seed,area,child_age_group")
        .in("id", otherIds);
      if (profilesError && isMissingProfileColumnError(profilesError)) {
        const fallback = await supabase
          .from("public_profiles")
          .select("id,nickname,area,child_age_group")
          .in("id", otherIds);
        profilesData = Array.isArray(fallback.data)
          ? fallback.data.map((row) => ({ ...row, avatar_seed: null, area: null, child_age_group: null }))
          : fallback.data;
      }

      const profileMap = new Map<string, ProfileRow>();
      for (const p of (profilesData ?? []) as ProfileRow[]) {
        profileMap.set(p.id, p);
      }

      const { data: messageRows } = await supabase
        .from("messages")
        .select("chat_id,sender_user_id,created_at,body")
        .in("chat_id", chatIds)
        .order("created_at", { ascending: false });
      const messageMap = new Map<string, MessageSummaryRow[]>();
      for (const row of (messageRows ?? []) as MessageSummaryRow[]) {
        const list = messageMap.get(row.chat_id) ?? [];
        list.push(row);
        messageMap.set(row.chat_id, list);
      }

      const cards: ChatCard[] = chats.map((chat) => {
        const otherUserId = chat.user_a_id === user.id ? chat.user_b_id : chat.user_a_id;
        const chatMessages = messageMap.get(chat.id) ?? [];
        const latestMessage = chatMessages[0] ?? null;
        const lastReadAt = getChatLastReadAt(user.id, chat.id);
        const hasUnread = Boolean(
          latestMessage &&
            latestMessage.sender_user_id !== user.id &&
            (!lastReadAt || new Date(latestMessage.created_at).getTime() > new Date(lastReadAt).getTime())
        );
        const otherProfile = profileMap.get(otherUserId);
        if (!otherProfile) {
          return {
            id: chat.id,
            otherUserId,
            otherDisplayName: "このユーザーは現在表示できません",
            otherNickname: "相手",
            otherAvatarSeed: null,
            expiresAt: chat.expires_at,
            area: "",
            childAgeGroup: "",
            isFallback: true,
            hasUnread,
            latestMessageBody: latestMessage?.body ?? "",
            latestMessageAt: latestMessage?.created_at ?? null,
          };
        }
        return {
          id: chat.id,
          otherUserId,
          otherDisplayName: toMamaDisplayName(otherProfile.nickname),
          otherNickname: otherProfile.nickname,
          otherAvatarSeed: otherProfile.avatar_seed,
          expiresAt: chat.expires_at,
          area: otherProfile.area ?? "",
          childAgeGroup: otherProfile.child_age_group ?? "",
          isFallback: false,
          hasUnread,
          latestMessageBody: latestMessage?.body ?? "",
          latestMessageAt: latestMessage?.created_at ?? null,
        };
      });

      const now = Date.now();
      const active = cards
        .filter((c) => new Date(c.expiresAt).getTime() > now)
        .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
      const ended = cards
        .filter((c) => new Date(c.expiresAt).getTime() <= now)
        .sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime());

      setActiveChats(active);
      setEndedChats(ended);
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    void fetchChats();
    const timer = window.setInterval(() => {
      void fetchChats(false);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [fetchChats]);

  useEffect(() => {
    const channel = supabase
      .channel("chat-list:messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as MessageSummaryRow;
          logRealtime("INSERT received", { chatId: row.chat_id });
          void fetchChats(false);
        }
      )
      .subscribe((status) => {
        logRealtime(`status=${status}`);
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchChats, logRealtime]);

  const progressingChats = activeChats.filter((card) => card.hasUnread);
  const waitingChats = activeChats.filter((card) => !card.hasUnread);

  const renderCard = (card: ChatCard, type: "active" | "waiting" | "ended") => {
    const remainingHour = Math.max(0, Math.ceil((new Date(card.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)));
    const isNearEnd = type !== "ended" && remainingHour <= 6;
    const showArea = isVisiblePublicValue(card.area);
    const showAgeGroup = isVisiblePublicValue(card.childAgeGroup);
    const showLatestMessage = isVisiblePublicValue(card.latestMessageBody);
    return (
      <article key={`${type}-${card.id}`} className="soft-card flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <ProfileAvatar
            userId={card.otherUserId}
            avatarSeed={card.otherAvatarSeed}
            nickname={card.otherNickname}
            className="h-10 w-10"
          />
          <div className="min-w-0 flex flex-1 flex-col gap-1.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <h3 className="truncate font-semibold leading-6 text-[#2f5f79]">{card.otherDisplayName}</h3>
              {card.hasUnread ? (
                <span className="inline-flex w-fit rounded-full bg-[#fff0f6] px-2 py-0.5 text-[10px] text-[#9a4d6f]">
                  新着
                </span>
              ) : null}
            </div>
            {showArea || showAgeGroup ? (
              <p className="person-meta-line">
                {[card.area, card.childAgeGroup].filter((value) => isVisiblePublicValue(value)).join(" ・ ")}
              </p>
            ) : null}
            {showLatestMessage ? (
              <p className="text-xs text-[#5e7a8d] line-clamp-1">
                {card.latestMessageBody}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className={`chat-state-badge ${type === "active" ? "chat-state-active" : ""} ${type === "waiting" ? "chat-state-waiting" : ""} ${type === "ended" ? "chat-state-ended" : ""}`}>
              {type === "active" ? "進行中" : type === "waiting" ? "待機中" : "終了"}
            </span>
            <span className={`chat-remaining-badge ${type === "ended" ? "chat-remaining-ended" : isNearEnd ? "chat-remaining-soon" : "chat-remaining-active"}`}>
              {type === "ended" ? "終了しました" : `残り${remainingHour}時間`}
            </span>
          </div>
        </div>
        <Link href={`/chat/${card.id}`} className={`${type === "active" ? "primary-btn" : "secondary-btn"} !h-11`}>
          チャットへ進む
        </Link>
      </article>
    );
  };

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">

        {loading ? (
          <section className="soft-card">
            <p className="muted-text text-sm">チャット一覧を読み込んでいます...</p>
          </section>
        ) : null}

        {!loading && message ? (
          <section className="soft-card">
            <p className="text-sm text-rose-700">{message}</p>
          </section>
        ) : null}

        {!loading && !message ? (
          <>
            <section className="screen-stack">
              <div className="flex items-end justify-between gap-2">
                <h2 className="section-title">進行中</h2>
                <p className="section-note">新着メッセージあり</p>
              </div>
              {progressingChats.length > 0 ? (
                progressingChats.map((chat) => renderCard(chat, "active"))
              ) : (
                <div className="empty-state-card">
                  <p className="section-note">進行中のチャットはありません。</p>
                </div>
              )}
            </section>

            <section className="screen-stack">
              <div className="flex items-end justify-between gap-2">
                <h2 className="section-title">待機中</h2>
                <p className="section-note">相手の返信待ち</p>
              </div>
              {waitingChats.length > 0 ? (
                waitingChats.map((chat) => renderCard(chat, "waiting"))
              ) : (
                <div className="empty-state-card">
                  <p className="section-note">待機中のチャットはありません。</p>
                </div>
              )}
            </section>

            <section className="screen-stack">
              <div className="flex items-end justify-between gap-2">
                <h2 className="section-title">終了済み</h2>
                <p className="section-note">期限が終了したやり取り</p>
              </div>
              {endedChats.length > 0 ? (
                endedChats.map((chat) => renderCard(chat, "ended"))
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
