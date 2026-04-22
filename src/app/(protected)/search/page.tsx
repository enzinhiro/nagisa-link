"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type FilterState = {
  keyword: string;
  area: string;
  age: string;
  connection: string;
  meeting: string;
  tags: string[];
};

const emptyFilters = (): FilterState => ({
  keyword: "",
  area: "",
  age: "",
  connection: "",
  meeting: "",
  tags: [],
});

function readFiltersFromParams(searchParams: URLSearchParams): FilterState {
  return {
    keyword: searchParams.get("q") ?? "",
    area: searchParams.get("area") ?? "",
    age: searchParams.get("age") ?? "",
    connection: searchParams.get("connection") ?? "",
    meeting: searchParams.get("meeting") ?? "",
    tags: searchParams.get("tags") ? searchParams.get("tags")!.split(",").filter(Boolean) : [],
  };
}

function filtersToSearchParams(f: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (f.keyword.trim()) params.set("q", f.keyword.trim());
  if (f.area) params.set("area", f.area);
  if (f.age) params.set("age", f.age);
  if (f.connection) params.set("connection", f.connection);
  if (f.meeting) params.set("meeting", f.meeting);
  if (f.tags.length > 0) params.set("tags", f.tags.join(","));
  return params;
}

function hasAnyFilter(f: FilterState): boolean {
  return (
    f.keyword.trim().length > 0 ||
    f.area.length > 0 ||
    f.age.length > 0 ||
    f.tags.length > 0 ||
    f.connection.length > 0 ||
    f.meeting.length > 0
  );
}

function filtersEqual(a: FilterState, b: FilterState): boolean {
  if (a.keyword !== b.keyword || a.area !== b.area || a.age !== b.age || a.connection !== b.connection || a.meeting !== b.meeting) {
    return false;
  }
  if (a.tags.length !== b.tags.length) return false;
  return a.tags.every((t, i) => t === b.tags[i]);
}

function chipPreview(text: string, max = 18) {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

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
  const searchParamsKey = searchParams.toString();

  const [filters, setFilters] = useState<FilterState>(() => readFiltersFromParams(searchParams));
  const [queryFilters, setQueryFilters] = useState<FilterState>(() => readFiltersFromParams(searchParams));
  const [detailOpen, setDetailOpen] = useState(false);

  const [cards, setCards] = useState<SearchProfileCard[]>([]);
  const [relaxedCards, setRelaxedCards] = useState<SearchProfileCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const resultsAnchorRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollRef = useRef(false);

  useEffect(() => {
    const next = readFiltersFromParams(searchParams);
    setFilters((prev) => (filtersEqual(prev, next) ? prev : next));
    setQueryFilters((prev) => (filtersEqual(prev, next) ? prev : next));
  }, [searchParamsKey, searchParams]);

  useEffect(() => {
    const nextQuery = filtersToSearchParams(queryFilters).toString();
    if (nextQuery === searchParams.toString()) return;
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }, [queryFilters, router, pathname, searchParams]);

  const normalizedKeyword = useMemo(() => queryFilters.keyword.trim().toLowerCase(), [queryFilters.keyword]);

  const runSearch = useCallback(() => {
    pendingScrollRef.current = true;
    setQueryFilters({ ...filters });
    setDetailOpen(false);
  }, [filters]);

  useEffect(() => {
    if (loading || !pendingScrollRef.current) return;
    pendingScrollRef.current = false;
    requestAnimationFrame(() => {
      resultsAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [loading]);

  const clearAllFilters = useCallback(() => {
    const cleared = emptyFilters();
    setFilters(cleared);
    setQueryFilters(cleared);
    setDetailOpen(false);
  }, []);

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

      if (queryFilters.area) query = query.eq("area", queryFilters.area);
      if (queryFilters.age) query = query.eq("child_age_group", queryFilters.age);
      if (queryFilters.connection) query = query.eq("connection_preference", queryFilters.connection);
      if (queryFilters.meeting) query = query.eq("meeting_range", queryFilters.meeting);
      if (queryFilters.tags.length > 0) query = query.overlaps("child_interest_tags", queryFilters.tags);
      query = query.order("created_at", { ascending: false }).limit(40);

      const { data, error } = await query;

      if (error) {
        setMessage("一覧の取得に失敗しました。時間をおいて再度お試しください。");
        setCards([]);
        setLoading(false);
        return;
      }

      const fetched = ((data ?? []) as SearchProfileCard[]).filter((card) => {
        if (!normalizedKeyword) return true;
        const tagsText = (card.child_interest_tags ?? []).join(" ").toLowerCase();
        return (
          card.want_to_connect.toLowerCase().includes(normalizedKeyword) ||
          (card.intro ?? "").toLowerCase().includes(normalizedKeyword) ||
          tagsText.includes(normalizedKeyword)
        );
      });

      const sorted = fetched.sort((a, b) => {
        const areaPriorityA = a.area === queryFilters.area && queryFilters.area ? 0 : 1;
        const areaPriorityB = b.area === queryFilters.area && queryFilters.area ? 0 : 1;
        if (areaPriorityA !== areaPriorityB) return areaPriorityA - areaPriorityB;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      const limited = sorted.slice(0, 10);
      setCards(limited);

      if (limited.length === 0 && queryFilters.tags.length > 0) {
        let relaxedQuery = supabase
          .from("profiles")
          .select(
            "id,nickname,area,child_age_group,child_interest_tags,want_to_connect,intro,connection_preference,meeting_range,created_at"
          )
          .eq("profile_completed", true)
          .neq("id", user.id);

        if (queryFilters.area) relaxedQuery = relaxedQuery.eq("area", queryFilters.area);
        if (queryFilters.age) relaxedQuery = relaxedQuery.eq("child_age_group", queryFilters.age);
        if (queryFilters.connection) relaxedQuery = relaxedQuery.eq("connection_preference", queryFilters.connection);
        if (queryFilters.meeting) relaxedQuery = relaxedQuery.eq("meeting_range", queryFilters.meeting);

        const { data: relaxedData } = await relaxedQuery.order("created_at", { ascending: false }).limit(10);
        const relaxedFetched = ((relaxedData ?? []) as SearchProfileCard[]).filter((card) => {
          if (!normalizedKeyword) return true;
          const tagsText = (card.child_interest_tags ?? []).join(" ").toLowerCase();
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
    queryFilters.area,
    queryFilters.age,
    queryFilters.connection,
    queryFilters.meeting,
    queryFilters.tags,
    normalizedKeyword,
  ]);

  const appliedChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (queryFilters.area) chips.push({ key: "area", label: queryFilters.area });
    if (queryFilters.age) chips.push({ key: "age", label: queryFilters.age });
    if (queryFilters.connection) chips.push({ key: "connection", label: chipPreview(queryFilters.connection) });
    if (queryFilters.meeting) chips.push({ key: "meeting", label: chipPreview(queryFilters.meeting) });
    queryFilters.tags.slice(0, 6).forEach((t) => chips.push({ key: `tag-${t}`, label: t }));
    if (queryFilters.keyword.trim()) chips.push({ key: "q", label: `「${queryFilters.keyword.trim()}」` });
    return chips;
  }, [queryFilters]);

  const countLabel = useMemo(() => {
    if (loading) return null;
    const n = cards.length;
    if (n === 0) return "該当する方は見つかりませんでした";
    if (n === 1) return "1件見つかりました";
    return `${n}件見つかりました`;
  }, [cards.length, loading]);

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <section className="soft-card flex flex-col gap-3">
          <div className="flex flex-col gap-2.5">
            <label className="flex flex-col gap-1.5">
              <span className="label-text">キーワード</span>
              <input
                className="mock-input !h-11"
                value={filters.keyword}
                onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
                placeholder="気になることや好きなことから探す"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    runSearch();
                  }
                }}
              />
            </label>
            <div className="flex flex-wrap items-stretch gap-2">
              <button type="button" className="primary-btn !h-11 min-w-[7.5rem] flex-1 sm:flex-none" onClick={runSearch}>
                探す
              </button>
              <button
                type="button"
                className="secondary-btn !h-11 flex-1 sm:flex-none"
                aria-expanded={detailOpen}
                onClick={() => setDetailOpen((o) => !o)}
              >
                {detailOpen ? "詳細条件を閉じる" : "詳細条件"}
              </button>
            </div>
            {hasAnyFilter(filters) || hasAnyFilter(queryFilters) ? (
              <button type="button" className="secondary-btn !h-10 w-full sm:w-auto" onClick={clearAllFilters}>
                条件を解除する
              </button>
            ) : null}
          </div>

          {detailOpen ? (
            <div className="flex flex-col gap-3.5 border-t border-[#dbe8f0] pt-3.5">
              <p className="text-xs muted-text">詳細条件は「探す」を押すと反映されます。</p>
              <label>
                <span className="label-text">地域</span>
                <select
                  className="mock-select !h-11"
                  value={filters.area}
                  onChange={(e) => setFilters((f) => ({ ...f, area: e.target.value }))}
                >
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
                <select
                  className="mock-select !h-11"
                  value={filters.age}
                  onChange={(e) => setFilters((f) => ({ ...f, age: e.target.value }))}
                >
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
                  お子さんの好きなこと（複数選択）
                  {filters.tags.length > 0 ? ` : ${filters.tags.length}件選択中` : ""}
                </span>
                <select
                  className="mock-select"
                  value={filters.tags}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, tags: Array.from(e.target.selectedOptions, (opt) => opt.value) }))
                  }
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
                  value={filters.connection}
                  onChange={(e) => setFilters((f) => ({ ...f, connection: e.target.value }))}
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
                  value={filters.meeting}
                  onChange={(e) => setFilters((f) => ({ ...f, meeting: e.target.value }))}
                >
                  <option value="">指定なし</option>
                  {MEETING_RANGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="primary-btn !h-11" onClick={runSearch}>
                この条件で探す
              </button>
            </div>
          ) : null}
        </section>

        <div ref={resultsAnchorRef} className="scroll-mt-4 pt-1" />

        {!loading && !message && countLabel ? (
          <section className="flex flex-col gap-2">
            <h2 className="section-title text-base">検索結果</h2>
            <p className="text-sm font-medium text-[#365f78]">{countLabel}</p>
            {appliedChips.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {appliedChips.map((c) => (
                  <span key={c.key} className="inline-flex rounded-full px-2.5 py-1 text-xs pill-pink">
                    {c.label}
                  </span>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

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
              <button type="button" className="secondary-btn !h-10" onClick={clearAllFilters}>
                条件を解除して探す
              </button>
              {relaxedCards.length > 0 && (
                <div className="mt-3 flex flex-col gap-2.5">
                  <p className="section-note">タグ条件を外した候補</p>
                  {relaxedCards.map((card) => (
                    <article key={`relaxed-${card.id}`} className="soft-card-subtle flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-[#2f5f79]">{toMamaDisplayName(card.nickname)}</h3>
                        <div className="text-right text-xs muted-text shrink-0">
                          <p>{card.area}</p>
                          <p>{card.child_age_group}</p>
                        </div>
                      </div>
                      <p
                        className="text-sm text-[#365f78] leading-snug"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {card.want_to_connect}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(card.child_interest_tags ?? []).slice(0, 3).map((tag) => (
                          <span key={`${card.id}-${tag}`} className="inline-flex rounded-full px-2.5 py-1 text-xs pill-blue">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <Link href={`/search/${card.id}`} className="secondary-btn !h-10 text-center">
                        詳細を見る
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
          {!loading &&
            !message &&
            cards.map((card) => (
              <article key={card.id} className="soft-card flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold leading-snug text-[#2f5f79] text-lg">{toMamaDisplayName(card.nickname)}</h3>
                  <div className="text-right text-xs text-[#5a7a8f] shrink-0 space-y-0.5">
                    <p className="font-medium text-[#365f78]">{card.area}</p>
                    <p>{card.child_age_group}</p>
                  </div>
                </div>
                <p
                  className="text-sm leading-relaxed text-[#365f78]"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {card.want_to_connect}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(card.child_interest_tags ?? []).slice(0, 3).map((tag) => (
                    <span key={`${card.id}-${tag}`} className="inline-flex rounded-full px-2.5 py-1 text-xs pill-blue">
                      {tag}
                    </span>
                  ))}
                </div>
                <Link href={`/search/${card.id}`} className="secondary-btn !h-11 text-center">
                  詳細を見る
                </Link>
              </article>
            ))}
        </section>
      </main>
    </div>
  );
}
