"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase/client";
import { toMamaDisplayName } from "../../lib/profile/displayName";

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
  want_to_connect: string;
};

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [incomingCount, setIncomingCount] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [activeChatCount, setActiveChatCount] = useState(0);
  const [activeChats, setActiveChats] = useState<Array<ChatRow & { otherName: string; otherArea: string }>>([]);
  const [recommended, setRecommended] = useState<ProfileRow[]>([]);

  useEffect(() => {
    const fetchDashboard = async () => {
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

      const { data: wantsData } = await supabase
        .from("wants")
        .select("from_user_id,to_user_id,status")
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

      const wants = (wantsData ?? []) as Array<{
        from_user_id: string;
        to_user_id: string;
        status: "pending" | "accepted" | "rejected";
      }>;

      const incoming = wants.filter((w) => w.to_user_id === user.id && w.status === "pending");
      setIncomingCount(incoming.length);

      const acceptedSet = new Set(
        wants.filter((w) => w.status === "accepted").map((w) => `${w.from_user_id}->${w.to_user_id}`)
      );
      const matchedUsers = new Set<string>();
      for (const w of wants) {
        const other = w.from_user_id === user.id ? w.to_user_id : w.from_user_id;
        if (acceptedSet.has(`${user.id}->${other}`) && acceptedSet.has(`${other}->${user.id}`)) {
          matchedUsers.add(other);
        }
      }
      setMatchedCount(matchedUsers.size);

      const { data: chatData } = await supabase
        .from("chats")
        .select("id,user_a_id,user_b_id,expires_at")
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

      const chats = (chatData ?? []) as ChatRow[];
      const now = Date.now();
      const active = chats
        .filter((c) => new Date(c.expires_at).getTime() > now)
        .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
      setActiveChatCount(active.length);

      const activeOtherIds = Array.from(
        new Set(active.map((c) => (c.user_a_id === user.id ? c.user_b_id : c.user_a_id)))
      );
      let profileMap = new Map<string, ProfileRow>();
      if (activeOtherIds.length > 0) {
        const { data: p } = await supabase
          .from("profiles")
          .select("id,nickname,area,want_to_connect")
          .in("id", activeOtherIds)
          .eq("is_suspended", false);
        profileMap = new Map((p ?? []).map((row) => [row.id, row as ProfileRow]));
      }
      setActiveChats(
        active.slice(0, 2).map((chat) => {
          const otherId = chat.user_a_id === user.id ? chat.user_b_id : chat.user_a_id;
          const p = profileMap.get(otherId);
          return {
            ...chat,
            otherName: p ? toMamaDisplayName(p.nickname) : "このユーザーは現在表示できません",
            otherArea: p?.area ?? "-",
          };
        })
      );

      const { data: recData } = await supabase
        .from("profiles")
        .select("id,nickname,area,want_to_connect")
        .eq("profile_completed", true)
        .eq("is_suspended", false)
        .neq("id", user.id)
        .limit(3);
      setRecommended((recData ?? []) as ProfileRow[]);

      setLoading(false);
    };

    fetchDashboard();
  }, []);

  const nextActionText =
    incomingCount > 0
      ? "届いた話したいを確認しましょう"
      : activeChatCount > 0
        ? "チャットを確認しましょう"
        : "さがす画面から相手を探してみましょう";

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <section className="soft-card flex flex-col gap-3">
          <h2 className="section-title">新しい動き</h2>
          {loading ? <p className="section-note">読み込み中...</p> : null}
          {!loading && message ? <p className="text-sm text-rose-700">{message}</p> : null}
          {!loading && !message ? (
            <div className="grid grid-cols-3 gap-2">
              <Link href="/talk" className="soft-card-subtle text-center">
                <p className="text-lg font-semibold text-[#2f5f79]">{incomingCount}</p>
                <p className="section-note">届いた話したい</p>
              </Link>
              <Link href="/talk" className="soft-card-subtle text-center">
                <p className="text-lg font-semibold text-[#2f5f79]">{matchedCount}</p>
                <p className="section-note">一致した相手</p>
              </Link>
              <Link href="/chat" className="soft-card-subtle text-center">
                <p className="text-lg font-semibold text-[#2f5f79]">{activeChatCount}</p>
                <p className="section-note">進行中チャット</p>
              </Link>
            </div>
          ) : null}
        </section>

        <section className="soft-card flex flex-col gap-3">
          <h2 className="section-title">進行中チャット</h2>
          {!loading && activeChats.length === 0 ? (
            <p className="section-note">進行中のチャットはありません。</p>
          ) : (
            activeChats.map((chat) => {
              const remaining = Math.max(
                0,
                Math.ceil((new Date(chat.expires_at).getTime() - Date.now()) / (1000 * 60 * 60))
              );
              return (
                <article key={chat.id} className="soft-card-subtle flex flex-col gap-1.5">
                  <h3 className="font-semibold text-[#2f5f79]">{chat.otherName}</h3>
                  <p className="text-xs muted-text">{chat.otherArea}</p>
                  <p className="section-note">残り{remaining}時間</p>
                  <Link href={`/chat/${chat.id}`} className="secondary-btn !h-10">
                    チャットを開く
                  </Link>
                </article>
              );
            })
          )}
        </section>

        <section className="soft-card flex flex-col gap-3">
          <h2 className="section-title">おすすめの相手</h2>
          {!loading && recommended.length === 0 ? (
            <p className="section-note">現在おすすめ表示はありません。</p>
          ) : (
            recommended.map((person) => (
              <article key={person.id} className="soft-card-subtle flex flex-col gap-1.5">
                <h3 className="font-semibold text-[#2f5f79]">{toMamaDisplayName(person.nickname)}</h3>
                <p className="text-xs muted-text">{person.area}</p>
                <p className="text-sm text-[#365f78]">{person.want_to_connect}</p>
                <Link href={`/search/${person.id}`} className="secondary-btn !h-10">
                  詳細を見る
                </Link>
              </article>
            ))
          )}
        </section>

        <section className="soft-card flex flex-col gap-3">
          <h2 className="section-title">次にやること</h2>
          <p className="text-sm text-[#365f78]">{nextActionText}</p>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/search" className="secondary-btn !h-10">
              さがすへ
            </Link>
            <Link href={incomingCount > 0 ? "/talk" : "/chat"} className="secondary-btn !h-10">
              {incomingCount > 0 ? "話したいへ" : "チャットへ"}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
