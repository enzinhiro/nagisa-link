"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase/client";
import { toMamaDisplayName } from "../../../lib/profile/displayName";

type ProfileRow = {
  nickname: string;
  area: string;
  child_age_group: string;
  child_gender: string | null;
  child_interest_tags: string[];
  want_to_connect: string;
  connection_preference: string;
  meeting_range: string;
  intro: string;
  profile_completed: boolean;
};

export default function MyProfilePage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  useEffect(() => {
    const fetchMyProfile = async () => {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("ログイン状態を確認できませんでした。");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "nickname,area,child_age_group,child_gender,child_interest_tags,want_to_connect,connection_preference,meeting_range,intro,profile_completed"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setMessage("プロフィールの読み込みに失敗しました。");
        setLoading(false);
        return;
      }

      if (!data || !data.profile_completed) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(data as ProfileRow);
      setLoading(false);
    };

    fetchMyProfile();
  }, []);

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3">
          <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-blue">プロフィール</p>
          <h1 className="hero-title text-2xl font-semibold">登録内容の確認</h1>
          <p className="muted-text text-sm">現在のプロフィール内容を確認できます。</p>
        </header>

        {loading ? (
          <section className="soft-card">
            <p className="muted-text text-sm">プロフィールを読み込んでいます...</p>
          </section>
        ) : null}

        {!loading && message ? (
          <section className="soft-card">
            <p className="text-sm text-rose-700">{message}</p>
          </section>
        ) : null}

        {!loading && !message && !profile ? (
          <section className="soft-card flex flex-col gap-3">
            <p className="muted-text text-sm">プロフィールがまだ完了していません。登録を進めましょう。</p>
            <Link href="/onboarding/profile" className="secondary-btn !h-10">
              プロフィール登録へ
            </Link>
          </section>
        ) : null}

        {!loading && !message && profile ? (
          <>
            <section className="soft-card flex flex-col gap-3">
              <h2 className="section-title">基本情報</h2>
              <p className="text-sm text-[#365f78]">表示名: {toMamaDisplayName(profile.nickname)}</p>
              <p className="text-sm text-[#365f78]">地域: {profile.area}</p>
            </section>

            <section className="soft-card flex flex-col gap-3">
              <h2 className="section-title">お子さんについて</h2>
              <p className="text-sm text-[#365f78]">年齢帯: {profile.child_age_group}</p>
              {profile.child_gender ? (
                <p className="text-sm text-[#365f78]">性別: {profile.child_gender}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {profile.child_interest_tags.map((tag) => (
                  <span key={tag} className="inline-flex rounded-full px-2.5 py-1 text-xs pill-blue">
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            <section className="soft-card flex flex-col gap-3">
              <h2 className="section-title">つながり方の希望</h2>
              <p className="text-sm text-[#365f78]">今つながりたいこと: {profile.want_to_connect}</p>
              <p className="text-sm text-[#365f78]">つながり方の希望: {profile.connection_preference}</p>
              <p className="text-sm text-[#365f78]">会いやすい範囲: {profile.meeting_range}</p>
              <p className="text-sm text-[#365f78]">ひとこと紹介: {profile.intro}</p>
            </section>

            <Link href="/onboarding/profile" className="primary-btn">
              編集する
            </Link>
          </>
        ) : null}
      </main>
    </div>
  );
}
