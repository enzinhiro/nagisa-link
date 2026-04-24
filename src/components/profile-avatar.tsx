"use client";

import { useMemo } from "react";
import { getAvatarInitial, getAvatarVisualStyle } from "../lib/profile/avatar-display";

type ProfileAvatarProps = {
  userId: string;
  avatarSeed?: number | null;
  nickname?: string | null;
  className?: string;
};

export function ProfileAvatar({ userId, avatarSeed, nickname, className = "h-12 w-12" }: ProfileAvatarProps) {
  const initial = useMemo(() => getAvatarInitial(nickname), [nickname]);
  const visual = useMemo(() => getAvatarVisualStyle(avatarSeed, userId), [avatarSeed, userId]);

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border ${className}`}
      style={{
        borderColor: visual.palette.border,
        background: `linear-gradient(145deg, ${visual.palette.backgroundA} 0%, ${visual.palette.backgroundB} 100%)`,
      }}
      aria-hidden="true"
    >
      <span
        className="relative select-none text-[0.92rem] font-semibold leading-none"
        style={{ color: visual.palette.text }}
      >
        {initial}
      </span>
    </div>
  );
}
