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
  const pattern = visual.pattern;

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
        className="pointer-events-none absolute -left-[18%] -top-[10%] h-[52%] w-[52%] rounded-full"
        style={{
          backgroundColor: visual.palette.accent,
          opacity: pattern === 0 ? 0.34 : pattern === 1 ? 0.26 : 0.2,
          filter: "blur(0.5px)",
        }}
      />
      <span
        className={`pointer-events-none absolute ${
          pattern === 1 ? "-right-[8%] bottom-[6%] h-[30%] w-[58%] rounded-[999px]" : "-right-[12%] bottom-[4%] h-[42%] w-[42%] rounded-full"
        }`}
        style={{
          backgroundColor: visual.palette.accent,
          opacity: pattern === 2 ? 0.3 : 0.2,
        }}
      />
      {pattern === 2 ? (
        <span
          className="pointer-events-none absolute left-[22%] top-[16%] h-[26%] w-[54%] rounded-[999px]"
          style={{ backgroundColor: visual.palette.accent, opacity: 0.18 }}
        />
      ) : null}
      <span
        className="relative select-none text-[0.82rem] font-semibold leading-none"
        style={{ color: visual.palette.text }}
      >
        {initial}
      </span>
    </div>
  );
}
