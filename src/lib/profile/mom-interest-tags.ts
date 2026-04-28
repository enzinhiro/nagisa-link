import { isVisiblePublicValue } from "./public-visibility";

export const MOM_INTEREST_TAG_OPTIONS = [
  "教育・学び",
  "子育ての悩み",
  "学校との関わり",
  "不登校・行きしぶり",
  "発達・個性",
  "友だちづくり",
  "親子の居場所",
  "地域のおでかけ",
  "ママの息抜き",
  "働き方・復職",
  "こころと体のケア",
  "家族との関わり",
] as const;

export function normalizeMomInterestTags(values: string[] | null | undefined): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const raw of values ?? []) {
    const value = String(raw ?? "").trim();
    if (!isVisiblePublicValue(value)) continue;
    if (!MOM_INTEREST_TAG_OPTIONS.includes(value as (typeof MOM_INTEREST_TAG_OPTIONS)[number])) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
}
