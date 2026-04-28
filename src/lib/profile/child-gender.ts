import { isVisiblePublicValue } from "./public-visibility";

export const CHILD_GENDER_OPTIONS = [
  "男の子",
  "女の子",
  "どちらもいる",
  "その他・回答しない",
] as const;

const CHILD_GENDER_OTHER_VARIANTS = new Set([
  "その他 / 答えたくない",
  "その他/答えたくない",
  "その他・回答しない",
]);

export function normalizeChildGender(value: string | null | undefined): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  if (CHILD_GENDER_OTHER_VARIANTS.has(trimmed)) return "その他・回答しない";
  return trimmed;
}

export function shouldShowPublicChildGender(value: string | null | undefined): boolean {
  const normalized = normalizeChildGender(value);
  if (!isVisiblePublicValue(normalized)) return false;
  return normalized !== "その他・回答しない";
}
