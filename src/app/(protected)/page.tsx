"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase/client";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeChatCount, setActiveChatCount] = useState(0);
  const [activeChats] = useState<Array<{ id: string; otherName: string; otherArea: string; expires_at: string }>>(
    []
  );

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

      setActiveChatCount(0);

      setLoading(false);
    };

    fetchDashboard();
  }, []);

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <section className="soft-card flex flex-col gap-3">
          <h1 className="section-title">ホーム</h1>
          <p className="section-note">落ち着いて使えるベータ版として、シンプルな表示にしています。</p>
          {!loading && message ? <p className="text-sm text-rose-700">{message}</p> : null}
        </section>

        <section className="soft-card flex flex-col gap-3">
          <div className="flex items-end justify-between gap-2">
            <h2 className="section-title">進行中チャット</h2>
            <p className="section-note">最大2件</p>
          </div>
          {!loading && activeChats.length === 0 ? (
            <div className="soft-card-subtle flex flex-col gap-2">
              <p className="section-note">
                いまは表示できるチャットがありません。チャット機能は準備が整い次第ご案内します。
              </p>
              <p className="text-xs muted-text">気になる相手探しは「さがす」タブから進められます。</p>
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
      </main>
    </div>
  );
}
