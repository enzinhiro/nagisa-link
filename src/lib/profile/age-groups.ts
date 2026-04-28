import { isVisiblePublicValue } from "./public-visibility";

export const CHILD_AGE_GROUP_OPTIONS = [
  "未就学",
  "小学校低学年",
  "小学校高学年",
  "中学生",
  "高校生以上",
] as const;

export function normalizeChildAgeGroups(values: string[] | null | undefined): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const raw of values ?? []) {
    const value = String(raw ?? "").trim();
    if (!isVisiblePublicValue(value)) continue;
    if (!CHILD_AGE_GROUP_OPTIONS.includes(value as (typeof CHILD_AGE_GROUP_OPTIONS)[number])) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
}

export function toDisplayChildAgeGroups(
  childAgeGroups: string[] | null | undefined,
  legacyChildAgeGroup: string | null | undefined
): string[] {
  const fromArray = normalizeChildAgeGroups(childAgeGroups);
  if (fromArray.length > 0) return fromArray;
  const legacy = String(legacyChildAgeGroup ?? "").trim();
  return isVisiblePublicValue(legacy) ? [legacy] : [];
}
