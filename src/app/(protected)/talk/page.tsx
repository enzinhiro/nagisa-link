"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase/client";
import { toMamaDisplayName } from "../../../lib/profile/displayName";

type WantRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: "pending";
};

type ProfileRow = {
  id: string;
  nickname: string;
  area: string;
  want_to_connect: string;
  profile_completed: boolean;
};

type TalkCard = {
  otherUserId: string;
  nickname: string;
  area: string;
  wantToConnect: string;
  label: string;
};

export default function TalkPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [matchedCards, setMatchedCards] = useState<TalkCard[]>([]);
  const [receivedCards, setReceivedCards] = useState<TalkCard[]>([]);
  const [sentCards, setSentCards] = useState<TalkCard[]>([]);

  const hasAnyCards = useMemo(
    () => matchedCards.length + receivedCards.length + sentCards.length > 0,
    [matchedCards.length, receivedCards.length, sentCards.length]
  );

  useEffect(() => {
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

      const { data: wantsData, error: wantsError } = await supabase
        .from("wants")
        .select("id,from_user_id,to_user_id,status")
        .eq("status", "pending")
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

      if (wantsError) {
        setMessage("一覧の取得に失敗しました。時間をおいて再度お試しください。");
        setLoading(false);
        return;
      }

      const wants = (wantsData ?? []) as WantRow[];
      const wantsSet = new Set(wants.map((w) => `${w.from_user_id}->${w.to_user_id}`));

      const matchedUserIds = new Set<string>();
      const receivedUserIds: string[] = [];
      const sentUserIds: string[] = [];

      for (const want of wants) {
        const otherUserId = want.from_user_id === user.id ? want.to_user_id : want.from_user_id;
        if (!otherUserId || otherUserId === user.id) continue;

        const hasReverse = wantsSet.has(`${otherUserId}->${user.id}`) && wantsSet.has(`${user.id}->${otherUserId}`);
        if (hasReverse) {
          matchedUserIds.add(otherUserId);
          continue;
        }

        if (want.to_user_id === user.id) {
          receivedUserIds.push(otherUserId);
        } else if (want.from_user_id === user.id) {
          sentUserIds.push(otherUserId);
        }
      }

      const matchedIds = Array.from(matchedUserIds);
      const matchedIdSet = new Set(matchedIds);
      const uniqueReceivedIds = Array.from(new Set(receivedUserIds)).filter((id) => !matchedIdSet.has(id));
      const uniqueSentIds = Array.from(new Set(sentUserIds)).filter((id) => !matchedIdSet.has(id));

      const profileIds = Array.from(new Set([...matchedIds, ...uniqueReceivedIds, ...uniqueSentIds]));
      if (profileIds.length === 0) {
        setMatchedCards([]);
        setReceivedCards([]);
        setSentCards([]);
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

      const toCard = (id: string, label: string): TalkCard | null => {
        const p = profileMap.get(id);
        if (!p) return null;
        return {
          otherUserId: id,
          nickname: p.nickname,
          area: p.area,
          wantToConnect: p.want_to_connect,
          label,
        };
      };

      setMatchedCards(matchedIds.map((id) => toCard(id, "一致した")).filter((v): v is TalkCard => v !== null));
      setReceivedCards(
        uniqueReceivedIds.map((id) => toCard(id, "届いた")).filter((v): v is TalkCard => v !== null)
      );
      setSentCards(uniqueSentIds.map((id) => toCard(id, "送った")).filter((v): v is TalkCard => v !== null));
      setLoading(false);
    };

    fetchTalks();
  }, []);

  const renderCard = (card: TalkCard, section: "matched" | "received" | "sent") => (
    <article key={`${section}-${card.otherUserId}`} className="soft-card flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#2f5f79]">{toMamaDisplayName(card.nickname)}</h3>
        <span className="inline-flex rounded-full px-2.5 py-1 text-xs pill-blue">{card.label}</span>
      </div>
      <p className="text-xs muted-text">{card.area}</p>
      <p className="text-sm text-[#365f78]">{card.wantToConnect}</p>
      {section === "matched" ? (
        <button type="button" className="secondary-btn !h-10" disabled>
          チャット準備中
        </button>
      ) : null}
      {section === "received" ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="primary-btn !h-10">
            話してみたい
          </button>
          <button type="button" className="secondary-btn !h-10">
            今回は見送る
          </button>
        </div>
      ) : null}
      {section === "sent" ? <p className="section-note">返答待ち</p> : null}
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
          </>
        ) : null}

        <Link href="/" className="text-center text-sm muted-text underline underline-offset-3">
          ホームに戻る
        </Link>
      </main>
    </div>
  );
}
