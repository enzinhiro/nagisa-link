"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";
import { toMamaDisplayName } from "../../../lib/profile/displayName";
import { ProfileAvatar } from "../../../components/profile-avatar";
import { isMissingProfileColumnError } from "../../../lib/supabase/profile-query";
import { getVisibleConnectionAchievementCounts } from "../../../lib/profile/connection-achievements";
import { isVisiblePublicValue } from "../../../lib/profile/public-visibility";
import { CHILD_AGE_GROUP_OPTIONS, toDisplayChildAgeGroups } from "../../../lib/profile/age-groups";
import { MOM_INTEREST_TAG_OPTIONS, normalizeMomInterestTags } from "../../../lib/profile/mom-interest-tags";
import { CONNECTION_PREFERENCE_OPTIONS } from "../../../lib/profile/connection-preference";

type SearchProfileCard = {
  id: string;
  nickname: string;
  avatar_seed: number | null;
  area: string;
  connection_achievement_count: number;
  child_age_group: string;
  child_age_groups: string[];
  child_interest_tags: string[];
  mom_interest_tags: string[];
  want_to_connect: string;
  intro: string;
  connection_preference: string;
  meeting_range: string;
  created_at: string;
};

const PUBLIC_PROFILE_SEARCH_SELECT_FULL =
  "id,nickname,avatar_seed,area,connection_achievement_count,child_age_group,child_age_groups,child_interest_tags,mom_interest_tags,want_to_connect,intro,connection_preference,meeting_range,created_at";

const PUBLIC_PROFILE_SEARCH_SELECT_FALLBACK =
  "id,nickname,area,connection_achievement_count,child_age_group,child_interest_tags,want_to_connect,intro,connection_preference,meeting_range,created_at";

type FilterState = {
  keyword: string;
  area: string;
  age: string;
  momInterests: string[];
  connection: string;
  meeting: string;
  tags: string[];
};

const emptyFilters = (): FilterState => ({
  keyword: "",
  area: "",
  age: "",
  momInterests: [],
  connection: "",
  meeting: "",
  tags: [],
});

function readFiltersFromParams(searchParams: URLSearchParams): FilterState {
  return {
    keyword: searchParams.get("q") ?? "",
    area: searchParams.get("area") ?? "",
    age: searchParams.get("age") ?? "",
    momInterests: searchParams.get("mom") ? searchParams.get("mom")!.split(",").filter(Boolean) : [],
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
  if (f.momInterests.length > 0) params.set("mom", f.momInterests.join(","));
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
    f.momInterests.length > 0 ||
    f.tags.length > 0 ||
    f.connection.length > 0 ||
    f.meeting.length > 0
  );
}

function filtersEqual(a: FilterState, b: FilterState): boolean {
  if (
    a.keyword !== b.keyword ||
    a.area !== b.area ||
    a.age !== b.age ||
    a.connection !== b.connection ||
    a.meeting !== b.meeting
  ) {
    return false;
  }
  if (a.tags.length !== b.tags.length || a.momInterests.length !== b.momInterests.length) return false;
  return a.tags.every((t, i) => t === b.tags[i]) && a.momInterests.every((t, i) => t === b.momInterests[i]);
}

function chipPreview(text: string, max = 18) {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().normalize("NFKC").replace(/[\s　]+/g, "");
}

/** キーワードを単語に分割（全角/半角スペース、連続空白対応） */
function splitSearchQuery(raw: string): string[] {
  return raw
    .trim()
    .split(/[\s　]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** ひらがな ↔ 片仮名の代表的なブロック変換（同一読みのゆれ吸収） */
function alternateKanaForms(s: string): string[] {
  const out = new Set<string>([s]);
  const toH = s.replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  const toK = s.replace(/[\u3041-\u3096]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));
  out.add(toH);
  out.add(toK);
  return [...out].filter((x) => x.length > 0);
}

/** キーワード検索用に、エリアの正式表記と「市」「町」を落とした略称の両方を対象に含める */
function areaTextsForKeywordMatch(area: string | null | undefined): string[] {
  const raw = String(area ?? "").trim();
  if (!raw) return [];
  const stripped = raw.replace(/市$/, "").replace(/町$/, "");
  return stripped !== raw ? [raw, stripped] : [raw];
}

function clampTextStyle(lines: number) {
  return {
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
  };
}

const KEYWORD_VARIANT_GROUPS: string[][] = [
  ["漫画", "マンガ", "まんが", "コミック", "comic"],
  ["アニメ", "あにめ", "anime"],
  ["読書", "どくしょ", "本", "絵本", "小説"],
  ["サッカー", "さっかー", "フットボール", "football"],
  ["野球", "やきゅう", "ベースボール", "baseball"],
  ["バスケ", "バスケット", "バスケットボール", "basketball"],
  ["ダンス", "だんす", "dance"],
  ["ピアノ", "ぴあの", "piano"],
  ["音楽", "おんがく", "music", "歌", "うた", "カラオケ"],
  ["英語", "えいご", "english"],
  ["勉強", "べんきょう", "学習", "がくしゅう"],
  ["工作", "こうさく", "手作り", "ハンドメイド", "クラフト"],
  ["絵", "お絵かき", "おえかき", "イラスト", "drawing"],
  ["プログラミング", "ぷろぐらみんぐ", "coding", "コーディング"],
  ["電車", "でんしゃ", "鉄道", "てつどう"],
  ["車", "くるま", "自動車", "じどうしゃ"],
  ["恐竜", "きょうりゅう", "dinosaur"],
  ["動物", "どうぶつ", "アニマル", "animal"],
  ["虫", "むし", "昆虫", "こんちゅう"],
  ["海", "うみ", "海遊び", "釣り", "つり"],
  ["外遊び", "そとあそび", "公園", "こうえん"],
  ["運動", "うんどう", "スポーツ", "sports"],
  ["不登校", "ふとうこう", "学校に行きづらい", "登校しぶり"],
  ["居場所", "いばしょ", "フリースクール", "放課後デイ", "放デイ"],
  ["発達", "はったつ", "発達凸凹", "療育", "りょういく"],
];

const NORMALIZED_KEYWORD_VARIANT_GROUPS = KEYWORD_VARIANT_GROUPS.map((group) =>
  group.map((term) => normalizeSearchText(term))
);

const GAME_CATEGORY_GROUP = [
  "ゲーム",
  "げーむ",
  "game",
  "switch",
  "スイッチ",
  "任天堂スイッチ",
  "ニンテンドースイッチ",
  "nintendo switch",
  "ニンテンドー",
  "任天堂",
  "pc",
  "パソコン",
  "ぱそこん",
  "パソコンゲーム",
  "コンピューター",
  "computer",
];

const GAME_TITLE_GROUPS = [
  ["マイクラ", "マインクラフト", "マイクラフト", "minecraft", "minecraft education", "マイクラ教育版"],
  ["フォートナイト", "fortnite", "フォトナ"],
  ["ロブロックス", "roblox", "ロブロ"],
  ["バロラント", "valorant", "ヴァロラント", "ヴァロ"],
  ["ポケモン", "pokémon", "pokemon", "ポケットモンスター"],
  ["スプラトゥーン", "splatoon", "スプラ"],
  ["あつ森", "どうぶつの森", "animal crossing"],
  ["マリオ", "mario", "スーパーマリオ"],
  ["スマブラ", "大乱闘スマッシュブラザーズ", "smash bros"],
  ["ゼルダ", "zelda", "ゼルダの伝説"],
  ["カービィ", "kirby"],
  ["モンハン", "モンスターハンター", "monster hunter"],
  ["妖怪ウォッチ", "ようかいウォッチ"],
  ["太鼓の達人", "太鼓", "taiko"],
  ["プロセカ", "プロジェクトセカイ", "project sekai"],
  ["にゃんこ大戦争", "にゃんこ"],
  ["apex", "エーペックス", "エペ"],
].map((group) => group.map((term) => normalizeSearchText(term)));

const NORMALIZED_GAME_CATEGORY_GROUP = GAME_CATEGORY_GROUP.map((term) => normalizeSearchText(term));
const NORMALIZED_ALL_GAME_TERMS = Array.from(
  new Set(NORMALIZED_GAME_CATEGORY_GROUP.concat(...GAME_TITLE_GROUPS))
);

/** 運営で揃えた地域の正式名と、キーワード検索で同一扱いする別名 */
const AREA_ALIAS_GROUPS = {
  逗子市: ["逗子市", "逗子"],
  葉山町: ["葉山町", "葉山"],
  横須賀市: ["横須賀市", "横須賀"],
} as const;

type OfficialServiceArea = keyof typeof AREA_ALIAS_GROUPS;

const AREA_OPTIONS: OfficialServiceArea[] = ["逗子市", "葉山町", "横須賀市"];

function areaAliasTokensForOfficial(official: OfficialServiceArea): string[] {
  const aliases = AREA_ALIAS_GROUPS[official];
  return [official, ...aliases].map((t) => normalizeSearchText(t));
}

/** キーワードから、DBの area に入っている正式地名（逗子市 等）を解決する */
function getAreaTargetsFromKeyword(rawKeyword: string): OfficialServiceArea[] {
  const normKw = normalizeSearchText(rawKeyword);
  /** 単一文字のみは別エリアにも掛かり得るためエリアヒットは出さない */
  if (!normKw || normKw.length < 2) return [];
  const hits = new Set<OfficialServiceArea>();
  for (const official of AREA_OPTIONS) {
    const tokens = areaAliasTokensForOfficial(official);
    const matched = tokens.some(
      (tok) => tok === normKw || tok.startsWith(normKw) || normKw.startsWith(tok)
    );
    if (matched) hits.add(official);
  }
  return [...hits];
}

/** card.area が正式キーとして登録済みのとき、「逗子」「逗子市」など別名検索でも true */
function keywordMatchesStoredArea(normalizedKeyword: string, cardAreaRaw: string): boolean {
  const trimmed = cardAreaRaw.trim();
  if (!trimmed || !(trimmed in AREA_ALIAS_GROUPS)) return false;
  if (!normalizedKeyword || normalizedKeyword.length < 2) return false;
  const official = trimmed as OfficialServiceArea;
  const tokens = areaAliasTokensForOfficial(official);
  return tokens.some(
    (tok) => tok === normalizedKeyword || tok.startsWith(normalizedKeyword) || normalizedKeyword.startsWith(tok)
  );
}

/**
 * キーワードがエリア別名に一致する場合の area IN (...) 用。
 * 詳細条件のエリアと矛盾する（例: 詳細=葉山・キーワード=逗子）ときは追加フェッチしない。
 */
function supplementaryAreaTargetsForFetch(
  rawKeyword: string,
  detailAreaFilter: string
): OfficialServiceArea[] | null {
  const parts = splitSearchQuery(rawKeyword);
  const pieces = parts.length > 0 ? parts : rawKeyword.trim() ? [rawKeyword] : [];
  const union = new Set<OfficialServiceArea>();
  for (const piece of pieces) {
    const targets = getAreaTargetsFromKeyword(piece);
    targets.forEach((t) => union.add(t));
  }
  const fromKw = [...union];
  if (fromKw.length === 0) return null;
  const trimmedDetail = detailAreaFilter.trim();
  if (!trimmedDetail) return fromKw;
  const narrowed = fromKw.filter((a) => a === trimmedDetail);
  return narrowed.length > 0 ? narrowed : null;
}

/** 詳細条件の地域値（正式名/別名）を DB の area 検索値配列に展開 */
function areaFilterValues(selectedArea: string): string[] {
  const trimmed = selectedArea.trim();
  if (!trimmed) return [];
  const targets = getAreaTargetsFromKeyword(trimmed);
  const official = targets[0];
  if (!official) return [trimmed];
  const aliases = AREA_ALIAS_GROUPS[official];
  return Array.from(new Set([official, ...aliases]));
}

function mergeProfilesById(a: SearchProfileCard[], b: SearchProfileCard[]): SearchProfileCard[] {
  const map = new Map<string, SearchProfileCard>();
  for (const row of a) map.set(row.id, row);
  for (const row of b) if (!map.has(row.id)) map.set(row.id, row);
  return [...map.values()];
}

/** 同義語グループがあれば、グループ内の語もマッチ候補に含める */
function synonymExpansionsForToken(normToken: string): string[] {
  const acc = new Set<string>([normToken]);
  for (const group of NORMALIZED_KEYWORD_VARIANT_GROUPS) {
    if (!group.some((term) => term === normToken || term.includes(normToken) || normToken.includes(term))) {
      continue;
    }
    for (const term of group) acc.add(term);
  }
  return [...acc];
}

const KEYWORD_FIELD_WEIGHTS = {
  nickname: 88,
  displayName: 88,
  area: 95,
  wantToConnect: 90,
  intro: 58,
  ageLine: 68,
  connectionPreference: 64,
  meetingRange: 64,
  tagItem: 84,
} as const;

function expandTokenCandidates(normToken: string): string[] {
  const set = new Set<string>();
  for (const form of alternateKanaForms(normToken)) {
    for (const syn of synonymExpansionsForToken(form)) {
      set.add(syn);
    }
  }
  return [...set].filter(Boolean);
}

function scoreSubstringInHaystack(token: string, haystackNorm: string, weight: number): number {
  if (!token || !haystackNorm) return 0;
  if (haystackNorm.includes(token)) {
    const bump = Math.min(1, token.length / 10);
    return Math.round(weight * (0.66 + 0.34 * bump));
  }
  return 0;
}

function buildWeightedSearchFields(card: SearchProfileCard): { norm: string; w: number }[] {
  const displayName = toMamaDisplayName(card.nickname);
  const ageLine = toDisplayChildAgeGroups(card.child_age_groups, card.child_age_group).join(" ");
  const childTags = card.child_interest_tags ?? [];
  const momTags = normalizeMomInterestTags(card.mom_interest_tags ?? []);
  return [
    { norm: normalizeSearchText(displayName), w: KEYWORD_FIELD_WEIGHTS.displayName },
    { norm: normalizeSearchText(card.nickname), w: KEYWORD_FIELD_WEIGHTS.nickname },
    ...areaTextsForKeywordMatch(card.area).map((t) => ({
      norm: normalizeSearchText(t),
      w: KEYWORD_FIELD_WEIGHTS.area,
    })),
    { norm: normalizeSearchText(card.want_to_connect ?? ""), w: KEYWORD_FIELD_WEIGHTS.wantToConnect },
    { norm: normalizeSearchText(card.intro ?? ""), w: KEYWORD_FIELD_WEIGHTS.intro },
    { norm: normalizeSearchText(ageLine), w: KEYWORD_FIELD_WEIGHTS.ageLine },
    { norm: normalizeSearchText(card.connection_preference ?? ""), w: KEYWORD_FIELD_WEIGHTS.connectionPreference },
    { norm: normalizeSearchText(card.meeting_range ?? ""), w: KEYWORD_FIELD_WEIGHTS.meetingRange },
    ...childTags.map((t) => ({ norm: normalizeSearchText(String(t)), w: KEYWORD_FIELD_WEIGHTS.tagItem })),
    ...momTags.map((t) => ({ norm: normalizeSearchText(String(t)), w: KEYWORD_FIELD_WEIGHTS.tagItem })),
  ];
}

function concatNormalizedSearchBlob(card: SearchProfileCard): string {
  return buildWeightedSearchFields(card)
    .map((r) => r.norm)
    .join("\u0001");
}

function variantGroupScoreForToken(normToken: string, cardBlob: string): number {
  for (const group of NORMALIZED_KEYWORD_VARIANT_GROUPS) {
    const keywordTouches = group.some(
      (term) => term === normToken || normToken.includes(term) || term.includes(normToken)
    );
    if (!keywordTouches) continue;
    if (group.some((term) => cardBlob.includes(term))) return 76;
  }
  return 0;
}

function gameGroupScoreForToken(normToken: string, cardBlob: string): number {
  const gameCategoryTerms = ["ゲーム", "げーむ", "game"].map((term) => normalizeSearchText(term));
  const kwHitsGameCategory = NORMALIZED_GAME_CATEGORY_GROUP.some(
    (term) => normToken.includes(term) || term.includes(normToken)
  );
  if (kwHitsGameCategory) {
    if (NORMALIZED_ALL_GAME_TERMS.some((term) => cardBlob.includes(term))) return 82;
    return 0;
  }
  for (const titleGroup of GAME_TITLE_GROUPS) {
    const keywordHitsTitle = titleGroup.some((term) => normToken.includes(term) || term.includes(normToken));
    if (!keywordHitsTitle) continue;
    if (titleGroup.some((term) => cardBlob.includes(term))) return 78;
    if (gameCategoryTerms.some((term) => cardBlob.includes(term))) return 72;
  }
  return 0;
}

function areaTokenMatchScore(normToken: string, card: SearchProfileCard): number {
  if (keywordMatchesStoredArea(normToken, card.area)) return 96;
  const a = normalizeSearchText(String(card.area ?? ""));
  for (const candidate of expandTokenCandidates(normToken)) {
    if (candidate.length < 2) continue;
    if (a.includes(candidate)) return 90;
  }
  return 0;
}

function scoreTokenOnCard(normToken: string, card: SearchProfileCard): number {
  if (!normToken) return 0;
  let max = areaTokenMatchScore(normToken, card);
  const blob = concatNormalizedSearchBlob(card);
  const fields = buildWeightedSearchFields(card);
  for (const t of expandTokenCandidates(normToken)) {
    if (!t) continue;
    for (const { norm, w } of fields) {
      max = Math.max(max, scoreSubstringInHaystack(t, norm, w));
    }
    max = Math.max(max, variantGroupScoreForToken(t, blob));
    max = Math.max(max, gameGroupScoreForToken(t, blob));
  }
  return max;
}

const MIN_SCORE_SINGLE = 17;
const MIN_MULTI_EACH = 14;
const MIN_MULTI_SUM = 52;
const MIN_MULTI_STRONG = 44;
const MULTI_ALL_MATCH_BONUS = 92;

function evaluateKeywordSearch(card: SearchProfileCard, rawKeyword: string): { include: boolean; rankScore: number } {
  const normFull = normalizeSearchText(rawKeyword);
  const tokens = splitSearchQuery(rawKeyword)
    .map((x) => normalizeSearchText(x))
    .filter(Boolean);
  const effectiveTokens = tokens.length > 0 ? tokens : normFull ? [normFull] : [];
  if (effectiveTokens.length === 0) {
    return { include: true, rankScore: 0 };
  }

  const scores = effectiveTokens.map((t) => scoreTokenOnCard(t, card));

  let include = false;
  if (scores.length === 1) {
    include = scores[0] >= MIN_SCORE_SINGLE;
  } else {
    const eachOk = scores.every((s) => s >= MIN_MULTI_EACH);
    const sum = scores.reduce((x, y) => x + y, 0);
    const someStrong = scores.some((s) => s >= MIN_MULTI_STRONG);
    const twoWeak = scores.filter((s) => s >= 12).length >= 2;
    include = eachOk || sum >= MIN_MULTI_SUM || someStrong || (twoWeak && sum >= 42);
  }

  const rankScore =
    scores.reduce((x, y) => x + y, 0) +
    (scores.length > 1 && scores.every((s) => s >= MIN_MULTI_EACH) ? MULTI_ALL_MATCH_BONUS : 0);

  return { include, rankScore };
}

function matchesKeyword(card: SearchProfileCard, rawKeyword: string): boolean {
  return evaluateKeywordSearch(card, rawKeyword).include;
}

const AGE_OPTIONS = [...CHILD_AGE_GROUP_OPTIONS];
const CONNECTION_OPTIONS = [...CONNECTION_PREFERENCE_OPTIONS];
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

function matchesAgeFilter(card: SearchProfileCard, age: string): boolean {
  if (!age) return true;
  return toDisplayChildAgeGroups(card.child_age_groups, card.child_age_group).includes(age);
}

function matchesMomInterests(card: SearchProfileCard, selectedInterests: string[]): boolean {
  if (selectedInterests.length === 0) return true;
  const visibleMomInterests = new Set(normalizeMomInterestTags(card.mom_interest_tags ?? []));
  return selectedInterests.some((interest) => visibleMomInterests.has(interest));
}

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
  const [visibleCount, setVisibleCount] = useState(10);
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
    setVisibleCount(10);
    setDetailOpen(false);
  }, []);

  useEffect(() => {
    setVisibleCount(10);
  }, [
    queryFilters.keyword,
    queryFilters.area,
    queryFilters.age,
    queryFilters.connection,
    queryFilters.meeting,
    queryFilters.tags,
    queryFilters.momInterests,
  ]);

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

      let query = supabase.from("public_profiles").select(PUBLIC_PROFILE_SEARCH_SELECT_FULL).neq("id", user.id);

      const selectedAreaValues = areaFilterValues(queryFilters.area);
      if (selectedAreaValues.length > 0) query = query.in("area", selectedAreaValues);
      if (queryFilters.connection) query = query.eq("connection_preference", queryFilters.connection);
      if (queryFilters.meeting) query = query.eq("meeting_range", queryFilters.meeting);
      if (queryFilters.tags.length > 0) query = query.overlaps("child_interest_tags", queryFilters.tags);
      const keywordActive = normalizeSearchText(queryFilters.keyword).length > 0;
      const fetchLimit = keywordActive ? 500 : 40;
      query = query.order("created_at", { ascending: false }).limit(fetchLimit);

      let { data, error } = await query;
      let usingFallbackColumns = false;
      if (error && isMissingProfileColumnError(error)) {
        let fallbackQuery = supabase
          .from("public_profiles")
          .select(PUBLIC_PROFILE_SEARCH_SELECT_FALLBACK)
          .neq("id", user.id);
        if (selectedAreaValues.length > 0) fallbackQuery = fallbackQuery.in("area", selectedAreaValues);
        if (queryFilters.connection) fallbackQuery = fallbackQuery.eq("connection_preference", queryFilters.connection);
        if (queryFilters.meeting) fallbackQuery = fallbackQuery.eq("meeting_range", queryFilters.meeting);
        if (queryFilters.tags.length > 0) fallbackQuery = fallbackQuery.overlaps("child_interest_tags", queryFilters.tags);
        const keywordActiveFb = normalizeSearchText(queryFilters.keyword).length > 0;
        const fetchLimitFb = keywordActiveFb ? 500 : 40;
        const fallbackResult = await fallbackQuery.order("created_at", { ascending: false }).limit(fetchLimitFb);
        error = fallbackResult.error;
        usingFallbackColumns = true;
        if (!fallbackResult.error && Array.isArray(fallbackResult.data)) {
          data = fallbackResult.data.map((row) => ({ ...row, avatar_seed: null, child_age_groups: [], mom_interest_tags: [] })) as SearchProfileCard[];
        } else {
          data = null;
        }
      }

      if (error) {
        setMessage("一覧の取得に失敗しました。時間をおいて再度お試しください。");
        setCards([]);
        setLoading(false);
        return;
      }

      let mergedRows = (data ?? []) as SearchProfileCard[];
      const supTargets = supplementaryAreaTargetsForFetch(queryFilters.keyword, queryFilters.area);
      if (keywordActive && supTargets && supTargets.length > 0) {
        const supLimit = 400;
        if (usingFallbackColumns) {
          let supQ = supabase
            .from("public_profiles")
            .select(PUBLIC_PROFILE_SEARCH_SELECT_FALLBACK)
            .neq("id", user.id)
            .in("area", supTargets);
          if (queryFilters.connection) supQ = supQ.eq("connection_preference", queryFilters.connection);
          if (queryFilters.meeting) supQ = supQ.eq("meeting_range", queryFilters.meeting);
          if (queryFilters.tags.length > 0) supQ = supQ.overlaps("child_interest_tags", queryFilters.tags);
          const supRes = await supQ.order("created_at", { ascending: false }).limit(supLimit);
          if (!supRes.error && Array.isArray(supRes.data)) {
            const mapped = supRes.data.map((row) => ({
              ...row,
              avatar_seed: null,
              child_age_groups: [],
              mom_interest_tags: [],
            })) as SearchProfileCard[];
            mergedRows = mergeProfilesById(mergedRows, mapped);
          }
        } else {
          let supQ = supabase
            .from("public_profiles")
            .select(PUBLIC_PROFILE_SEARCH_SELECT_FULL)
            .neq("id", user.id)
            .in("area", supTargets);
          if (queryFilters.connection) supQ = supQ.eq("connection_preference", queryFilters.connection);
          if (queryFilters.meeting) supQ = supQ.eq("meeting_range", queryFilters.meeting);
          if (queryFilters.tags.length > 0) supQ = supQ.overlaps("child_interest_tags", queryFilters.tags);
          const supRes = await supQ.order("created_at", { ascending: false }).limit(supLimit);
          if (!supRes.error && Array.isArray(supRes.data)) {
            mergedRows = mergeProfilesById(mergedRows, supRes.data as SearchProfileCard[]);
          }
        }
      }

      const fetchedRows = mergedRows
        .map((card) => ({ card, kw: evaluateKeywordSearch(card, queryFilters.keyword) }))
        .filter(
          (row) =>
            row.kw.include &&
            matchesAgeFilter(row.card, queryFilters.age) &&
            matchesMomInterests(row.card, queryFilters.momInterests)
        );

      const sorted = fetchedRows.sort((a, b) => {
        if (b.kw.rankScore !== a.kw.rankScore) return b.kw.rankScore - a.kw.rankScore;
        const areaPriorityA =
          selectedAreaValues.length > 0 && selectedAreaValues.includes(a.card.area) ? 0 : 1;
        const areaPriorityB =
          selectedAreaValues.length > 0 && selectedAreaValues.includes(b.card.area) ? 0 : 1;
        if (areaPriorityA !== areaPriorityB) return areaPriorityA - areaPriorityB;
        return new Date(b.card.created_at).getTime() - new Date(a.card.created_at).getTime();
      });

      const sortedCards = sorted.map((r) => r.card);
      const visibleCounts = await getVisibleConnectionAchievementCounts(sortedCards.map((card) => card.id));
      const cardsWithVisibleCounts = sortedCards.map((card) => ({
        ...card,
        connection_achievement_count: visibleCounts.get(card.id) ?? 0,
      }));
      setCards(cardsWithVisibleCounts);

      if (sortedCards.length === 0 && queryFilters.tags.length > 0) {
        let relaxedQuery = supabase
          .from("public_profiles")
          .select(
            "id,nickname,avatar_seed,area,connection_achievement_count,child_age_group,child_age_groups,child_interest_tags,mom_interest_tags,want_to_connect,intro,connection_preference,meeting_range,created_at"
          )
          .neq("id", user.id);

        if (selectedAreaValues.length > 0) relaxedQuery = relaxedQuery.in("area", selectedAreaValues);
        if (queryFilters.connection) relaxedQuery = relaxedQuery.eq("connection_preference", queryFilters.connection);
        if (queryFilters.meeting) relaxedQuery = relaxedQuery.eq("meeting_range", queryFilters.meeting);

        const relaxedLimit = normalizeSearchText(queryFilters.keyword).length > 0 ? 300 : 10;
        let { data: relaxedData, error: relaxedError } = await relaxedQuery
          .order("created_at", { ascending: false })
          .limit(relaxedLimit);
        if (relaxedError && isMissingProfileColumnError(relaxedError)) {
          let relaxedFallback = supabase
            .from("public_profiles")
            .select(
              "id,nickname,area,connection_achievement_count,child_age_group,child_interest_tags,want_to_connect,intro,connection_preference,meeting_range,created_at"
            )
            .neq("id", user.id);
          if (selectedAreaValues.length > 0) relaxedFallback = relaxedFallback.in("area", selectedAreaValues);
          if (queryFilters.connection) relaxedFallback = relaxedFallback.eq("connection_preference", queryFilters.connection);
          if (queryFilters.meeting) relaxedFallback = relaxedFallback.eq("meeting_range", queryFilters.meeting);
          const fallbackRes = await relaxedFallback.order("created_at", { ascending: false }).limit(relaxedLimit);
          relaxedData = Array.isArray(fallbackRes.data)
            ? (fallbackRes.data.map((row) => ({ ...row, avatar_seed: null, child_age_groups: [], mom_interest_tags: [] })) as SearchProfileCard[])
            : null;
        }
        const relaxedFetched = ((relaxedData ?? []) as SearchProfileCard[]).filter((card) => {
          return (
            matchesKeyword(card, queryFilters.keyword) &&
            matchesAgeFilter(card, queryFilters.age) &&
            matchesMomInterests(card, queryFilters.momInterests)
          );
        });
        const relaxedLimited = relaxedFetched.slice(0, 3);
        const relaxedCounts = await getVisibleConnectionAchievementCounts(
          relaxedLimited.map((card) => card.id)
        );
        const relaxedWithVisibleCounts = relaxedLimited.map((card) => ({
          ...card,
          connection_achievement_count: relaxedCounts.get(card.id) ?? 0,
        }));
        setRelaxedCards(relaxedWithVisibleCounts);
      }

      setLoading(false);
    };

    fetchProfiles();
  }, [
    queryFilters.area,
    queryFilters.age,
    queryFilters.momInterests,
    queryFilters.connection,
    queryFilters.meeting,
    queryFilters.tags,
    queryFilters.keyword,
  ]);

  const appliedChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (queryFilters.area) chips.push({ key: "area", label: queryFilters.area });
    if (queryFilters.age) chips.push({ key: "age", label: queryFilters.age });
    queryFilters.momInterests.slice(0, 4).forEach((t) => chips.push({ key: `mom-${t}`, label: t }));
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

  const hasSearchFilters = hasAnyFilter(queryFilters);
  const visibleCards = cards.slice(0, visibleCount);
  const canShowMore = !loading && !message && cards.length > visibleCount;

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack !gap-2">
        <section className="flex flex-col gap-2 rounded-[14px] border border-[#e6eef5] bg-[#fcfeff] px-3 py-2.5 shadow-[0_2px_10px_rgba(102,119,137,0.05)]">
          <div className="flex flex-col gap-2">
            <div className="flex flex-row flex-wrap items-center gap-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">キーワードで検索</span>
                <input
                  className="mock-input !h-10"
                  value={filters.keyword}
                  onChange={(e) => {
                    const keyword = e.target.value;
                    setFilters((f) => ({ ...f, keyword }));
                    setQueryFilters((q) => ({ ...q, keyword }));
                  }}
                  placeholder="気になることや好きなことから探す"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      runSearch();
                    }
                  }}
                />
              </label>
              <button
                type="button"
                className="secondary-btn !h-10 shrink-0"
                aria-expanded={detailOpen}
                onClick={() => setDetailOpen((o) => !o)}
              >
                {detailOpen ? "詳細条件を閉じる" : "詳細条件"}
              </button>
            </div>
            {hasAnyFilter(filters) || hasAnyFilter(queryFilters) ? (
              <button type="button" className="secondary-btn !h-9 w-full sm:w-auto" onClick={clearAllFilters}>
                条件を解除する
              </button>
            ) : null}
          </div>

          {detailOpen ? (
            <div className="flex flex-col gap-3 border-t border-[#dbe8f0] pt-3">
              <p className="text-xs muted-text">詳細条件は「この条件で探す」を押すと反映されます。</p>
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
                <span className="label-text">
                  ママの興味・関心（複数選択）
                  {filters.momInterests.length > 0 ? ` : ${filters.momInterests.length}件選択中` : ""}
                </span>
                <select
                  className="mock-select"
                  value={filters.momInterests}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, momInterests: Array.from(e.target.selectedOptions, (opt) => opt.value) }))
                  }
                  multiple
                  size={5}
                >
                  {MOM_INTEREST_TAG_OPTIONS.map((option) => (
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
              <p className="text-[11px] text-[#6f8797]">条件を選んでから、この条件で探すを押してください。</p>
            </div>
          ) : null}
        </section>

        {!detailOpen ? (
          <>
        <div ref={resultsAnchorRef} className="scroll-mt-2" />

        {!loading && !message && countLabel ? (
          <section className="flex flex-col gap-2">
            <h2 className="section-title text-base">{hasSearchFilters ? "検索結果" : "ママ一覧"}</h2>
            {hasSearchFilters ? <p className="text-sm font-medium text-[#365f78]">{countLabel}</p> : null}
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
                  {relaxedCards.map((card) => {
                    const achievementCount = Number(card.connection_achievement_count ?? 0);
                    const showArea = isVisiblePublicValue(card.area);
                    const displayAgeGroups = toDisplayChildAgeGroups(card.child_age_groups, card.child_age_group);
                    const ageText = displayAgeGroups.join("・");
                    const showAgeGroup = isVisiblePublicValue(ageText);
                    const showWantToConnect = isVisiblePublicValue(card.want_to_connect);
                    const showIntro = !showWantToConnect && isVisiblePublicValue(card.intro);
                    const profileLeadLabel = showWantToConnect ? "今つながりたいこと" : showIntro ? "ひとこと紹介" : "";
                    const profileLead = showWantToConnect ? card.want_to_connect : showIntro ? card.intro : "";
                    const hasProfileLead = isVisiblePublicValue(profileLead);
                    const visibleTags = (card.child_interest_tags ?? [])
                      .filter((tag) => isVisiblePublicValue(tag))
                      .slice(0, 3);
                    const visibleMomInterests = normalizeMomInterestTags(card.mom_interest_tags ?? []).slice(0, 2);
                    return (
                    <article key={`relaxed-${card.id}`} className="soft-card-subtle flex flex-col gap-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                          <ProfileAvatar
                            userId={card.id}
                            avatarSeed={card.avatar_seed}
                            nickname={card.nickname}
                            className="h-9 w-9"
                          />
                          <h3 className="min-w-0 flex-1 truncate font-semibold text-[#2f5f79]">
                            {toMamaDisplayName(card.nickname)}
                          </h3>
                        </div>
                        {achievementCount > 0 ? (
                          <span className="shrink-0 rounded-full border border-[#f1d7e3] bg-[#fff3f8] px-2 py-0.5 text-[11px] text-[#8c6375]">
                            つながり実績 {achievementCount}
                          </span>
                        ) : null}
                      </div>
                      {showArea || showAgeGroup ? (
                        <p className="person-meta-line">
                          {[card.area, ageText].filter((value) => isVisiblePublicValue(value)).join(" ・ ")}
                        </p>
                      ) : null}
                      {hasProfileLead ? (
                        <div className="person-summary-strip">
                          <p className="text-[11px] font-semibold text-[#6b8598]">{profileLeadLabel}</p>
                          <p className="mt-1 text-sm text-[#365f78] leading-snug" style={clampTextStyle(2)}>
                            {profileLead}
                          </p>
                        </div>
                      ) : null}
                      {visibleTags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {visibleTags.map((tag) => (
                          <span key={`${card.id}-${tag}`} className="inline-flex rounded-full px-2.5 py-1 text-xs pill-blue">
                            {tag}
                          </span>
                          ))}
                        </div>
                      ) : null}
                      {visibleMomInterests.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {visibleMomInterests.map((tag) => (
                            <span key={`${card.id}-mom-${tag}`} className="inline-flex rounded-full px-2.5 py-1 text-xs pill-pink">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <Link href={`/search/${card.id}`} className="secondary-btn !h-10 text-center">
                        詳細を見る
                      </Link>
                    </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {!loading &&
            !message &&
            visibleCards.map((card) => {
              const achievementCount = Number(card.connection_achievement_count ?? 0);
              const showArea = isVisiblePublicValue(card.area);
              const displayAgeGroups = toDisplayChildAgeGroups(card.child_age_groups, card.child_age_group);
              const ageText = displayAgeGroups.join("・");
              const showAgeGroup = isVisiblePublicValue(ageText);
              const showWantToConnect = isVisiblePublicValue(card.want_to_connect);
              const showIntro = !showWantToConnect && isVisiblePublicValue(card.intro);
              const profileLeadLabel = showWantToConnect ? "今つながりたいこと" : showIntro ? "ひとこと紹介" : "";
              const profileLead = showWantToConnect ? card.want_to_connect : showIntro ? card.intro : "";
              const hasProfileLead = isVisiblePublicValue(profileLead);
              const visibleTags = (card.child_interest_tags ?? [])
                .filter((tag) => isVisiblePublicValue(tag))
                .slice(0, 3);
              const visibleMomInterests = normalizeMomInterestTags(card.mom_interest_tags ?? []).slice(0, 3);
              return (
              <article key={card.id} className="soft-card flex flex-col gap-2.5 !px-4 !py-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <ProfileAvatar
                      userId={card.id}
                      avatarSeed={card.avatar_seed}
                      nickname={card.nickname}
                      className="h-10 w-10"
                    />
                    <h3 className="min-w-0 flex-1 truncate text-base font-semibold leading-snug text-[#2f5f79]">
                      {toMamaDisplayName(card.nickname)}
                    </h3>
                  </div>
                  {achievementCount > 0 ? (
                    <span className="shrink-0 rounded-full border border-[#f1d7e3] bg-[#fff3f8] px-2 py-0.5 text-[11px] text-[#8c6375]">
                      つながり実績 {achievementCount}
                    </span>
                  ) : null}
                </div>
                {showArea || showAgeGroup ? (
                  <p className="person-meta-line">
                    {[card.area, ageText].filter((value) => isVisiblePublicValue(value)).join(" ・ ")}
                  </p>
                ) : null}
                {hasProfileLead ? (
                  <div className="person-connect-strip">
                    <p className="text-[11px] font-semibold text-[#6b8598]">{profileLeadLabel}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[#365f78]" style={clampTextStyle(3)}>
                      {profileLead}
                    </p>
                  </div>
                ) : null}
                {visibleTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {visibleTags.map((tag) => (
                    <span key={`${card.id}-${tag}`} className="inline-flex rounded-full px-2.5 py-1 text-xs pill-blue">
                      {tag}
                    </span>
                    ))}
                  </div>
                ) : null}
                {visibleMomInterests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {visibleMomInterests.map((tag) => (
                      <span key={`${card.id}-mom-${tag}`} className="inline-flex rounded-full px-2.5 py-1 text-xs pill-pink">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <Link href={`/search/${card.id}`} className="secondary-btn !h-11 text-center">
                  詳細を見る
                </Link>
              </article>
              );
            })}
          {canShowMore ? (
            <button
              type="button"
              className="secondary-btn !h-10"
              onClick={() => setVisibleCount((current) => current + 10)}
            >
              もっと見る
            </button>
          ) : null}
        </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
