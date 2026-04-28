export const CONNECTION_PREFERENCE_OPTIONS = [
  "まずはチャットで話したい",
  "オンラインで話したい",
  "近場で会って話したい",
  "子ども同士で遊ぶきっかけを作りたい",
  "その他",
] as const;

const LEGACY_TO_NEW: Record<string, (typeof CONNECTION_PREFERENCE_OPTIONS)[number]> = {
  "まずは親同士でチャットしたい": "まずはチャットで話したい",
  "まずは親同士で話したい": "近場で会って話したい",
  "直接会って話したい": "近場で会って話したい",
  "情報交換をしたい": "その他",
  "近い悩みの人とつながりたい": "その他",
  "その他（自由入力）": "その他",
};

export function normalizeConnectionPreference(value: string | null | undefined): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  if ((CONNECTION_PREFERENCE_OPTIONS as readonly string[]).includes(trimmed)) return trimmed;
  return LEGACY_TO_NEW[trimmed] ?? "その他";
}
