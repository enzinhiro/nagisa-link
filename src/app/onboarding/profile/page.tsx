"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";

const STEP_1_AREAS = ["逗子市", "葉山町", "横須賀市"];
const CHILD_AGE_GROUPS = [
  "未就学",
  "小学校低学年",
  "小学校高学年",
  "中学生",
  "高校生",
  "18歳以上",
];

const CHILD_GENDERS = [
  "男の子",
  "女の子",
  "どちらもいる",
  "その他 / 答えたくない",
];

const PROFILE_SAVE_ERROR_UI =
  "プロフィールの保存に失敗しました。時間をおいてもう一度お試しください。";
const PROFILE_BOOTSTRAP_ERROR_UI =
  "プロフィール情報の読み込みに失敗しました。時間をおいてもう一度お試しください。";

function isNoRowError(error: PostgrestError | null): boolean {
  if (!error) return false;
  return error.code === "PGRST116" || error.message.toLowerCase().includes("0 rows");
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

const CONNECTION_PREFERENCES = [
  "子ども同士で遊ぶきっかけを作りたい",
  "まずは親同士でチャットしたい",
  "まずは親同士で話したい",
  "情報交換をしたい",
  "近い悩みの人とつながりたい",
  "その他（自由入力）",
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
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [realName, setRealName] = useState("");
  const [nickname, setNickname] = useState("");
  const [area, setArea] = useState("");
  const [childAgeGroup, setChildAgeGroup] = useState("");
  const [childGender, setChildGender] = useState("");
  const [childInterestTags, setChildInterestTags] = useState<string[]>([]);
  const [wantToConnect, setWantToConnect] = useState("");
  const [connectionPreference, setConnectionPreference] = useState("");
  const [customConnectionPreference, setCustomConnectionPreference] = useState("");
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

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "real_name,nickname,area,child_age_group,child_gender,child_interest_tags,want_to_connect,connection_preference,meeting_range,intro,profile_completed"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error && !isNoRowError(error)) {
        console.error("[onboarding/profile] profiles bootstrap select failed", error);
        setMessage(PROFILE_BOOTSTRAP_ERROR_UI);
        setIsBooting(false);
        return;
      }

      if (data?.profile_completed === true) {
        router.replace("/");
        return;
      }

      if (data) {
        setRealName(data.real_name ?? "");
        setNickname(data.nickname ?? "");
        setArea(data.area ?? "");
        setChildAgeGroup(data.child_age_group ?? "");
        setChildGender(data.child_gender ?? "");
        setChildInterestTags(data.child_interest_tags ?? []);
        setWantToConnect(data.want_to_connect ?? "");
        const savedConnectionPreference = data.connection_preference ?? "";
        if (
          savedConnectionPreference &&
          !CONNECTION_PREFERENCES.includes(savedConnectionPreference)
        ) {
          setConnectionPreference("その他（自由入力）");
          setCustomConnectionPreference(savedConnectionPreference);
        } else {
          setConnectionPreference(savedConnectionPreference);
          setCustomConnectionPreference("");
        }
        setMeetingRange(data.meeting_range ?? "");
        setIntro(data.intro ?? "");
      }

      setIsBooting(false);
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const selectedTagCount = childInterestTags.length;
  const isTagLimitReached = selectedTagCount >= 5;
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
      childAgeGroup,
      childGender,
      wantToConnect,
      connectionPreference,
      meetingRange,
      intro,
    ];

    if (requiredValues.some((value) => value.trim().length === 0)) {
      setMessage("未入力の必須項目があります。すべて入力してください。");
      return;
    }

    if (childInterestTags.length === 0 || childInterestTags.length > 5) {
      setMessage("お子さんの好きなことは1〜5個で選択してください。");
      return;
    }

    if (connectionPreference === "その他（自由入力）") {
      if (!customConnectionPreference.trim()) {
        setMessage("つながり方の希望（自由入力）を入力してください。");
        return;
      }
      if (customConnectionPreference.trim().length > 60) {
        setMessage("つながり方の希望（自由入力）は60文字以内で入力してください。");
        return;
      }
    }

    setIsSubmitting(true);

    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        real_name: realName.trim(),
        nickname: nickname.trim(),
        area,
        child_age_group: childAgeGroup,
        child_gender: childGender,
        child_interest_tags: childInterestTags,
        want_to_connect: wantToConnect.trim(),
        connection_preference:
          connectionPreference === "その他（自由入力）"
            ? customConnectionPreference.trim()
            : connectionPreference,
        meeting_range: meetingRange,
        intro: intro.trim(),
        profile_completed: true,
      },
      { onConflict: "id" }
    );

    setIsSubmitting(false);

    if (error) {
      console.error("[onboarding/profile] profiles upsert failed", error);
      setMessage(PROFILE_SAVE_ERROR_UI);
      return;
    }

    router.push("/");
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
            はじめにプロフィールを登録しましょう
          </h1>
          <p className="muted-text text-sm leading-6">3ステップ・1〜2分で入力できます。</p>
          <div className="soft-card-subtle">
            <p className="section-note">
              入力した内容は、安心してつながるためのマッチングに利用されます。
            </p>
          </div>
        </header>

        <form className="screen-stack" onSubmit={handleSubmit}>
          <section className="soft-card flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="step-chip">Step 1</span>
              <h2 className="section-title">基本情報</h2>
            </div>
            <label>
              <span className="label-text">本名（管理用）</span>
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
              <span className="label-text">ニックネーム</span>
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
              <span className="label-text">お住まいのエリア</span>
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
              <span className="step-chip">Step 2</span>
              <h2 className="section-title">お子さんについて</h2>
            </div>
            <label>
              <span className="label-text">お子さんの年齢帯</span>
              <select
                className="mock-select"
                value={childAgeGroup}
                onChange={(e) => setChildAgeGroup(e.target.value)}
                required
              >
                <option value="" disabled>
                  選択してください
                </option>
                {CHILD_AGE_GROUPS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label-text">お子さんの性別</span>
              <select
                className="mock-select"
                value={childGender}
                onChange={(e) => setChildGender(e.target.value)}
                required
              >
                <option value="" disabled>
                  選択してください
                </option>
                {CHILD_GENDERS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label-text">お子さんの好きなこと</span>
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
          </section>

          <section className="soft-card flex flex-col gap-3.5">
            <div className="flex items-center gap-2">
              <span className="step-chip">Step 3</span>
              <h2 className="section-title">つながり方の希望</h2>
            </div>
            <label>
              <span className="label-text">今つながりたいこと</span>
              <textarea
                className="mock-textarea"
                placeholder="例: 少しチャットでお話ししたいです。"
                value={wantToConnect}
                onChange={(e) => setWantToConnect(e.target.value)}
                required
              />
            </label>
            <label>
              <span className="label-text">つながり方の希望</span>
              <select
                className="mock-select"
                value={connectionPreference}
                onChange={(e) => {
                  const next = e.target.value;
                  setConnectionPreference(next);
                  if (next !== "その他（自由入力）") {
                    setCustomConnectionPreference("");
                  }
                }}
                required
              >
                <option value="" disabled>
                  選択してください
                </option>
                {CONNECTION_PREFERENCES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            {connectionPreference === "その他（自由入力）" ? (
              <label>
                <span className="label-text">つながり方の希望（自由入力）</span>
                <input
                  className="mock-input"
                  placeholder="例: まずは短いチャットから始めたいです"
                  value={customConnectionPreference}
                  onChange={(e) => setCustomConnectionPreference(e.target.value)}
                  maxLength={60}
                  required
                />
                <p className="mt-2 text-xs muted-text">60文字以内で入力してください。</p>
              </label>
            ) : null}
            <label>
              <span className="label-text">会いやすい範囲</span>
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
              <span className="label-text">ひとこと紹介</span>
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
            <p className="text-sm muted-text leading-6">入力内容を確認して、プロフィールを完了してください。</p>
            {message && <p className="text-sm text-rose-700">{message}</p>}
            <button className="primary-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "保存中..." : "プロフィールを完了してホームへ"}
            </button>
            <Link className="text-center text-sm muted-text underline underline-offset-3" href="/auth">
              認証ページに戻る
            </Link>
          </section>
        </form>
      </main>
    </div>
  );
}
