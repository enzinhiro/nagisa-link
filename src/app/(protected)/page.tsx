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
            <div className="inline-soft-area flex flex-col gap-1.5">
              <p className="section-note">いまは新しいお知らせはありません。</p>
              <p className="text-xs muted-text">届いた「話したい」や一致は「話したい」タブでも確認できます。</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5 text-sm text-[#365f78]">
              {incomingPendingCount > 0 ? (
                <li>
                  <Link
                    href="/talk"
                    className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border border-[#f5dfe6] bg-[#fff5f8] px-3 py-2.5"
                  >
                    <span>届いた話したいが {incomingPendingCount} 件あります</span>
                    <span className="inline-flex h-8 min-w-[68px] items-center justify-center rounded-full border border-[#d8e9f4] bg-white px-3 text-xs font-semibold text-[#3f7aa0]">
                      確認
                    </span>
                  </Link>
                </li>
              ) : null}
              {matchedLiveCount > 0 ? (
                <li>
                  <Link
                    href="/talk"
                    className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border border-[#d8e9f4] bg-[#f0f9ff] px-3 py-2.5"
                  >
                    <span>一致が {matchedLiveCount} 件あります</span>
                    <span className="inline-flex h-8 min-w-[68px] items-center justify-center rounded-full border border-[#d8e9f4] bg-white px-3 text-xs font-semibold text-[#3f7aa0]">
                      見る
                    </span>
                  </Link>
                </li>
              ) : null}
              {activeChatCount > 0 ? (
                <li>
                  <Link
                    href="/chat"
                    className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border border-[#d8e7ef] bg-[#f7fbfe] px-3 py-2.5"
                  >
                    <span>進行中のチャットが {activeChatCount} 件あります</span>
                    <span className="inline-flex h-8 min-w-[68px] items-center justify-center rounded-full border border-[#d8e9f4] bg-white px-3 text-xs font-semibold text-[#3f7aa0]">
                      開く
                    </span>
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
            <div className="inline-soft-area flex flex-col gap-1.5">
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

        <section className="perk-feature-card px-4 py-4">
          <div className="flex items-start gap-3.5">
            <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#efcadb] bg-[#ffedf5] text-[22px] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              🎫
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="section-title">地元特典</h2>
                <span className="rounded-full border border-[#f0cfdd] bg-[#fff2f8] px-2 py-0.5 text-[10px] text-[#7b5268]">
                  会員限定
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[#5f7a8d]">
                逗子・葉山・横須賀で使える、NAGISA Link会員向け特典です。
              </p>
            </div>
          </div>
          <Link
            href="/perks"
            className="perk-feature-cta mt-3 inline-flex h-10 items-center justify-center gap-1 rounded-full px-4 text-sm font-semibold text-[#7d4f66]"
          >
            特典を見る <span aria-hidden>→</span>
          </Link>
        </section>
      </main>
    </div>
  );
}
