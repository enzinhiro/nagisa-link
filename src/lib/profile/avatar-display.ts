import { resolveAvatarSeed } from "./avatar";

type AvatarPalette = {
  backgroundA: string;
  backgroundB: string;
  text: string;
  border: string;
  accent: string;
};

export type AvatarVisualStyle = {
  seed: number;
  palette: AvatarPalette;
  pattern: number;
};

const PALETTES: AvatarPalette[] = [
  {
    backgroundA: "#e4f3ff",
    backgroundB: "#d5ebff",
    text: "#2e6485",
    border: "#c7e0f2",
    accent: "#ffffff",
  },
  {
    backgroundA: "#e6f8f2",
    backgroundB: "#d5f0e7",
    text: "#356d63",
    border: "#c5e4db",
    accent: "#ffffff",
  },
  {
    backgroundA: "#fff2e4",
    backgroundB: "#ffe7d0",
    text: "#866348",
    border: "#f0d8c1",
    accent: "#ffffff",
  },
  {
    backgroundA: "#ffe9f2",
    backgroundB: "#ffdce9",
    text: "#84536b",
    border: "#efc7d9",
    accent: "#ffffff",
  },
  {
    backgroundA: "#efeaff",
    backgroundB: "#e3dcff",
    text: "#61568a",
    border: "#d8cdf3",
    accent: "#ffffff",
  },
];

export function getAvatarInitial(nickname?: string | null): string {
  const normalized = (nickname ?? "").trim();
  if (!normalized) return "N";
  for (const ch of Array.from(normalized)) {
    if (/[\p{L}\p{N}]/u.test(ch)) {
      return ch.toLocaleUpperCase("ja-JP");
    }
  }
  return "N";
}

export function getAvatarVisualStyle(seed: number | null | undefined, userId: string): AvatarVisualStyle {
  const normalizedSeed = resolveAvatarSeed(seed, userId);
  return {
    seed: normalizedSeed,
    palette: PALETTES[normalizedSeed % PALETTES.length],
    pattern: normalizedSeed % 3,
  };
}
