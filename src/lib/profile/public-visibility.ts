const PUBLIC_HIDDEN_TEXT_VALUES = new Set(["未設定", "選択してください"]);

export function isVisiblePublicValue(value: string | null | undefined): boolean {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return false;
  return !PUBLIC_HIDDEN_TEXT_VALUES.has(trimmed);
}
