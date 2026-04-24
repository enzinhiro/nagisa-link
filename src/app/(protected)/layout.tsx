"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";
import { APP_HEADER_LOGO_PATH, SERVICE_NAME } from "../../lib/brand";
import { isAdminEmail } from "../../lib/admin-access";
import { fetchProfileGateStatus } from "../../lib/account-status";

export const PROTECTED_APP_PATH_HINTS = ["/", "/search", "/talk", "/chat"] as const;
const ENABLE_TEMP_PROD_GUARD_LOGS = true;
const ENABLE_TEMP_DEBUG_PANEL = true;

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [talkBadgeCount, setTalkBadgeCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [profileGateError, setProfileGateError] = useState<string | null>(null);
  const [debugHasSession, setDebugHasSession] = useState<boolean | null>(null);
  const [debugUserId, setDebugUserId] = useState<string | null>(null);
  const [debugProfileCompleted, setDebugProfileCompleted] = useState<boolean | null>(null);
  const [debugIsSuspended, setDebugIsSuspended] = useState<boolean | null>(null);
  const [debugLastBranch, setDebugLastBranch] = useState("guard:init");
  const isChatDetailPage = pathname.startsWith("/chat/") && pathname !== "/chat";
  const guardRunningRef = useRef(false);
  const guardCompletedUserIdRef = useRef<string | null>(null);
  const inviteCheckedUserIdRef = useRef<string | null>(null);
  const guardLog = (...args: unknown[]) => {
    if (!ENABLE_TEMP_PROD_GUARD_LOGS) return;
    console.log("[protected-guard]", ...args);
  };
  const warnedProtectedRealFileRef = useRef(false);
  if (!warnedProtectedRealFileRef.current) {
    warnedProtectedRealFileRef.current = true;
    console.warn("DEBUG AUTH REAL FILE: src/app/(protected)/layout.tsx");
  }

  useEffect(() => {
    let cancelled = false;
    const guard = async () => {
      if (guardRunningRef.current) return;
      guardRunningRef.current = true;
      let shouldStayLoading = false;
      try {
        setDebugLastBranch("guard:start");
        guardLog("guard:start", { pathname, isChecking });
        setProfileGateError(null);

        const {
          data: { user },
          error: sessionUserError,
        } = await supabase.auth.getUser();
        setDebugHasSession(Boolean(user));
        setDebugUserId(user?.id ?? null);

        if (cancelled) return;

        const staleStatus = (sessionUserError as { status?: number } | null)?.status;
        if (sessionUserError && (staleStatus === 401 || staleStatus === 403)) {
          setDebugLastBranch("guard:stale-session");
          guardLog("branch:stale-session", { pathname, status: staleStatus });
          await supabase.auth.signOut({ scope: "local" });
          guardLog("router.replace", { pathname, to: "/auth", branch: "stale-session" });
          router.replace("/auth");
          shouldStayLoading = true;
          return;
        }

        if (!user) {
          setDebugLastBranch("guard:no-user");
          guardCompletedUserIdRef.current = null;
          inviteCheckedUserIdRef.current = null;
          guardLog("branch:no-user", { pathname });
          guardLog("router.replace", { pathname, to: "/auth", branch: "no-user" });
          router.replace("/auth");
          shouldStayLoading = true;
          return;
        }

        if (guardCompletedUserIdRef.current === user.id) {
          setDebugLastBranch("guard:already-completed");
          guardLog("branch:already-completed", { pathname, userId: user.id });
          setIsChecking(false);
          return;
        }

        setIsAdminUser(isAdminEmail(user.email));

        if (inviteCheckedUserIdRef.current !== user.id) {
          // Non-blocking best effort: invite linking should not freeze page routing.
          if (user.email) {
            void supabase
              .rpc("link_invite_code_user", {
                input_email: user.email,
                input_user_id: user.id,
              })
              .then(({ error }) => {
                if (error) console.warn("[protected-guard] link_invite_code_user failed", error);
              });
          }

          if (cancelled) return;

          // If RPC fails temporarily, do not block the whole app on loading.
          const { data: hasConsumedInvite, error: inviteError } = await supabase.rpc(
            "has_consumed_invite",
            { input_email: user.email ?? "", input_user_id: user.id }
          );
          if (inviteError) {
            setDebugLastBranch("guard:invite-rpc-error");
            console.warn("[protected-guard] has_consumed_invite failed", inviteError);
          } else if (!hasConsumedInvite) {
            setDebugLastBranch("guard:invite-not-consumed");
            guardLog("branch:invite-not-consumed", { pathname, userId: user.id });
            guardLog("router.replace", { pathname, to: "/auth", branch: "invite-not-consumed" });
            router.replace("/auth");
            shouldStayLoading = true;
            return;
          }
          inviteCheckedUserIdRef.current = user.id;
        }

        if (cancelled) return;

        const status = await fetchProfileGateStatus(user.id);
        setDebugProfileCompleted(status?.profileCompleted ?? null);
        setDebugIsSuspended(status?.isSuspended ?? null);
        guardLog("profile-status", {
          pathname,
          userId: user.id,
          profileCompleted: status?.profileCompleted ?? null,
          isSuspended: status?.isSuspended ?? null,
        });
        if (cancelled) return;

        if (!status) {
          setDebugLastBranch("guard:no-status");
          guardLog("router.replace", { pathname, to: "/onboarding/profile", branch: "no-status" });
          router.replace("/onboarding/profile");
          shouldStayLoading = true;
          return;
        }

        // Keep admin recoverable even if accidentally suspended.
        if (status.isSuspended && !isAdminEmail(user.email)) {
          setDebugLastBranch("guard:suspended");
          guardLog("router.replace", { pathname, to: "/suspended", branch: "suspended" });
          router.replace("/suspended");
          shouldStayLoading = true;
          return;
        }

        if (!status.profileCompleted) {
          setDebugLastBranch("guard:incomplete-profile");
          guardLog("router.replace", { pathname, to: "/onboarding/profile", branch: "incomplete-profile" });
          router.replace("/onboarding/profile");
          shouldStayLoading = true;
          return;
        }

        const { count: pendingInCount, error: pendingCountError } = await supabase
          .from("wants")
          .select("*", { count: "exact", head: true })
          .eq("to_user", user.id)
          .eq("status", "pending");

        if (cancelled) return;

        if (!pendingCountError && typeof pendingInCount === "number") {
          setTalkBadgeCount(pendingInCount);
        } else {
          setTalkBadgeCount(0);
        }
        guardCompletedUserIdRef.current = user.id;
        setDebugLastBranch("guard:profile-ok");
        guardLog("guard:success", { pathname, userId: user.id });
      } catch (error) {
        setDebugLastBranch("guard:catch-error");
        console.error("[protected-guard] unexpected guard error", error);
        setProfileGateError("画面の読み込みに失敗しました。再読み込みしてください。");
      } finally {
        guardRunningRef.current = false;
        if (!cancelled && !shouldStayLoading) {
          setDebugLastBranch("guard:set-checking-false");
          guardLog("set:isChecking:false", { pathname });
          setIsChecking(false);
        }
      }
    };

    void guard();
    return () => {
      cancelled = true;
    };
  }, []);

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
        <aside className="fixed left-2 top-2 z-[100] rounded bg-black/85 px-2 py-1 text-xs text-white">
          DEBUG AUTH REAL FILE
        </aside>
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
    <div
      className={
        isChatDetailPage
          ? "flex h-dvh max-h-dvh flex-col overflow-hidden pt-[calc(3.5rem+1px)] pb-[calc(5rem+env(safe-area-inset-bottom,0px))]"
          : "min-h-dvh pb-20 pt-[calc(3.5rem+1px)]"
      }
    >
      <header className="fixed left-0 right-0 top-0 z-30 h-14 border-b border-[#edf4f8] bg-[#f9fdff]/95 backdrop-blur">
        <div className="mx-auto flex h-full w-full max-w-[460px] items-center justify-between px-3">
          <div className="flex min-w-0 flex-1 items-center pr-2">
            <Link
              href="/"
              className="flex min-w-0 max-w-[min(260px,72vw)] items-center py-1"
              aria-label={`${SERVICE_NAME} ホームへ`}
            >
              <img
                src={APP_HEADER_LOGO_PATH}
                alt={SERVICE_NAME}
                className="h-9 w-auto max-h-9 shrink-0 object-contain object-left"
                decoding="async"
              />
            </Link>
          </div>
          <div className="relative">
            {isAdminUser ? (
              <span className="absolute -left-12 top-1/2 -translate-y-1/2 rounded-full border border-[#f1d7e3] bg-[#fff3f8] px-2 py-0.5 text-[10px] text-[#8c6375]">
                管理者
              </span>
            ) : null}
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d8e7ef] bg-white text-[#47687c]"
              onClick={() => setIsMenuOpen((v) => !v)}
              aria-label="メニューを開く"
            >
              ⚙
            </button>
            {isMenuOpen ? (
              <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-[#d8e7ef] bg-white p-2 shadow-sm">
                <Link
                  href="/onboarding/profile"
                  className="block rounded-xl px-3 py-2 text-sm text-[#365f78] hover:bg-[#f2f9ff]"
                >
                  プロフィールを編集
                </Link>
                <Link
                  href="/rules"
                  className="block rounded-xl px-3 py-2 text-sm text-[#365f78] hover:bg-[#f2f9ff]"
                >
                  ルール
                </Link>
                {isAdminUser ? (
                  <div className="mt-1 border-t border-[#edf4f8] pt-1.5">
                    <p className="px-3 py-1 text-[11px] text-[#7b93a2]">運営アカウント</p>
                    <Link
                      href="/admin"
                      className="block rounded-xl px-3 py-2 text-sm text-[#365f78] hover:bg-[#f2f9ff]"
                    >
                      運営メニュー
                    </Link>
                  </div>
                ) : null}
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
      {isChatDetailPage ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      ) : (
        children
      )}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e3edf3] bg-[#fffdfa]/96 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur">
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
      {ENABLE_TEMP_DEBUG_PANEL ? (
        <aside className="fixed bottom-20 right-2 z-[95] max-w-[88vw] rounded-md bg-black/75 px-2 py-1.5 text-[10px] leading-4 text-white">
          <p>[protected-guard]</p>
          <p>path: {pathname}</p>
          <p>session: {String(debugHasSession)}</p>
          <p>user: {debugUserId ?? "-"}</p>
          <p>isChecking: {String(isChecking)}</p>
          <p>profileCompleted: {String(debugProfileCompleted)}</p>
          <p>isSuspended: {String(debugIsSuspended)}</p>
          <p>branch: {debugLastBranch}</p>
        </aside>
      ) : null}
    </div>
  );
}
