"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase/client";
import { toMamaDisplayName } from "../../../../lib/profile/displayName";
import { canPerformUserWriteAction } from "../../../../lib/account-status";
import { ProfileAvatar } from "../../../../components/profile-avatar";
import { isMissingProfileColumnError } from "../../../../lib/supabase/profile-query";
import { getVisibleConnectionAchievementCounts } from "../../../../lib/profile/connection-achievements";
import { normalizeChildGender, shouldShowPublicChildGender } from "../../../../lib/profile/child-gender";
import { isVisiblePublicValue } from "../../../../lib/profile/public-visibility";

type ProfileDetail = {
  id: string;
  nickname: string;
  area: string;
  connection_achievement_count: number;
  child_age_group: string;
  child_gender: string | null;
  child_interest_tags: string[];
  want_to_connect: string;
  connection_preference: string;
  meeting_range: string;
  intro: string;
  avatar_seed: number | null;
};

type RawProfileDetail = Omit<ProfileDetail, "connection_achievement_count"> & {
  connection_achievement_count: number | string | null;
};

export default function SearchDetailPage() {
  const params = useParams<{ id: string }>();
  const profileId = params.id;

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasPendingWant, setHasPendingWant] = useState(false);
  const [isSendingWant, setIsSendingWant] = useState(false);
  const [talkMessage, setTalkMessage] = useState("");

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setMessage("");
      setProfile(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("ログイン状態を確認できませんでした。");
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);

      if (!profileId || user.id === profileId) {
        setMessage("このプロフィールは表示できません。");
        setLoading(false);
        return;
      }

      let { data, error } = await supabase
        .from("public_profiles")
        .select(
          "id,nickname,area,connection_achievement_count,child_age_group,child_gender,child_interest_tags,want_to_connect,connection_preference,meeting_range,intro,avatar_seed"
        )
        .eq("id", profileId)
        .neq("id", user.id)
        .maybeSingle();

      if (error && isMissingProfileColumnError(error)) {
        const fallback = await supabase
          .from("public_profiles")
          .select(
            "id,nickname,area,connection_achievement_count,child_age_group,child_gender,child_interest_tags,want_to_connect,connection_preference,meeting_range,intro"
          )
          .eq("id", profileId)
          .neq("id", user.id)
          .maybeSingle();
        data = fallback.data ? { ...fallback.data, avatar_seed: null } : fallback.data;
        error = fallback.error;
      }

      if (error || !data) {
        setMessage("お探しのプロフィールは見つかりませんでした。");
        setLoading(false);
        return;
      }

      const { data: existingWant, error: wantSelectError } = await supabase
        .from("wants")
        .select("id")
        .eq("from_user", user.id)
        .eq("to_user", profileId)
        .eq("status", "pending")
        .maybeSingle();

      if (wantSelectError) {
        console.warn("[search/[id]] wants lookup failed:", wantSelectError);
      }

      const rawProfile = data as RawProfileDetail;
      const visibleCounts = await getVisibleConnectionAchievementCounts([rawProfile.id]);
      const normalizedProfile: ProfileDetail = {
        ...rawProfile,
        connection_achievement_count: visibleCounts.get(rawProfile.id) ?? 0,
      };

      setHasPendingWant(Boolean(existingWant) && !wantSelectError);
      setProfile(normalizedProfile);
      setLoading(false);
    };

    fetchDetail();
  }, [profileId]);

  const handleWantToTalk = async () => {
    if (!currentUserId || !profile || hasPendingWant) return;

    setTalkMessage("");
    setIsSendingWant(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await canPerformUserWriteAction(currentUserId, user.email))) {
      setIsSendingWant(false);
      setTalkMessage("ご利用停止中のため、この操作はできません。");
      return;
    }

    const { error } = await supabase.from("wants").insert({
      from_user: currentUserId,
      to_user: profile.id,
      status: "pending",
    });

    setIsSendingWant(false);

    if (error) {
      const dup =
        error.code === "23505" ||
        (typeof error.message === "string" && error.message.toLowerCase().includes("duplicate"));
      if (dup) {
        setHasPendingWant(true);
        setTalkMessage("すでに送信済みです。お返事をお待ちください。");
        return;
      }
      setTalkMessage("送信できませんでした。時間をおいて再度お試しください。");
      return;
    }

    setHasPendingWant(true);
    setTalkMessage("送信しました。お返事をお待ちください。");
  };

  const isOwnProfile = currentUserId !== null && profile !== null && currentUserId === profile.id;
  const achievementCount = Number(profile?.connection_achievement_count ?? 0);
  const visibleChildGender = normalizeChildGender(profile?.child_gender);
  const visibleInterestTags = (profile?.child_interest_tags ?? []).filter((tag) => isVisiblePublicValue(tag)).slice(0, 5);
  const profileLead = isVisiblePublicValue(profile?.want_to_connect) ? profile?.want_to_connect : "";
  const profileIntro = isVisiblePublicValue(profile?.intro) ? profile?.intro : "";
  const showArea = isVisiblePublicValue(profile?.area);
  const showAgeGroup = isVisiblePublicValue(profile?.child_age_group);
  const showChildGender = shouldShowPublicChildGender(visibleChildGender);
  const showConnectionPreference = isVisiblePublicValue(profile?.connection_preference);
  const showMeetingRange = isVisiblePublicValue(profile?.meeting_range);
  const hasSupplementaryInfo =
    visibleInterestTags.length > 0 || showChildGender || showConnectionPreference || showMeetingRange;

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        {loading && (
          <section className="soft-card">
            <p className="muted-text text-sm">プロフィールを読み込んでいます...</p>
          </section>
        )}

        {!loading && message && (
          <section className="soft-card flex flex-col gap-2.5">
            <h1 className="section-title">ご案内</h1>
            <p className="muted-text text-sm">{message}</p>
          </section>
        )}

        {!loading && !message && profile && (
          <>
            <section className="soft-card flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <ProfileAvatar userId={profile.id} avatarSeed={profile.avatar_seed} nickname={profile.nickname} />
                  <div className="min-w-0">
                    <h1 className="hero-title truncate text-xl font-semibold">{toMamaDisplayName(profile.nickname)}</h1>
                    {(showArea || showAgeGroup) ? (
                      <p className="text-sm muted-text">
                        {[profile.area, profile.child_age_group].filter((value) => isVisiblePublicValue(value)).join(" ・ ")}
                      </p>
                    ) : null}
                  </div>
                </div>
                {achievementCount > 0 ? (
                  <span className="shrink-0 rounded-full border border-[#f1d7e3] bg-[#fff3f8] px-2 py-0.5 text-[11px] text-[#8c6375] sm:text-xs">
                    つながり実績 {achievementCount}
                  </span>
                ) : null}
              </div>
              {(profileLead || profileIntro) ? <div className="card-divider" /> : null}
              {profileLead ? (
                <div className="person-connect-strip">
                  <p className="text-xs font-semibold text-[#5f7c8f]">今つながりたいこと</p>
                  <p className="mt-1.5 text-sm leading-6 text-[#365f78]">{profileLead}</p>
                </div>
              ) : null}
              {profileIntro ? (
                <div className="person-summary-strip">
                  <p className="text-xs font-semibold text-[#6a8292]">ひとこと紹介</p>
                  <p className="mt-1 text-sm leading-6 text-[#365f78]">{profileIntro}</p>
                </div>
              ) : null}
            </section>

            {hasSupplementaryInfo ? (
              <section className="soft-card flex flex-col gap-3">
                <h2 className="section-title text-[15px]">プロフィール補足</h2>
                {visibleInterestTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {visibleInterestTags.map((tag) => (
                      <span key={tag} className="inline-flex rounded-full px-2.5 py-1 text-xs pill-blue">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                {showChildGender || showConnectionPreference || showMeetingRange ? (
                  <div className="flex flex-col gap-2.5">
                    {showChildGender ? (
                      <p className="text-sm text-[#45687e]">
                        <span className="text-xs text-[#6f8796]">お子さんの性別: </span>
                        {visibleChildGender}
                      </p>
                    ) : null}
                    {showConnectionPreference ? (
                      <p className="text-sm text-[#45687e]">
                        <span className="text-xs text-[#6f8796]">つながり方の希望: </span>
                        {profile.connection_preference}
                      </p>
                    ) : null}
                    {showMeetingRange ? (
                      <p className="text-sm text-[#45687e]">
                        <span className="text-xs text-[#6f8796]">会いやすい範囲: </span>
                        {profile.meeting_range}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="soft-card flex flex-col gap-2.5">
              {talkMessage ? <p className="text-sm text-[#3f6680]">{talkMessage}</p> : null}
              <button
                type="button"
                className="primary-btn !h-11"
                onClick={handleWantToTalk}
                disabled={isSendingWant || hasPendingWant || isOwnProfile}
              >
                {hasPendingWant ? "送信済み" : isSendingWant ? "送信中..." : "話してみたい"}
              </button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
