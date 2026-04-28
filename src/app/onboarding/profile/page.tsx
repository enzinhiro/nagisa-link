"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { canPerformUserWriteAction } from "../../../lib/account-status";
import { generateAvatarSeed } from "../../../lib/profile/avatar";
import { CHILD_GENDER_OPTIONS, normalizeChildGender } from "../../../lib/profile/child-gender";
import { CHILD_AGE_GROUP_OPTIONS, normalizeChildAgeGroups } from "../../../lib/profile/age-groups";
import { MOM_INTEREST_TAG_OPTIONS, normalizeMomInterestTags } from "../../../lib/profile/mom-interest-tags";
import {
  CONNECTION_PREFERENCE_OPTIONS,
  normalizeConnectionPreference,
} from "../../../lib/profile/connection-preference";

const STEP_1_AREAS = ["逗子市", "葉山町", "横須賀市"];
const PROFILE_SAVE_ERROR_UI =
  "プロフィールの保存に失敗しました。時間をおいてもう一度お試しください。";
const PROFILE_BOOTSTRAP_ERROR_UI =
  "プロフィール情報の読み込みに失敗しました。時間をおいてもう一度お試しください。";
const PROFILE_URL_BLOCK_MESSAGE = "プロフィール内にURLや外部リンクは入力できません。";

function isNoRowError(error: PostgrestError | null): boolean {
  if (!error) return false;
  return error.code === "PGRST116" || error.message.toLowerCase().includes("0 rows");
}

function logSupabaseProfileError(context: string, error: PostgrestError | null): void {
  if (!error) return;
  console.error(`[onboarding/profile] ${context}`, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}

function containsUrlLikeText(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;

  // Blocks protocol URLs, www-prefix, and domain-like strings such as example.com or line.me.
  const urlLikePattern =
    /(https?:\/\/[^\s]+)|(www\.[^\s]+)|\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+\b/i;
  return urlLikePattern.test(normalized);
}

const CHILD_INTEREST_TAGS = [
  "ゲーム",
  "YouTube",
  "アニメ・マンガ",
  "絵を描く",
  "工作・ものづくり",
  "電車・車",
  "動物・生き物",
  "外遊び",
  "スポーツ",
  "音楽",
  "本・読書",
  "パソコン・プログラミング",
  "料理・お菓子",
  "自然・散歩",
  "その他",
];

const MEETING_RANGES = [
  "同じ市町村なら話しやすい",
  "近隣エリアまでならOK",
  "少し離れていてもオンラインならOK",
  "まずはメッセージだけでやり取りしたい",
];

export default function ProfileOnboardingPage() {
  const router = useRouter();
  const [isBooting, setIsBooting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarSeed, setAvatarSeed] = useState<number | null>(null);

  const [realName, setRealName] = useState("");
  const [nickname, setNickname] = useState("");
  const [area, setArea] = useState("");
  const [childAgeGroups, setChildAgeGroups] = useState<string[]>([]);
  const [childGender, setChildGender] = useState("");
  const [childInterestTags, setChildInterestTags] = useState<string[]>([]);
  const [momInterestTags, setMomInterestTags] = useState<string[]>([]);
  const [wantToConnect, setWantToConnect] = useState("");
  const [connectionPreference, setConnectionPreference] = useState("");
  const [meetingRange, setMeetingRange] = useState("");
  const [intro, setIntro] = useState("");

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        router.push("/auth");
        return;
      }

      setUserId(user.id);
      const authRealName = String(user.user_metadata?.real_name ?? "").trim();

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "real_name,nickname,area,child_age_group,child_age_groups,child_gender,child_interest_tags,mom_interest_tags,want_to_connect,connection_preference,meeting_range,intro,profile_completed,avatar_seed"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error && !isNoRowError(error)) {
        logSupabaseProfileError("profiles bootstrap select failed", error);
        setMessage(PROFILE_BOOTSTRAP_ERROR_UI);
        setIsBooting(false);
        return;
      }

      setIsEditingProfile(data?.profile_completed === true);

      if (data) {
        setAvatarSeed(Number.isInteger(data.avatar_seed) ? Number(data.avatar_seed) : null);
        setRealName((data.real_name ?? authRealName) || "");
        setNickname(data.nickname ?? "");
        setArea(data.area ?? "");
        const normalizedChildAgeGroups = normalizeChildAgeGroups(data.child_age_groups ?? []);
        setChildAgeGroups(
          normalizedChildAgeGroups.length > 0
            ? normalizedChildAgeGroups
            : normalizeChildAgeGroups([data.child_age_group ?? ""])
        );
        setChildGender(normalizeChildGender(data.child_gender));
        setChildInterestTags(data.child_interest_tags ?? []);
        setMomInterestTags(normalizeMomInterestTags(data.mom_interest_tags ?? []));
        setWantToConnect(data.want_to_connect ?? "");
        const savedConnectionPreference = normalizeConnectionPreference(data.connection_preference ?? "");
        setConnectionPreference(savedConnectionPreference);
        setMeetingRange(data.meeting_range ?? "");
        setIntro(data.intro ?? "");
      } else if (authRealName) {
        setRealName(authRealName);
      }

      setIsBooting(false);
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const selectedTagCount = childInterestTags.length;
  const selectedMomTagCount = momInterestTags.length;
  const selectedAgeGroupCount = childAgeGroups.length;
  const isTagLimitReached = selectedTagCount >= 5;
  const isMomTagLimitReached = selectedMomTagCount >= 5;
  const requiredChecks: Array<{ label: string; ok: boolean }> = [
    { label: "本名", ok: realName.trim().length > 0 },
    { label: "ニックネーム", ok: nickname.trim().length > 0 },
    { label: "お住まいのエリア", ok: area.trim().length > 0 },
    { label: "お子さんの年齢帯", ok: childAgeGroups.length >= 1 },
    { label: "お子さんの性別", ok: childGender.trim().length > 0 },
    { label: "お子さんの好きなこと", ok: childInterestTags.length >= 1 && childInterestTags.length <= 5 },
    { label: "ママの興味・関心", ok: momInterestTags.length >= 1 && momInterestTags.length <= 5 },
    { label: "今つながりたいこと", ok: wantToConnect.trim().length > 0 },
    { label: "つながり方の希望", ok: connectionPreference.trim().length > 0 },
    { label: "会いやすい範囲", ok: meetingRange.trim().length > 0 },
    { label: "ひとこと紹介", ok: intro.trim().length > 0 },
  ];
  const missingRequiredLabels = requiredChecks.filter((item) => !item.ok).map((item) => item.label);
  const isSubmitReady = missingRequiredLabels.length === 0 && !isSubmitting;
  const toggleInterestTag = (tag: string) => {
    setChildInterestTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, tag];
    });
  };
  const toggleMomInterestTag = (tag: string) => {
    setMomInterestTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 5) return prev;
      return [...prev, tag];
    });
  };
  const toggleChildAgeGroup = (ageGroup: string) => {
    setChildAgeGroups((prev) => (prev.includes(ageGroup) ? prev.filter((v) => v !== ageGroup) : [...prev, ageGroup]));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!userId) {
      setMessage("ログイン状態を確認できませんでした。再度ログインしてください。");
      return;
    }

    const requiredValues = [
      realName,
      nickname,
      area,
      childGender,
      wantToConnect,
      connectionPreference,
      meetingRange,
      intro,
    ];

    if (requiredValues.some((value) => value.trim().length === 0)) {
      setMessage("まだ入力が必要な項目があります。すべて入力してから保存してください。");
      return;
    }

    if (childAgeGroups.length === 0) {
      setMessage("まだ入力が必要な項目があります。すべて入力してから保存してください。");
      return;
    }

    if (childInterestTags.length === 0 || childInterestTags.length > 5) {
      setMessage("お子さんの好きなことは1〜5個で選択してください。");
      return;
    }

    if (momInterestTags.length === 0 || momInterestTags.length > 5) {
      setMessage("ママの興味・関心は1〜5個で選択してください。");
      return;
    }

    const freeTextValues = [
      realName.trim(),
      wantToConnect.trim(),
      intro.trim(),
    ];
    if (freeTextValues.some(containsUrlLikeText)) {
      setMessage(PROFILE_URL_BLOCK_MESSAGE);
      return;
    }

    setIsSubmitting(true);
    const nextAvatarSeed = avatarSeed ?? generateAvatarSeed();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await canPerformUserWriteAction(userId, user.email))) {
      setIsSubmitting(false);
      setMessage("現在このアカウントではこの操作は行えません。");
      return;
    }

    const profilePayload = {
      real_name: realName.trim(),
      nickname: nickname.trim(),
      area,
      child_age_group: childAgeGroups[0] ?? "",
      child_age_groups: childAgeGroups,
      child_gender: normalizeChildGender(childGender),
      child_interest_tags: childInterestTags,
      mom_interest_tags: momInterestTags,
      want_to_connect: wantToConnect.trim(),
      connection_preference: connectionPreference,
      meeting_range: meetingRange,
      intro: intro.trim(),
      profile_completed: true,
      avatar_seed: nextAvatarSeed,
    };
    const profileColumns = Object.keys(profilePayload);
    console.info("[onboarding/profile] profile payload columns", profileColumns);

    const { data: existingProfile, error: existingProfileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingProfileError && !isNoRowError(existingProfileError)) {
      setIsSubmitting(false);
      logSupabaseProfileError("profiles save precheck select failed", existingProfileError);
      setMessage(PROFILE_SAVE_ERROR_UI);
      return;
    }

    let saveError: PostgrestError | null = null;
    if (existingProfile) {
      const { error } = await supabase
        .from("profiles")
        .update(profilePayload)
        .eq("id", userId);
      saveError = error;
    } else {
      const { error } = await supabase
        .from("profiles")
        .insert({ id: userId, ...profilePayload });
      saveError = error;
    }

    setIsSubmitting(false);

    if (saveError) {
      logSupabaseProfileError("profiles save failed", saveError);
      setMessage(PROFILE_SAVE_ERROR_UI);
      return;
    }

    setAvatarSeed(nextAvatarSeed);
    router.push(isEditingProfile ? "/profile" : "/search");
  };

  if (isBooting) {
    return (
      <div className="mock-page">
        <main className="mock-shell screen-stack">
          <section className="soft-card">
            <p className="muted-text text-sm">プロフィール情報を読み込んでいます...</p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3">
          <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-blue">
            プロフィール登録
          </p>
          <h1 className="hero-title text-2xl font-semibold">
            {isEditingProfile ? "プロフィールを編集しましょう" : "はじめにプロフィールを登録しましょう"}
          </h1>
          <p className="muted-text text-sm leading-6">
            {isEditingProfile ? "内容を更新して保存できます。" : "3つのステップで入力できます。"}
          </p>
          {!isEditingProfile ? (
            <div className="soft-card-subtle">
              <p className="text-sm leading-6 text-[#406984]">
                あと少しで利用開始できます。プロフィールを完了すると、さがす・話したい・チャットが使えるようになります。
              </p>
            </div>
          ) : null}
        </header>

        <form className="screen-stack gap-3.5" onSubmit={handleSubmit}>
          <section className="soft-card">
            <p className="text-xs muted-text">「必須」がついた項目は入力が必要です。</p>
          </section>
          <section className="soft-card flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="step-chip">STEP 1 / 3</span>
              <h2 className="section-title">基本情報</h2>
            </div>
            <label>
              <span className="label-text">本名（管理用・必須）</span>
              <input
                className="mock-input"
                type="text"
                placeholder="例: 渚 花子"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                required
              />
              <p className="mt-2 text-xs muted-text">本名は他の利用者には表示されません。</p>
            </label>
            <label>
              <span className="label-text">ニックネーム（必須）</span>
              <input
                className="mock-input"
                type="text"
                placeholder="例: 渚"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
              />
            </label>
            <label>
              <span className="label-text">お住まいのエリア（必須）</span>
              <select
                className="mock-select"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                required
              >
                <option value="" disabled>
                  選択してください
                </option>
                {STEP_1_AREAS.map((areaOption) => (
                  <option key={areaOption} value={areaOption}>
                    {areaOption}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="soft-card flex flex-col gap-3.5">
            <div className="flex items-center gap-2">
              <span className="step-chip">STEP 2 / 3</span>
              <h2 className="section-title">お子さんについて</h2>
            </div>
            <label>
              <span className="label-text">お子さんの年齢帯（必須）</span>
              <p className="section-note mb-2">当てはまるものを選んでください。{selectedAgeGroupCount}件選択中</p>
              <div className="flex flex-wrap gap-2.5">
                {CHILD_AGE_GROUP_OPTIONS.map((option) => {
                  const isSelected = childAgeGroups.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleChildAgeGroup(option)}
                      className={`rounded-full border px-3 py-2 text-sm transition ${
                        isSelected
                          ? "border-[#8fcbe8] bg-[#d9f2ff] font-semibold text-[#1f5470]"
                          : "border-[#d8e7ef] bg-white text-[#42657a]"
                      }`}
                    >
                      {isSelected ? `✓ ${option}` : option}
                    </button>
                  );
                })}
              </div>
              <input type="hidden" required value={childAgeGroups.length > 0 ? "selected" : ""} />
            </label>
            <label>
              <span className="label-text">お子さんの性別（必須）</span>
              <select
                className="mock-select"
                value={childGender}
                onChange={(e) => setChildGender(e.target.value)}
                required
              >
                <option value="" disabled>
                  選択してください
                </option>
                {CHILD_GENDER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label-text">お子さんの好きなこと（必須）</span>
              <p className="section-note mb-2">{selectedTagCount} / 5個選択中</p>
              <div className="flex flex-wrap gap-2.5">
                {CHILD_INTEREST_TAGS.map((tag) => {
                  const isSelected = childInterestTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleInterestTag(tag)}
                      className={`rounded-full border px-3 py-2 text-sm transition ${
                        isSelected
                          ? "border-[#8fcbe8] bg-[#d9f2ff] font-semibold text-[#1f5470]"
                          : "border-[#d8e7ef] bg-white text-[#42657a]"
                      }`}
                    >
                      {isSelected ? `✓ ${tag}` : tag}
                    </button>
                  );
                })}
              </div>
              <input type="hidden" required value={childInterestTags.length > 0 ? "selected" : ""} />
              <p className="mt-2 text-xs muted-text">
                最大5個まで選べます。{isTagLimitReached ? "上限に達しています。" : ""}
              </p>
            </label>
            <label>
              <span className="label-text">ママの興味・関心（必須）</span>
              <p className="section-note mb-2">
                今気になっていることや、話してみたいテーマを選んでください。{selectedMomTagCount} / 5個
              </p>
              <div className="flex flex-wrap gap-2.5">
                {MOM_INTEREST_TAG_OPTIONS.map((tag) => {
                  const isSelected = momInterestTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleMomInterestTag(tag)}
                      className={`rounded-full border px-3 py-2 text-sm transition ${
                        isSelected
                          ? "border-[#f0cddd] bg-[#fff0f6] font-semibold text-[#7c4f64]"
                          : "border-[#eadfe7] bg-white text-[#6b5b68]"
                      }`}
                    >
                      {isSelected ? `✓ ${tag}` : tag}
                    </button>
                  );
                })}
              </div>
              <input type="hidden" required value={momInterestTags.length > 0 ? "selected" : ""} />
              <p className="mt-2 text-xs muted-text">
                最大5個まで選べます。{isMomTagLimitReached ? "上限に達しています。" : ""}
              </p>
            </label>
          </section>

          <section className="soft-card flex flex-col gap-3.5">
            <div className="flex items-center gap-2">
              <span className="step-chip">STEP 3 / 3</span>
              <h2 className="section-title">つながり方の希望</h2>
            </div>
            <label>
              <span className="label-text">今つながりたいこと（必須）</span>
              <textarea
                className="mock-textarea"
                placeholder="例: 少しチャットでお話ししたいです。"
                value={wantToConnect}
                onChange={(e) => setWantToConnect(e.target.value)}
                required
              />
            </label>
            <label>
              <span className="label-text">つながり方の希望（必須）</span>
              <select
                className="mock-select"
                value={connectionPreference}
                onChange={(e) => {
                  setConnectionPreference(e.target.value);
                }}
                required
              >
                <option value="" disabled>
                  選択してください
                </option>
                {CONNECTION_PREFERENCE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label-text">会いやすい範囲（必須）</span>
              <select
                className="mock-select"
                value={meetingRange}
                onChange={(e) => setMeetingRange(e.target.value)}
                required
              >
                <option value="" disabled>
                  選択してください
                </option>
                {MEETING_RANGES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label-text">ひとこと紹介（必須）</span>
              <textarea
                className="mock-textarea"
                placeholder="例: 無理のない範囲でゆるくつながれたらうれしいです"
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                required
              />
            </label>
          </section>

          <section className="soft-card flex flex-col gap-2.5">
            <p className="text-sm muted-text leading-6">最後に内容を確認して完了してください。</p>
            {message && <p className="text-sm text-rose-700">{message}</p>}
            <button className="primary-btn" type="submit" disabled={!isSubmitReady}>
              {isSubmitting ? "保存中..." : isEditingProfile ? "変更を保存する" : "プロフィールを完了してさがすへ"}
            </button>
            {!isSubmitting && missingRequiredLabels.length > 0 ? (
              <p className="text-xs muted-text">
                保存するには必須項目の入力が必要です（未入力: {missingRequiredLabels.slice(0, 2).join("、")}
                {missingRequiredLabels.length > 2 ? " など" : ""}）。
              </p>
            ) : null}
          </section>
        </form>
      </main>
    </div>
  );
}
