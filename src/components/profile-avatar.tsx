"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { resolveAvatarImagePath } from "../lib/profile/avatar";

type ProfileAvatarProps = {
  userId: string;
  avatarSeed?: number | null;
  nickname?: string | null;
  className?: string;
};

export function ProfileAvatar({ userId, avatarSeed, nickname, className = "h-12 w-12" }: ProfileAvatarProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const src = useMemo(() => resolveAvatarImagePath(avatarSeed, userId), [avatarSeed, userId]);
  const fallbackText = (nickname?.trim().slice(0, 1) || "M").toUpperCase();

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border border-[#cde5f2] bg-[#dff2ff] ${className}`}
      aria-hidden="true"
    >
      {!hasImageError ? (
        <Image
          src={src}
          alt=""
          fill
          sizes="48px"
          className="object-cover"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#3f6680]">
          {fallbackText}
        </div>
      )}
    </div>
  );
}
