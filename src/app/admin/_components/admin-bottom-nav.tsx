"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** 管理画面専用の下ナビ（一般ユーザー向け4タブバーとは別コンポーネント） */
export function AdminBottomNav() {
  const pathname = usePathname();
  const tabs = [
    { href: "/admin", label: "TOP", active: pathname === "/admin" },
    { href: "/", label: "ホーム", active: pathname === "/" },
    {
      href: "/admin/invite-codes",
      label: "コード",
      active: pathname.startsWith("/admin/invite-codes") || pathname.startsWith("/admin/invites"),
    },
    { href: "/admin/users", label: "会員", active: pathname.startsWith("/admin/users") },
    { href: "/admin/announcements", label: "お知らせ", active: pathname.startsWith("/admin/announcements") },
    { href: "/admin/reports", label: "通報", active: pathname.startsWith("/admin/reports") },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#dbe8f0] bg-[#fffdfa]/96 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur"
      aria-label="管理画面ナビゲーション"
    >
      <div className="mx-auto grid h-[3.25rem] max-w-[460px] grid-cols-6 gap-0.5 px-1 py-1">
        {tabs.map((tab) => (
          <Link
            key={`${tab.href}-${tab.label}`}
            href={tab.href}
            className={`flex items-center justify-center rounded-lg px-0.5 text-center text-[10px] font-medium leading-tight tracking-[0.01em] sm:text-[11px] ${
              tab.active
                ? "bg-[#eaf6ff] text-[#2f5f79] shadow-[inset_0_0_0_1px_rgba(146,198,227,0.45)]"
                : "text-[#6b8393]"
            }`}
            aria-current={tab.active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
