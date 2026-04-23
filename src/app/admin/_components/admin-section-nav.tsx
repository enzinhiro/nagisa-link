"use client";

import Link from "next/link";

type AdminSection = "home" | "invite-codes" | "users" | "reports";

const SECTION_LINKS: Array<{ key: AdminSection; href: string; label: string }> = [
  { key: "home", href: "/admin", label: "管理トップ" },
  { key: "invite-codes", href: "/admin/invite-codes", label: "招待コード管理" },
  { key: "users", href: "/admin/users", label: "ユーザー一覧" },
  { key: "reports", href: "/admin/reports", label: "通報管理" },
];

export function AdminSectionNav({
  current,
  breadcrumb,
}: {
  current: AdminSection;
  breadcrumb?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {breadcrumb ? <p className="text-xs muted-text">{breadcrumb}</p> : null}
      <nav className="flex flex-wrap gap-2" aria-label="管理画面ナビゲーション">
        {SECTION_LINKS.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            className={`inline-flex h-9 items-center rounded-full px-3 text-xs ${
              current === link.key
                ? "bg-[#dceefb] text-[#2f5f79]"
                : "border border-[#d7e5ef] bg-white text-[#5b798d]"
            }`}
            aria-current={current === link.key ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
