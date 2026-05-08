"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    { href: "/admin/reports", label: "通報", active: pathname.startsWith("/admin/reports") },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#dbe8f0] bg-[#fffdfa]/96 backdrop-blur">
      <div className="mx-auto grid max-w-[460px] grid-cols-5 gap-1 px-2 py-1.5">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex h-9 items-center justify-center rounded-lg px-1 text-[11px] font-medium tracking-[0.01em] ${
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
