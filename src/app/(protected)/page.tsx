"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase/client";
import { toMamaDisplayName } from "../../lib/profile/displayName";

type ProfileRow = {
  id: string;
  nickname: string;
  area: string;
  want_to_connect: string;
};

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [incomingCount] = useState(0);
  const [matchedCount] = useState(0);
  const [activeChatCount] = useState(0);
  const [activeChats] = useState<Array<{ id: string; otherName: string; otherArea: string; expires_at: string }>>(
    []
  );
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

      const { data: recData } = await supabase
        .from("profiles")
        .select("id,nickname,area,want_to_connect")
        .eq("profile_completed", true)
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
          <div className="flex items-end justify-between gap-2">
            <h2 className="section-title">新しい動き</h2>
            <p className="section-note">いまの状況</p>
          </div>
          {loading ? <p className="section-note">読み込み中...</p> : null}
          {!loading && message ? <p className="text-sm text-rose-700">{message}</p> : null}
          {!loading && !message ? (
            <div className="grid grid-cols-3 gap-2.5">
              <Link href="/talk" className="soft-card-subtle text-center">
                <p className="text-xl font-semibold text-[#2f5f79]">{incomingCount}</p>
                <p className="section-note">届いた話したい</p>
              </Link>
              <Link href="/talk" className="soft-card-subtle text-center">
                <p className="text-xl font-semibold text-[#2f5f79]">{matchedCount}</p>
                <p className="section-note">一致した相手</p>
              </Link>
              <Link href="/chat" className="soft-card-subtle text-center">
                <p className="text-xl font-semibold text-[#2f5f79]">{activeChatCount}</p>
                <p className="section-note">進行中チャット</p>
              </Link>
            </div>
          ) : null}
        </section>

        <section className="soft-card flex flex-col gap-3">
          <div className="flex items-end justify-between gap-2">
            <h2 className="section-title">進行中チャット</h2>
            <p className="section-note">最大2件</p>
          </div>
          {!loading && activeChats.length === 0 ? (
            <div className="soft-card-subtle flex flex-col gap-2">
              <p className="section-note">まだ動きがありません。まずは相手を探してみましょう。</p>
              <Link href="/search" className="secondary-btn !h-11">
                さがすへ
              </Link>
            </div>
          ) : (
            activeChats.map((chat) => {
              const remaining = Math.max(
                0,
                Math.ceil((new Date(chat.expires_at).getTime() - Date.now()) / (1000 * 60 * 60))
              );
              return (
                <article key={chat.id} className="soft-card-subtle flex flex-col gap-2.5">
                  <h3 className="font-semibold leading-6 text-[#2f5f79]">{chat.otherName}</h3>
                  <p className="text-xs muted-text">{chat.otherArea}</p>
                  <p className="section-note">残り{remaining}時間</p>
                  <Link href={`/chat/${chat.id}`} className="secondary-btn !h-11">
                    チャットを開く
                  </Link>
                </article>
              );
            })
          )}
        </section>

        <section className="soft-card flex flex-col gap-3">
          <div className="flex items-end justify-between gap-2">
            <h2 className="section-title">おすすめの相手</h2>
            <p className="section-note">まずはここから</p>
          </div>
          {!loading && recommended.length === 0 ? (
            <div className="soft-card-subtle flex flex-col gap-2">
              <p className="section-note">まだおすすめ表示はありません。さがす画面から相手を探してみましょう。</p>
              <Link href="/search" className="secondary-btn !h-11">
                さがすへ
              </Link>
            </div>
          ) : (
            recommended.map((person) => (
              <article key={person.id} className="soft-card-subtle flex flex-col gap-2.5">
                <h3 className="font-semibold leading-6 text-[#2f5f79]">{toMamaDisplayName(person.nickname)}</h3>
                <p className="text-xs muted-text">{person.area}</p>
                <p className="text-sm leading-6 text-[#365f78]">{person.want_to_connect}</p>
                <Link href={`/search/${person.id}`} className="secondary-btn !h-11">
                  詳細を見る
                </Link>
              </article>
            ))
          )}
        </section>

        <section className="soft-card flex flex-col gap-3">
          <div className="flex items-end justify-between gap-2">
            <h2 className="section-title">次にやること</h2>
            <p className="section-note">1アクションでOK</p>
          </div>
          <p className="text-sm text-[#365f78]">{nextActionText}</p>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/search" className="secondary-btn !h-11">
              さがすへ
            </Link>
            <Link href={incomingCount > 0 ? "/talk" : "/chat"} className="secondary-btn !h-11">
              {incomingCount > 0 ? "話したいへ" : "チャットへ"}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
