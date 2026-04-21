"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase/client";
import { toMamaDisplayName } from "../../../lib/profile/displayName";

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
  area: string;
};

type ChatCard = {
  id: string;
  otherUserId: string;
  otherDisplayName: string;
  otherArea: string;
  expiresAt: string;
  isFallback: boolean;
};

export default function ChatIndexPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeChats, setActiveChats] = useState<ChatCard[]>([]);
  const [endedChats, setEndedChats] = useState<ChatCard[]>([]);

  useEffect(() => {
    const fetchChats = async () => {
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

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id,nickname,area")
        .in("id", otherIds)
        .eq("is_suspended", false);

      const profileMap = new Map<string, ProfileRow>();
      for (const p of (profilesData ?? []) as ProfileRow[]) {
        profileMap.set(p.id, p);
      }

      const cards: ChatCard[] = chats.map((chat) => {
        const otherUserId = chat.user_a_id === user.id ? chat.user_b_id : chat.user_a_id;
        const otherProfile = profileMap.get(otherUserId);
        if (!otherProfile) {
          return {
            id: chat.id,
            otherUserId,
            otherDisplayName: "このユーザーは現在表示できません",
            otherArea: "-",
            expiresAt: chat.expires_at,
            isFallback: true,
          };
        }
        return {
          id: chat.id,
          otherUserId,
          otherDisplayName: toMamaDisplayName(otherProfile.nickname),
          otherArea: otherProfile.area,
          expiresAt: chat.expires_at,
          isFallback: false,
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
    };

    fetchChats();
  }, []);

  const renderCard = (card: ChatCard, type: "active" | "ended") => {
    const remainingHour = Math.max(0, Math.ceil((new Date(card.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)));
    return (
      <article key={`${type}-${card.id}`} className="soft-card flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-[#2f5f79]">{card.otherDisplayName}</h3>
          <span className="inline-flex rounded-full px-2.5 py-1 text-xs pill-blue">
            {type === "active" ? `残り${remainingHour}時間` : "終了済み"}
          </span>
        </div>
        <p className="text-xs muted-text">地域: {card.otherArea}</p>
        <Link href={`/chat/${card.id}`} className="secondary-btn !h-10">
          チャットを開く
        </Link>
      </article>
    );
  };

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3">
          <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-blue">チャット</p>
          <h1 className="hero-title text-2xl font-semibold">一致した相手とのやり取り</h1>
          <p className="muted-text text-sm">
            チャットは「話したい」で一致した相手から始まります。進行中のやり取りは順次ここに集約していきます。
          </p>
        </header>

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
              <h2 className="section-title">進行中</h2>
              {activeChats.length > 0 ? (
                activeChats.map((chat) => renderCard(chat, "active"))
              ) : (
                <div className="soft-card-subtle">
                  <p className="section-note">進行中のチャットはありません。</p>
                </div>
              )}
            </section>

            <section className="screen-stack">
              <h2 className="section-title">終了済み</h2>
              {endedChats.length > 0 ? (
                endedChats.map((chat) => renderCard(chat, "ended"))
              ) : (
                <div className="soft-card-subtle">
                  <p className="section-note">終了済みのチャットはありません。</p>
                </div>
              )}
            </section>
          </>
        ) : null}

        <Link className="secondary-btn !h-10" href="/talk">
          話したい一覧へ
        </Link>
      </main>
    </div>
  );
}
