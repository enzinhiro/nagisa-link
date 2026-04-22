"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";
import { toMamaDisplayName } from "../../../lib/profile/displayName";

type SearchProfileCard = {
  id: string;
  nickname: string;
  area: string;
  child_age_group: string;
  child_interest_tags: string[];
  want_to_connect: string;
  intro: string;
  connection_preference: string;
  meeting_range: string;
  created_at: string;
};

const AREA_OPTIONS = ["逗子市", "葉山町", "横須賀市"];
const AGE_OPTIONS = ["未就学", "小学校低学年", "小学校高学年", "中学生", "高校生", "18歳以上"];
const CONNECTION_OPTIONS = [
  "まずは親同士で少し話したい",
  "似た状況の家庭と情報交換したい",
  "子どもの好きなことが近い家庭とつながりたい",
  "将来的に親子で会える相手を探したい",
  "まずはオンラインでやり取りしたい",
];
const MEETING_RANGE_OPTIONS = [
  "同じ市町村なら話しやすい",
  "近隣エリアまでならOK",
  "少し離れていてもオンラインならOK",
  "まずはメッセージだけでやり取りしたい",
];
const TAG_OPTIONS = [
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

export default function SearchPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [cards, setCards] = useState<SearchProfileCard[]>([]);
  const [relaxedCards, setRelaxedCards] = useState<SearchProfileCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [keyword, setKeyword] = useState(searchParams.get("q") ?? "");
  const [areaFilter, setAreaFilter] = useState(searchParams.get("area") ?? "");
  const [ageFilter, setAgeFilter] = useState(searchParams.get("age") ?? "");
  const [connectionFilter, setConnectionFilter] = useState(searchParams.get("connection") ?? "");
  const [meetingRangeFilter, setMeetingRangeFilter] = useState(searchParams.get("meeting") ?? "");
  const [tagFilters, setTagFilters] = useState<string[]>(
    searchParams.get("tags") ? searchParams.get("tags")!.split(",").filter(Boolean) : []
  );

  const normalizedKeyword = useMemo(() => keyword.trim().toLowerCase(), [keyword]);
  const hasActiveFilters =
    keyword.trim().length > 0 ||
    areaFilter.length > 0 ||
    ageFilter.length > 0 ||
    tagFilters.length > 0 ||
    connectionFilter.length > 0 ||
    meetingRangeFilter.length > 0;

  useEffect(() => {
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("q", keyword.trim());
    if (areaFilter) params.set("area", areaFilter);
    if (ageFilter) params.set("age", ageFilter);
    if (connectionFilter) params.set("connection", connectionFilter);
    if (meetingRangeFilter) params.set("meeting", meetingRangeFilter);
    if (tagFilters.length > 0) params.set("tags", tagFilters.join(","));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [keyword, areaFilter, ageFilter, connectionFilter, meetingRangeFilter, tagFilters, router, pathname]);

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      setMessage("");
      setRelaxedCards([]);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("ログイン情報を確認できませんでした。");
        setCards([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from("profiles")
        .select(
          "id,nickname,area,child_age_group,child_interest_tags,want_to_connect,intro,connection_preference,meeting_range,created_at"
        )
        .eq("profile_completed", true)
        .neq("id", user.id);

      if (areaFilter) query = query.eq("area", areaFilter);
      if (ageFilter) query = query.eq("child_age_group", ageFilter);
      if (connectionFilter) query = query.eq("connection_preference", connectionFilter);
      if (meetingRangeFilter) query = query.eq("meeting_range", meetingRangeFilter);
      if (tagFilters.length > 0) query = query.overlaps("child_interest_tags", tagFilters);
      query = query.order("created_at", { ascending: false }).limit(40);

      // NOTE: 停止ユーザー除外は user status カラム追加後に条件を拡張する
      const { data, error } = await query;

      if (error) {
        setMessage("一覧の取得に失敗しました。時間をおいて再度お試しください。");
        setCards([]);
        setLoading(false);
        return;
      }

      const fetched = ((data ?? []) as SearchProfileCard[]).filter((card) => {
        if (!normalizedKeyword) return true;
        const tagsText = card.child_interest_tags.join(" ").toLowerCase();
        return (
          card.want_to_connect.toLowerCase().includes(normalizedKeyword) ||
          (card.intro ?? "").toLowerCase().includes(normalizedKeyword) ||
          tagsText.includes(normalizedKeyword)
        );
      });

      const sorted = fetched.sort((a, b) => {
        const areaPriorityA = a.area === areaFilter && areaFilter ? 0 : 1;
        const areaPriorityB = b.area === areaFilter && areaFilter ? 0 : 1;
        if (areaPriorityA !== areaPriorityB) return areaPriorityA - areaPriorityB;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      const limited = sorted.slice(0, 10);
      setCards(limited);

      if (limited.length === 0 && tagFilters.length > 0) {
        let relaxedQuery = supabase
          .from("profiles")
          .select(
            "id,nickname,area,child_age_group,child_interest_tags,want_to_connect,intro,connection_preference,meeting_range,created_at"
          )
          .eq("profile_completed", true)
          .neq("id", user.id);

        if (areaFilter) relaxedQuery = relaxedQuery.eq("area", areaFilter);
        if (ageFilter) relaxedQuery = relaxedQuery.eq("child_age_group", ageFilter);
        if (connectionFilter) relaxedQuery = relaxedQuery.eq("connection_preference", connectionFilter);
        if (meetingRangeFilter) relaxedQuery = relaxedQuery.eq("meeting_range", meetingRangeFilter);

        const { data: relaxedData } = await relaxedQuery.order("created_at", { ascending: false }).limit(10);
        const relaxedFetched = ((relaxedData ?? []) as SearchProfileCard[]).filter((card) => {
          if (!normalizedKeyword) return true;
          const tagsText = card.child_interest_tags.join(" ").toLowerCase();
          return (
            card.want_to_connect.toLowerCase().includes(normalizedKeyword) ||
            (card.intro ?? "").toLowerCase().includes(normalizedKeyword) ||
            tagsText.includes(normalizedKeyword)
          );
        });
        setRelaxedCards(relaxedFetched.slice(0, 3));
      }

      setLoading(false);
    };

    fetchProfiles();
  }, [
    areaFilter,
    ageFilter,
    connectionFilter,
    meetingRangeFilter,
    tagFilters,
    normalizedKeyword,
  ]);

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">

        <section className="soft-card flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="section-title">絞り込み</h2>
            {hasActiveFilters ? (
              <span className="inline-flex rounded-full px-2.5 py-1 text-xs pill-pink">絞り込み中</span>
            ) : (
              <span className="text-xs muted-text">条件なし</span>
            )}
          </div>
          <label>
            <span className="label-text">キーワード検索</span>
            <input
              className="mock-input !h-11"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="気になることや好きなことから、やさしく探してみましょう"
            />
          </label>
          <label>
            <span className="label-text">地域</span>
            <select className="mock-select !h-11" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
              <option value="">指定なし</option>
              {AREA_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label-text">お子さんの年齢帯</span>
            <select className="mock-select !h-11" value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)}>
              <option value="">指定なし</option>
              {AGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label-text">
              お子さんの好きなこと（複数選択可 / OR検索）
              {tagFilters.length > 0 ? ` : ${tagFilters.length}件選択中` : ""}
            </span>
            <select
              className="mock-select"
              value={tagFilters}
              onChange={(e) => setTagFilters(Array.from(e.target.selectedOptions, (opt) => opt.value))}
              multiple
              size={5}
            >
              {TAG_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label-text">つながり方の希望</span>
            <select
              className="mock-select !h-11"
              value={connectionFilter}
              onChange={(e) => setConnectionFilter(e.target.value)}
            >
              <option value="">指定なし</option>
              {CONNECTION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label-text">会いやすい範囲</span>
            <select
              className="mock-select !h-11"
              value={meetingRangeFilter}
              onChange={(e) => setMeetingRangeFilter(e.target.value)}
            >
              <option value="">指定なし</option>
              {MEETING_RANGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          {hasActiveFilters ? (
            <button
              type="button"
              className="secondary-btn !h-10"
              onClick={() => {
                setKeyword("");
                setAreaFilter("");
                setAgeFilter("");
                setConnectionFilter("");
                setMeetingRangeFilter("");
                setTagFilters([]);
              }}
            >
              条件を解除する
            </button>
          ) : null}
        </section>

        <section className="screen-stack">
          {loading && (
            <div className="soft-card">
              <p className="muted-text text-sm">一覧を読み込んでいます...</p>
            </div>
          )}
          {!loading && message && (
            <div className="soft-card">
              <p className="text-sm text-rose-700">{message}</p>
            </div>
          )}
          {!loading && !message && cards.length === 0 && (
            <div className="soft-card flex flex-col gap-3">
              <p className="muted-text text-sm">
                条件に一致する人がいませんでした。条件を少しゆるめて探してみましょう。
              </p>
              <button
                type="button"
                className="secondary-btn !h-10"
                onClick={() => {
                  setKeyword("");
                  setAreaFilter("");
                  setAgeFilter("");
                  setConnectionFilter("");
                  setMeetingRangeFilter("");
                  setTagFilters([]);
                }}
              >
                条件を解除して探す
              </button>
              {relaxedCards.length > 0 && (
                <div className="mt-3 flex flex-col gap-2.5">
                  <p className="section-note">タグ条件を外した候補</p>
                  {relaxedCards.map((card) => (
                    <article key={`relaxed-${card.id}`} className="soft-card-subtle flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-[#2f5f79]">{toMamaDisplayName(card.nickname)}</h3>
                        <p className="text-xs muted-text">{card.area}</p>
                      </div>
                      <p className="text-sm text-[#365f78]">{card.want_to_connect}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
          {!loading &&
            !message &&
            cards.map((card) => (
              <article key={card.id} className="soft-card flex flex-col gap-3.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-6 text-[#2f5f79]">{toMamaDisplayName(card.nickname)}</h3>
                  <p className="pt-0.5 text-xs muted-text">{card.area}</p>
                </div>
                <p
                  className="text-sm leading-6 text-[#365f78]"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {card.want_to_connect}
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {card.child_interest_tags.slice(0, 3).map((tag) => (
                    <span key={`${card.id}-${tag}`} className="inline-flex rounded-full px-2.5 py-1 text-xs pill-blue">
                      {tag}
                    </span>
                  ))}
                </div>
                <Link href={`/search/${card.id}`} className="secondary-btn !h-11">
                  詳細を見る
                </Link>
              </article>
            ))}
        </section>

      </main>
    </div>
  );
}
