"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase/client";
import {
  chatByOtherUserMap,
  splitMatchedAndEnded,
} from "../../lib/talk/wantsSummary";

type WantRow = {
  id: string;
  from_user: string;
  to_user: string;
  status: string;
};

type ChatRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  expires_at: string;
  status: string;
};

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [incomingPendingCount, setIncomingPendingCount] = useState(0);
  const [matchedLiveCount, setMatchedLiveCount] = useState(0);
  const [activeChatCount, setActiveChatCount] = useState(0);

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

      const { data: wantsData, error: wantsError } = await supabase
        .from("wants")
        .select("id,from_user,to_user,status")
        .or(`from_user.eq.${user.id},to_user.eq.${user.id}`);

      if (wantsError) {
        setMessage("つながりの状態を読み込めませんでした。時間をおいて再度お試しください。");
        setIncomingPendingCount(0);
        setMatchedLiveCount(0);
        setActiveChatCount(0);
        setLoading(false);
        return;
      }

      const wants = (wantsData ?? []) as WantRow[];

      const { data: chatsData, error: chatsError } = await supabase
        .from("chats")
        .select("id,user_a_id,user_b_id,expires_at,status")
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

      if (chatsError) {
        setMessage("チャット一覧を読み込めませんでした。時間をおいて再度お試しください。");
        setIncomingPendingCount(0);
        setMatchedLiveCount(0);
        setActiveChatCount(0);
        setLoading(false);
        return;
      }

      const chats = (chatsData ?? []) as ChatRow[];
      const chatBy = chatByOtherUserMap(user.id, chats);
      const { matchedOtherIds, endedOtherIds } = splitMatchedAndEnded(user.id, wants, chatBy);
      const matchedSet = new Set(matchedOtherIds);
      const endedSet = new Set(endedOtherIds);

      const incoming = wants.filter(
        (w) => w.to_user === user.id && w.status === "pending" && !matchedSet.has(w.from_user) && !endedSet.has(w.from_user)
      ).length;

      const activeChats = chats.filter((c) => new Date(c.expires_at).getTime() > Date.now());

      setIncomingPendingCount(incoming);
      setMatchedLiveCount(matchedOtherIds.length);
      setActiveChatCount(activeChats.length);
      setLoading(false);
    };

    void fetchDashboard();
  }, []);

  const hasActivity = incomingPendingCount > 0 || matchedLiveCount > 0 || activeChatCount > 0;

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack pt-1">
        <section className="soft-card flex flex-col gap-3">
          <div className="flex items-end justify-between gap-2">
            <h2 className="section-title">新しい動き</h2>
            <Link href="/talk" className="text-xs font-medium text-[#3f7aa0] underline underline-offset-2">
              話したいへ
            </Link>
          </div>
          {loading ? (
            <p className="muted-text text-sm">読み込み中です...</p>
          ) : message ? (
            <p className="text-sm text-rose-700">{message}</p>
          ) : !hasActivity ? (
            <div className="soft-card-subtle flex flex-col gap-2">
              <p className="section-note">いまは新しいお知らせはありません。</p>
              <p className="text-xs muted-text">オファーや一致は「話したい」タブでも確認できます。</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5 text-sm text-[#365f78]">
              {incomingPendingCount > 0 ? (
                <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#fff5f8] px-3 py-2.5 border border-[#f5dfe6]">
                  <span>届いたオファーが {incomingPendingCount} 件あります</span>
                  <Link href="/talk" className="shrink-0 text-xs font-medium text-[#3f7aa0] underline underline-offset-2">
                    確認する
                  </Link>
                </li>
              ) : null}
              {matchedLiveCount > 0 ? (
                <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f0f9ff] px-3 py-2.5 border border-[#d8e9f4]">
                  <span>一致が {matchedLiveCount} 件あります</span>
                  <Link href="/talk" className="shrink-0 text-xs font-medium text-[#3f7aa0] underline underline-offset-2">
                    見る
                  </Link>
                </li>
              ) : null}
              {activeChatCount > 0 ? (
                <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f7fbfe] px-3 py-2.5 border border-[#d8e7ef]">
                  <span>進行中のチャットが {activeChatCount} 件あります</span>
                  <Link href="/chat" className="shrink-0 text-xs font-medium text-[#3f7aa0] underline underline-offset-2">
                    開く
                  </Link>
                </li>
              ) : null}
            </ul>
          )}
        </section>

        <section className="soft-card flex flex-col gap-3">
          <div className="flex items-end justify-between gap-2">
            <h2 className="section-title">進行中チャット</h2>
            <p className="section-note">最大2件</p>
          </div>
          {!loading && !message && activeChatCount === 0 ? (
            <div className="soft-card-subtle flex flex-col gap-2">
              <p className="section-note">いまは表示できるチャットがありません。</p>
              <p className="text-xs muted-text">一致後に「チャットへ進む」から始められます。</p>
            </div>
          ) : !loading && !message && activeChatCount > 0 ? (
            <p className="section-note">
              一覧は <Link href="/chat" className="text-[#3f7aa0] underline underline-offset-2">チャット</Link>{" "}
              タブから開けます。
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
