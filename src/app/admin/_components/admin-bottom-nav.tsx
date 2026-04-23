"use client";

import Link from "next/link";

export function AdminBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#e3edf3] bg-[#fffdfa]/96 backdrop-blur">
      <div className="mx-auto max-w-[460px] px-3 py-2.5">
        <Link
          href="/"
          className="flex h-10 w-full items-center justify-center rounded-xl border border-[#d8e7ef] bg-white text-sm font-medium text-[#365f78]"
        >
          ホームに戻る
        </Link>
      </div>
    </nav>
  );
}
