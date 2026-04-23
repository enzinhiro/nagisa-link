const AVATAR_IMAGE_COUNT = 12;
const AVATAR_SEED_MAX = 1_000_000_000;
const DEFAULT_AVATAR_PATH = "/avatars/default.svg";
const USE_PRESET_AVATARS = process.env.NEXT_PUBLIC_USE_PRESET_AVATARS === "true";

function hashToPositiveInt(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function generateAvatarSeed(): number {
  return Math.floor(Math.random() * AVATAR_SEED_MAX);
}

export function resolveAvatarSeed(seed: number | null | undefined, userId: string): number {
  if (Number.isInteger(seed) && Number(seed) >= 0) {
    return Number(seed);
  }
  return hashToPositiveInt(userId);
}

export function resolveAvatarImagePath(seed: number | null | undefined, userId: string): string {
  if (!USE_PRESET_AVATARS) return DEFAULT_AVATAR_PATH;
  const normalizedSeed = resolveAvatarSeed(seed, userId);
  const avatarIndex = (normalizedSeed % AVATAR_IMAGE_COUNT) + 1;
  return `/avatars/avatar-${String(avatarIndex).padStart(2, "0")}.png`;
}
