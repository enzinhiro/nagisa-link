"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase, SUPABASE_URL_IN_USE } from "../../lib/supabase/client";
import { AUTH_TOP_IMAGE_PATH, SERVICE_NAME } from "../../lib/brand";
import { fetchProfileGateStatus } from "../../lib/account-status";

const SIGNUP_FORM_STORAGE_KEY = "nagisa-link-signup-form";
const AUTH_TAB_STORAGE_KEY = "nagisa-link-auth-tab";
const AUTH_DEBUG_KEY = "nagisa-link-auth-debug";
const ENABLE_TEMP_PROD_AUTH_LOGS = true;
const ENABLE_TEMP_DEBUG_PANEL = true;

function formatSignUpErrorMessage(message: string): string {
  const normalized = message.trim().toLowerCase();
  if (normalized.includes("email rate limit exceeded")) {
    return "短時間に送信が集中しています。少し時間をおいてから、もう一度お試しください。";
  }
  return message;
}

async function resolveAuthProfileDestination(
  userId: string
): Promise<"/" | "/onboarding/profile" | "/suspended"> {
  const status = await fetchProfileGateStatus(userId);
  if (!status) return "/onboarding/profile";
  if (status.isSuspended) return "/suspended";
  if (status.profileCompleted) return "/";
  return "/onboarding/profile";
}

export default function AuthPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupInviteCode, setSignupInviteCode] = useState("");
  const [signupRealName, setSignupRealName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");
  const [agreedLegal, setAgreedLegal] = useState(false);
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [isSignupSubmitting, setIsSignupSubmitting] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [signupMessage, setSignupMessage] = useState("");
  const [signupSuccessEmail, setSignupSuccessEmail] = useState<string | null>(null);
  const [isSessionChecking, setIsSessionChecking] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [debugHasSession, setDebugHasSession] = useState<boolean | null>(null);
  const [debugUserId, setDebugUserId] = useState<string | null>(null);
  const [debugLastBranch, setDebugLastBranch] = useState("auth:init");
  const sessionCheckRunningRef = useRef(false);
  const redirectingRef = useRef(false);
  const authLog = (...args: unknown[]) => {
    if (!ENABLE_TEMP_PROD_AUTH_LOGS) return;
    console.log("[auth-page]", ...args);
  };
  const warnedAuthRealFileRef = useRef(false);
  if (!warnedAuthRealFileRef.current) {
    warnedAuthRealFileRef.current = true;
    console.warn("DEBUG AUTH REAL FILE: src/app/auth/page.tsx");
  }
  const isAuthDebugEnabled =
    typeof window !== "undefined" && window.localStorage.getItem(AUTH_DEBUG_KEY) === "1";
  const authDebugLog = (...args: unknown[]) => {
    if (!isAuthDebugEnabled) return;
    console.log("[auth-debug]", ...args);
  };

  const isSignupReady =
    signupInviteCode.trim().length > 0 &&
    signupRealName.trim().length > 0 &&
    signupEmail.trim().length > 0 &&
    signupPassword.length > 0 &&
    signupPasswordConfirm.length > 0 &&
    agreedLegal &&
    !isSignupSubmitting;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTab = window.sessionStorage.getItem(AUTH_TAB_STORAGE_KEY);
    if (savedTab === "login" || savedTab === "signup") {
      setActiveTab(savedTab);
    }

    const savedSignup = window.sessionStorage.getItem(SIGNUP_FORM_STORAGE_KEY);
    if (!savedSignup) return;
    try {
      const parsed = JSON.parse(savedSignup) as {
        inviteCode?: string;
        realName?: string;
        email?: string;
        password?: string;
        passwordConfirm?: string;
        agreedLegal?: boolean;
        agreedTerms?: boolean;
        agreedPrivacy?: boolean;
      };
      setSignupInviteCode(parsed.inviteCode ?? "");
      setSignupRealName(parsed.realName ?? "");
      setSignupEmail(parsed.email ?? "");
      setSignupPassword(parsed.password ?? "");
      setSignupPasswordConfirm(parsed.passwordConfirm ?? "");
      const legacyBoth =
        typeof parsed.agreedTerms === "boolean" &&
        typeof parsed.agreedPrivacy === "boolean" &&
        parsed.agreedTerms &&
        parsed.agreedPrivacy;
      if (typeof parsed.agreedLegal === "boolean") {
        setAgreedLegal(parsed.agreedLegal);
      } else {
        setAgreedLegal(legacyBoth);
      }
    } catch {
      // ignore invalid stored data
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(AUTH_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  const serializedSignupState = useMemo(
    () =>
      JSON.stringify({
        inviteCode: signupInviteCode,
        realName: signupRealName,
        email: signupEmail,
        password: signupPassword,
        passwordConfirm: signupPasswordConfirm,
        agreedLegal,
      }),
    [
      signupInviteCode,
      signupRealName,
      signupEmail,
      signupPassword,
      signupPasswordConfirm,
      agreedLegal,
    ]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(SIGNUP_FORM_STORAGE_KEY, serializedSignupState);
  }, [serializedSignupState]);

  // メール確認リンクなどで /auth に戻り URL からセッションが復元された直後も、ログイン済みと同じ次画面へ進める
  useEffect(() => {
    let cancelled = false;
    authDebugLog("session effect mounted");
    authLog("effect:mounted", { pathname, isSessionChecking, isRedirecting });
    let isRecoveringBrokenSession = false;
    const recoverBrokenSession = async () => {
      if (isRecoveringBrokenSession) return;
      isRecoveringBrokenSession = true;
      authDebugLog("recoverBrokenSession:start");
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch (error) {
        console.error("[auth] failed to clear broken session", error);
      } finally {
        authDebugLog("recoverBrokenSession:done");
        isRecoveringBrokenSession = false;
      }
    };
    const redirectIfAuthed = async (userId: string) => {
      if (redirectingRef.current) return;
      redirectingRef.current = true;
      setDebugLastBranch("auth:redirect-by-profile");
      authLog("set:isRedirecting:true", { pathname, userId });
      setIsRedirecting(true);
      const dest = await resolveAuthProfileDestination(userId);
      if (cancelled) {
        redirectingRef.current = false;
        setIsRedirecting(false);
        return;
      }
      authDebugLog("redirectIfAuthed", { userId, dest });
      authLog("router.replace", {
        pathname,
        dest,
        userId,
        isSessionChecking,
        isRedirecting: true,
        branch: "authenticated",
      });
      router.replace(dest);
    };
    const validateCurrentSessionUser = async (): Promise<string | null> => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user) {
        setDebugHasSession(true);
        setDebugUserId(data.user.id);
        return data.user.id;
      }
      const status = (error as { status?: number } | null)?.status;
      authDebugLog("validateCurrentSessionUser:error", { status, message: error?.message });
      if (status === 401 || status === 403) {
        setDebugLastBranch("auth:recover-broken-session");
        await recoverBrokenSession();
      }
      return null;
    };
    const sync = async () => {
      if (sessionCheckRunningRef.current || redirectingRef.current) return;
      sessionCheckRunningRef.current = true;
      setDebugLastBranch("auth:sync-start");
      authLog("sync:start", { pathname });
      authDebugLog("sync:start");
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        authDebugLog("sync:session", { hasUser: Boolean(session?.user) });
        authLog("sync:session", {
          pathname,
          hasSession: Boolean(session),
          hasUser: Boolean(session?.user),
          userId: session?.user?.id ?? null,
          isSessionChecking,
          isRedirecting,
        });
        setDebugHasSession(Boolean(session));
        setDebugUserId(session?.user?.id ?? null);
        if (!session?.user) {
          setDebugLastBranch("auth:no-session");
          return;
        }
        const validUserId = await validateCurrentSessionUser();
        if (!validUserId || cancelled) {
          setDebugLastBranch("auth:user-invalid");
          return;
        }
        await redirectIfAuthed(validUserId);
      } finally {
        sessionCheckRunningRef.current = false;
        if (!cancelled && !redirectingRef.current) {
          setDebugLastBranch("auth:sync-finished");
          authLog("set:isSessionChecking:false(sync finally)", { pathname });
          setIsSessionChecking(false);
          authLog("set:isRedirecting:false(sync finally)", { pathname });
          setIsRedirecting(false);
        }
      }
    };
    void sync();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      authDebugLog("onAuthStateChange", { event, hasUser: Boolean(session?.user) });
      if (ENABLE_TEMP_PROD_AUTH_LOGS) {
        console.log("[auth-change]", {
          pathname,
          event,
          hasSession: Boolean(session),
          hasUser: Boolean(session?.user),
          userId: session?.user?.id ?? null,
          isSessionChecking,
          isRedirecting,
        });
      }
      if (cancelled || redirectingRef.current) return;
      if (!session?.user) {
        setDebugHasSession(Boolean(session));
        setDebugUserId(null);
        setDebugLastBranch("auth:change-no-session");
        authLog("set:isSessionChecking:false(no session event)", { pathname, event });
        setIsSessionChecking(false);
        authLog("set:isRedirecting:false(no session event)", { pathname, event });
        setIsRedirecting(false);
        return;
      }
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        setDebugHasSession(true);
        setDebugUserId(session.user.id);
        setDebugLastBranch(`auth:change-${event.toLowerCase()}`);
        authLog("set:isSessionChecking:true(auth change)", { pathname, event });
        setIsSessionChecking(true);
        void (async () => {
          try {
            const validUserId = await validateCurrentSessionUser();
            if (!validUserId || cancelled) {
              setDebugLastBranch("auth:change-user-invalid");
              return;
            }
            await redirectIfAuthed(validUserId);
          } finally {
            if (!cancelled && !redirectingRef.current) {
              authLog("set:isSessionChecking:false(auth change finally)", { pathname, event });
              setIsSessionChecking(false);
              authLog("set:isRedirecting:false(auth change finally)", { pathname, event });
              setIsRedirecting(false);
            }
          }
        })();
      }
    });
    return () => {
      cancelled = true;
      authDebugLog("session effect cleanup");
      setDebugLastBranch("auth:effect-cleanup");
      authLog("effect:cleanup", { pathname });
      subscription.unsubscribe();
    };
  }, [router]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginMessage("");
    setIsLoginSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });

    setIsLoginSubmitting(false);

    if (error) {
      setLoginMessage(error.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setDebugLastBranch("auth:login-no-user");
      setLoginMessage("ログイン状態を確認できませんでした。");
      return;
    }

    const destination = await resolveAuthProfileDestination(user.id);
    setDebugLastBranch("auth:login-success-redirect-home");
    authLog("router.replace(login success)", {
      pathname,
      destination,
      userId: user.id,
      isSessionChecking,
      isRedirecting,
    });
    router.replace(destination);
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignupMessage("");

    if (!signupInviteCode.trim()) {
      setSignupSuccessEmail(null);
      setSignupMessage("招待コードを入力してください。");
      return;
    }

    if (!signupRealName.trim()) {
      setSignupSuccessEmail(null);
      setSignupMessage("本名を入力してください。");
      return;
    }

    if (!signupEmail.trim()) {
      setSignupSuccessEmail(null);
      setSignupMessage("メールアドレスを入力してください。");
      return;
    }

    if (!signupPassword) {
      setSignupSuccessEmail(null);
      setSignupMessage("パスワードを入力してください。");
      return;
    }

    if (!agreedLegal) {
      setSignupSuccessEmail(null);
      setSignupMessage("利用規約・プライバシーポリシーに同意してください。");
      return;
    }

    if (!signupPasswordConfirm) {
      setSignupSuccessEmail(null);
      setSignupMessage("確認用パスワードを入力してください。");
      return;
    }

    if (signupPassword !== signupPasswordConfirm) {
      setSignupSuccessEmail(null);
      setSignupMessage("確認用パスワードが一致しません。");
      return;
    }

    setIsSignupSubmitting(true);

    const normalizedInviteCode = signupInviteCode.trim().toUpperCase();
    const normalizedSignupEmail = signupEmail.trim().toLowerCase();

    authDebugLog("validate_invite_code", { supabaseUrl: SUPABASE_URL_IN_USE });
    const { data: isValidInviteCode, error: validateError } = await supabase.rpc(
      "validate_invite_code",
      { input_code: normalizedInviteCode }
    );

    if (validateError) {
      console.error("validate_invite_code error", validateError);
      setIsSignupSubmitting(false);
      setSignupSuccessEmail(null);
      setSignupMessage("招待コードの確認に失敗しました。時間をおいてもう一度お試しください。");
      return;
    }

    if (!isValidInviteCode) {
      setIsSignupSubmitting(false);
      setSignupSuccessEmail(null);
      setSignupMessage("この招待コードは利用できません。入力内容をご確認ください。");
      return;
    }

    // Consume first to avoid creating auth-only accounts.
    authDebugLog("consume_invite_code", { supabaseUrl: SUPABASE_URL_IN_USE });
    const { data: consumeSucceeded, error: consumeError } = await supabase.rpc(
      "consume_invite_code",
      {
        input_code: normalizedInviteCode,
        input_email: normalizedSignupEmail,
        input_user_id: null,
      }
    );

    if (consumeError) {
      console.error("consume_invite_code error", consumeError);
      setIsSignupSubmitting(false);
      setSignupSuccessEmail(null);
      setSignupMessage("招待コードの確認に失敗しました。時間をおいてもう一度お試しください。");
      return;
    }

    if (!consumeSucceeded) {
      setIsSignupSubmitting(false);
      setSignupSuccessEmail(null);
      setSignupMessage("この招待コードは利用できません。入力内容をご確認ください。");
      return;
    }

    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined;

    authDebugLog("signUp", { supabaseUrl: SUPABASE_URL_IN_USE });
    const { error: signUpError } = await supabase.auth.signUp({
      email: normalizedSignupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: redirectTo,
        data: { real_name: signupRealName.trim() },
      },
    });

    if (signUpError) {
      setIsSignupSubmitting(false);
      setSignupSuccessEmail(null);
      setSignupMessage(formatSignUpErrorMessage(signUpError.message ?? ""));
      return;
    }

    setIsSignupSubmitting(false);
    setSignupSuccessEmail(normalizedSignupEmail);
    setSignupMessage("");
  };

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        {isSessionChecking || isRedirecting ? (
          <section className="soft-card">
            <p className="muted-text text-sm">読み込み中です...</p>
          </section>
        ) : null}
        {!signupSuccessEmail ? (
          <section className="relative overflow-hidden rounded-[22px] border border-[#deecf4] bg-[#f8fdff]">
            <div className="relative h-[46svh] min-h-[300px] max-h-[520px] w-full">
              <Image
                src={AUTH_TOP_IMAGE_PATH}
                alt={SERVICE_NAME}
                fill
                priority
                className="object-cover object-center"
              />
            </div>
            <div className="relative mt-0 rounded-t-[22px] bg-gradient-to-b from-[#f8fdff]/55 via-[#f8fdff]/94 to-[#f8fdff] px-3 pb-3 pt-2">
              <div className="tab-shell">
                <button
                  type="button"
                  className={`tab-btn ${activeTab === "signup" ? "tab-btn-active" : ""}`}
                  onClick={() => setActiveTab("signup")}
                >
                  新規登録
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === "login" ? "tab-btn-active" : ""}`}
                  onClick={() => setActiveTab("login")}
                >
                  ログイン
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="soft-card flex flex-col gap-5">
          {signupSuccessEmail ? (
            <form
              className="flex flex-col gap-3.5 rounded-[18px] border border-emerald-200/90 bg-gradient-to-b from-emerald-50/65 via-[#f7fbfe]/80 to-transparent p-[14px] shadow-[0_8px_22px_rgba(52,120,90,0.08)] transition-[box-shadow,border-color,background-color] duration-200"
              onSubmit={handleSignUp}
            >
              <div
                className="rounded-2xl border border-emerald-200/95 bg-gradient-to-b from-white to-emerald-50/50 px-[14px] py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
                role="status"
                aria-live="polite"
              >
                <h3 className="text-base font-semibold leading-snug text-emerald-950">
                  確認メールを送信しました
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[#2a5c45]">
                  <span className="break-all font-medium text-emerald-900">{signupSuccessEmail}</span>
                  {" に確認メールを送りました。メール内のリンクを押して認証してください。"}
                </p>
                <p className="mt-2.5 text-xs leading-relaxed text-[#4a7d62]">
                  認証が完了したら、この画面からログインできます。
                </p>
              </div>
              <button className="primary-btn mt-1" type="submit" disabled={!isSignupReady}>
                {isSignupSubmitting ? "送信中..." : "確認メールを再送信する"}
              </button>
            </form>
          ) : isSessionChecking || isRedirecting ? null : (
            <>
              {activeTab === "login" ? (
            <form className="flex flex-col gap-3.5" onSubmit={handleLogin}>
              <h2 className="section-title">ログイン</h2>
              <p className="section-note">登録済みのメールアドレスで続けます。</p>
              <label>
                <span className="label-text">メールアドレス</span>
                <input
                  className="mock-input"
                  type="email"
                  placeholder="example@mail.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </label>
              <label>
                <span className="label-text">パスワード</span>
                <input
                  className="mock-input"
                  type="password"
                  placeholder="8文字以上"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </label>
              {loginMessage && <p className="text-sm text-rose-700">{loginMessage}</p>}
              <button className="primary-btn mt-1" type="submit" disabled={isLoginSubmitting}>
                {isLoginSubmitting ? "ログイン中..." : "ログインして進む"}
              </button>
              <Link
                href="/auth/reset-password"
                className="text-center text-sm muted-text underline underline-offset-3"
              >
                パスワードを忘れた方はこちら
              </Link>
            </form>
          ) : (
            <form className="flex flex-col gap-3.5" onSubmit={handleSignUp}>
              <h2 className="section-title">会員登録</h2>
              <div className="soft-card-subtle">
                <p className="text-sm leading-6 text-[#406984]">
                  招待コードをご用意のうえ、順番に入力してください。
                </p>
              </div>
              <label>
                <span className="label-text">招待コード（必須）</span>
                <input
                  className="mock-input"
                  type="text"
                  placeholder="招待コードを入力"
                  value={signupInviteCode}
                  onChange={(e) => setSignupInviteCode(e.target.value)}
                  required
                />
              </label>
              <label>
                <span className="label-text">本名（公開されません）</span>
                <input
                  className="mock-input"
                  type="text"
                  placeholder="例: 渚 花子"
                  value={signupRealName}
                  onChange={(e) => setSignupRealName(e.target.value)}
                  required
                />
                <p className="mt-2 text-xs muted-text">この名前は他の利用者には表示されません。</p>
              </label>
              <label>
                <span className="label-text">メールアドレス（必須）</span>
                <input
                  className="mock-input"
                  type="email"
                  placeholder="example@mail.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                />
              </label>
              <label>
                <span className="label-text">パスワード（必須）</span>
                <input
                  className="mock-input"
                  type="password"
                  placeholder="8文字以上"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                />
              </label>
              <label>
                <span className="label-text">確認用パスワード（必須）</span>
                <input
                  className="mock-input"
                  type="password"
                  placeholder="もう一度入力してください"
                  value={signupPasswordConfirm}
                  onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                  required
                />
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#d8e7ef] bg-[#f7fbfe] px-3 py-3.5 text-[15px] leading-relaxed text-[#47687c] sm:text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-[#b8d4e8] text-[#2f6786] accent-[#2f6786]"
                  checked={agreedLegal}
                  onChange={(e) => setAgreedLegal(e.target.checked)}
                />
                <span className="min-w-0 pt-0.5">
                  <Link
                    href="/terms"
                    className="font-medium text-[#2f5f79] underline decoration-[#9fcde5] underline-offset-[3px]"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    利用規約
                  </Link>
                  <span className="text-[#5b7a8f]" aria-hidden="true">
                    ・
                  </span>
                  <Link
                    href="/privacy"
                    className="font-medium text-[#2f5f79] underline decoration-[#9fcde5] underline-offset-[3px]"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    プライバシーポリシー
                  </Link>
                  <span className="text-[#47687c]">に同意する</span>
                </span>
              </label>
              {signupMessage ? <p className="text-sm text-rose-700">{signupMessage}</p> : null}
              <button className="primary-btn mt-1" type="submit" disabled={!isSignupReady}>
                {isSignupSubmitting ? "送信中..." : "確認メールを送信する"}
              </button>
              <p className="text-[11px] muted-text">
                認証メール確認後、ログインしてプロフィール登録へ進んでください。
              </p>
            </form>
          )}
            </>
          )}
        </section>

      </main>
      {ENABLE_TEMP_DEBUG_PANEL ? (
        <aside className="fixed bottom-2 right-2 z-[90] max-w-[88vw] rounded-md bg-black/75 px-2 py-1.5 text-[10px] leading-4 text-white">
          <p>[auth-page]</p>
          <p>path: {pathname}</p>
          <p>session: {String(debugHasSession)}</p>
          <p>user: {debugUserId ?? "-"}</p>
          <p>checking: {String(isSessionChecking)}</p>
          <p>redirecting: {String(isRedirecting)}</p>
          <p>branch: {debugLastBranch}</p>
        </aside>
      ) : null}
      {(isSessionChecking || isRedirecting) ? (
        <aside className="fixed left-2 top-2 z-[100] rounded bg-black/85 px-2 py-1 text-xs text-white">
          DEBUG AUTH REAL FILE
        </aside>
      ) : null}
    </div>
  );
}
