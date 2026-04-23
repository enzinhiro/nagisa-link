"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminBottomNav() {
  const pathname = usePathname();
  const tabs = [
    { href: "/", label: "ホーム", active: pathname === "/" },
    { href: "/search", label: "さがす", active: pathname.startsWith("/search") },
    { href: "/talk", label: "話したい", active: pathname.startsWith("/talk") },
    { href: "/chat", label: "チャット", active: pathname.startsWith("/chat") },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#e3edf3] bg-[#fffdfa]/96 backdrop-blur">
      <div className="mx-auto grid max-w-[460px] grid-cols-4 px-2 py-2">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative flex flex-col items-center justify-center rounded-xl px-2 py-2 text-xs ${
              tab.active
                ? "bg-[#ecf8ff] text-[#2f5f79] shadow-[inset_0_0_0_1px_rgba(156,206,231,0.35)]"
                : "text-[#6b8393]"
            }`}
          >
            <span>{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
