export function toMamaDisplayName(nickname: string): string {
  const trimmed = nickname.trim();
  if (!trimmed) return "名無しママ";
  return trimmed.endsWith("ママ") ? trimmed : `${trimmed}ママ`;
}
