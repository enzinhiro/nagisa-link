"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase/client";
import { toMamaDisplayName } from "../../../lib/profile/displayName";
import { ProfileAvatar } from "../../../components/profile-avatar";
import { isMissingProfileColumnError } from "../../../lib/supabase/profile-query";

type ProfileRow = {
  id: string;
  nickname: string;
  area: string;
  child_age_group: string;
  child_gender: string | null;
  child_interest_tags: string[];
  want_to_connect: string;
  connection_preference: string;
  meeting_range: string;
  intro: string;
  connection_achievement_count: number;
  profile_completed: boolean;
  avatar_seed: number | null;
};

export default function MyProfilePage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const achievementCount = Number(profile?.connection_achievement_count ?? 0);

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

      let { data, error } = await supabase
        .from("profiles")
        .select(
          "id,nickname,area,child_age_group,child_gender,child_interest_tags,want_to_connect,connection_preference,meeting_range,intro,connection_achievement_count,profile_completed,avatar_seed"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (error && isMissingProfileColumnError(error)) {
        const fallback = await supabase
          .from("profiles")
          .select(
            "id,nickname,area,child_age_group,child_gender,child_interest_tags,want_to_connect,connection_preference,meeting_range,intro,connection_achievement_count,profile_completed"
          )
          .eq("id", user.id)
          .maybeSingle();
        data = fallback.data ? { ...fallback.data, avatar_seed: null } : fallback.data;
        error = fallback.error;
      }

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
            <section className="soft-card flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <ProfileAvatar userId={profile.id} avatarSeed={profile.avatar_seed} nickname={profile.nickname} />
                  <div className="min-w-0">
                    <h1 className="hero-title truncate text-xl font-semibold">{toMamaDisplayName(profile.nickname)}</h1>
                    <p className="text-sm muted-text">{profile.area}</p>
                  </div>
                </div>
                {achievementCount > 0 ? (
                  <span className="shrink-0 rounded-full border border-[#f1d7e3] bg-[#fff3f8] px-2 py-0.5 text-[11px] text-[#8c6375] sm:text-xs">
                    つながり実績 {achievementCount}
                  </span>
                ) : null}
              </div>
            </section>

            <section className="soft-card flex flex-col gap-3">
              <h2 className="section-title">プロフィール内容</h2>
              <div className="soft-card-subtle">
                <p className="label-text mb-1">お子さんの年齢帯</p>
                <p className="text-sm text-[#365f78]">{profile.child_age_group}</p>
              </div>
              {profile.child_gender ? (
                <div className="soft-card-subtle">
                  <p className="label-text mb-1">お子さんの性別</p>
                  <p className="text-sm text-[#365f78]">{profile.child_gender}</p>
                </div>
              ) : null}
              <div className="soft-card-subtle">
                <p className="label-text mb-1">今つながりたいこと</p>
                <p className="text-sm leading-6 text-[#365f78]">{profile.want_to_connect}</p>
              </div>
              {profile.child_interest_tags.length > 0 ? (
                <div className="soft-card-subtle">
                  <p className="label-text mb-2">お子さんの好きなこと</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.child_interest_tags.slice(0, 5).map((tag) => (
                      <span key={tag} className="inline-flex rounded-full px-2.5 py-1 text-xs pill-blue">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="soft-card-subtle">
                <p className="label-text mb-1">つながり方の希望</p>
                <p className="text-sm text-[#365f78]">{profile.connection_preference}</p>
              </div>
              <div className="soft-card-subtle">
                <p className="label-text mb-1">会いやすい範囲</p>
                <p className="text-sm text-[#365f78]">{profile.meeting_range}</p>
              </div>
              <div className="soft-card-subtle">
                <p className="label-text mb-1">ひとこと紹介</p>
                <p className="text-sm leading-6 text-[#365f78]">{profile.intro}</p>
              </div>
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
