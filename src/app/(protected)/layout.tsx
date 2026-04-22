"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";
import { APP_HEADER_LOGO_PATH, SERVICE_NAME } from "../../lib/brand";

export const PROTECTED_APP_PATH_HINTS = ["/", "/search", "/talk", "/chat"] as const;

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [talkBadgeCount, setTalkBadgeCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profileGateError, setProfileGateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const guard = async () => {
      setProfileGateError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        router.replace("/auth");
        return;
      }

      if (user.email) {
        await supabase.rpc("link_invite_code_user", {
          input_email: user.email,
          input_user_id: user.id,
        });
      }

      if (cancelled) return;

      const { data: hasConsumedInvite, error: inviteError } = await supabase.rpc(
        "has_consumed_invite",
        { input_email: user.email ?? "", input_user_id: user.id }
      );

      if (inviteError || !hasConsumedInvite) {
        router.replace("/auth");
        return;
      }

      if (cancelled) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("profile_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("[protected/layout] profiles select failed", error);
        setProfileGateError(
          "プロフィール情報を読み込めませんでした。時間をおいてから再度お試しください。"
        );
        setIsChecking(false);
        return;
      }

      if (!data || data.profile_completed !== true) {
        router.replace("/onboarding/profile");
        return;
      }

      // wants/chats導線が未実装の環境でもホームを開けることを優先し、バッジは一旦固定
      setTalkBadgeCount(0);

      setIsChecking(false);
    };

    void guard();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  if (isChecking) {
    return (
      <div className="mock-page">
        <main className="mock-shell screen-stack">
          <section className="soft-card">
            <p className="muted-text text-sm">読み込み中です...</p>
          </section>
        </main>
      </div>
    );
  }

  if (profileGateError) {
    return (
      <div className="mock-page">
        <main className="mock-shell screen-stack">
          <section className="soft-card flex flex-col gap-3">
            <p className="text-sm text-rose-700">{profileGateError}</p>
            <Link
              href="/onboarding/profile"
              className="secondary-btn !h-10 text-center leading-10"
            >
              プロフィール登録へ
            </Link>
          </section>
        </main>
      </div>
    );
  }

  const tabs = [
    { href: "/", label: "ホーム", active: pathname === "/" },
    { href: "/search", label: "さがす", active: pathname.startsWith("/search") },
    { href: "/talk", label: "話したい", active: pathname.startsWith("/talk"), badge: talkBadgeCount },
    { href: "/chat", label: "チャット", active: pathname.startsWith("/chat") },
  ];

  return (
    <div className="min-h-dvh pb-20 pt-13">
      <header className="fixed left-0 right-0 top-0 z-30 border-b border-[#edf4f8] bg-[#f9fdff]/95 backdrop-blur">
        <div className="mx-auto flex h-24 w-full max-w-[460px] items-center justify-between px-3">
          <div className="flex items-center flex-none shrink-0 min-w-fit">
            <Link href="/" className="flex items-center flex-none shrink-0 min-w-fit" aria-label={`${SERVICE_NAME} ホームへ`}>
              <img
                src={APP_HEADER_LOGO_PATH}
                alt={SERVICE_NAME}
                className="h-20 w-auto max-h-none flex-none shrink-0"
              />
            </Link>
          </div>
          <div className="relative">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d8e7ef] bg-white text-[#47687c]"
              onClick={() => setIsMenuOpen((v) => !v)}
              aria-label="メニューを開く"
            >
              ⚙
            </button>
            {isMenuOpen ? (
              <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-[#d8e7ef] bg-white p-2 shadow-sm">
                <Link
                  href="/profile"
                  className="block rounded-xl px-3 py-2 text-sm text-[#365f78] hover:bg-[#f2f9ff]"
                >
                  プロフィールを確認
                </Link>
                <Link
                  href="/rules"
                  className="block rounded-xl px-3 py-2 text-sm text-[#365f78] hover:bg-[#f2f9ff]"
                >
                  ルール
                </Link>
                <button
                  type="button"
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[#365f78] hover:bg-[#f2f9ff]"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.replace("/auth");
                  }}
                >
                  ログアウト
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      {children}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-[#e3edf3] bg-[#fffdfa]/96 backdrop-blur">
        <div className="mx-auto grid max-w-[460px] grid-cols-4 px-2 py-2">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center justify-center rounded-xl px-2 py-2 text-xs ${
                tab.active
                  ? "text-[#2f5f79] bg-[#ecf8ff] shadow-[inset_0_0_0_1px_rgba(156,206,231,0.35)]"
                  : "text-[#6b8393]"
              }`}
            >
              <span>{tab.label}</span>
              {"badge" in tab && (tab.badge ?? 0) > 0 ? (
                <span className="absolute right-3 top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-[#ff8aa8] px-1 text-[10px] text-white">
                  {tab.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
