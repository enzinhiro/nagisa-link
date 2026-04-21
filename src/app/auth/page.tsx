"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

const SIGNUP_FORM_STORAGE_KEY = "nagisa-link-signup-form";
const AUTH_TAB_STORAGE_KEY = "nagisa-link-auth-tab";

export default function AuthPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupInviteCode, setSignupInviteCode] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [isSignupSubmitting, setIsSignupSubmitting] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [signupMessage, setSignupMessage] = useState("");
  const [signupMessageType, setSignupMessageType] = useState<"error" | "success">("error");

  const isSignupReady =
    signupInviteCode.trim().length > 0 &&
    signupEmail.trim().length > 0 &&
    signupPassword.length > 0 &&
    signupPasswordConfirm.length > 0 &&
    agreedTerms &&
    agreedPrivacy &&
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
        email?: string;
        password?: string;
        passwordConfirm?: string;
        agreedTerms?: boolean;
        agreedPrivacy?: boolean;
      };
      setSignupInviteCode(parsed.inviteCode ?? "");
      setSignupEmail(parsed.email ?? "");
      setSignupPassword(parsed.password ?? "");
      setSignupPasswordConfirm(parsed.passwordConfirm ?? "");
      setAgreedTerms(Boolean(parsed.agreedTerms));
      setAgreedPrivacy(Boolean(parsed.agreedPrivacy));
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
        email: signupEmail,
        password: signupPassword,
        passwordConfirm: signupPasswordConfirm,
        agreedTerms,
        agreedPrivacy,
      }),
    [
      signupInviteCode,
      signupEmail,
      signupPassword,
      signupPasswordConfirm,
      agreedTerms,
      agreedPrivacy,
    ]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(SIGNUP_FORM_STORAGE_KEY, serializedSignupState);
  }, [serializedSignupState]);

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
      setLoginMessage("ログイン状態を確認できませんでした。");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("profile_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      setLoginMessage("プロフィール状態を確認できませんでした。時間をおいてお試しください。");
      return;
    }

    if (profile?.profile_completed) {
      router.replace("/");
      return;
    }

    router.replace("/onboarding/profile");
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignupMessage("");
    setSignupMessageType("error");

    if (!signupInviteCode.trim()) {
      setSignupMessage("招待コードを入力してください。");
      return;
    }

    if (!signupEmail.trim()) {
      setSignupMessage("メールアドレスを入力してください。");
      return;
    }

    if (!signupPassword) {
      setSignupMessage("パスワードを入力してください。");
      return;
    }

    if (!agreedTerms || !agreedPrivacy) {
      setSignupMessage("利用規約とプライバシーポリシーへの同意が必要です。");
      return;
    }

    if (!signupPasswordConfirm) {
      setSignupMessage("確認用パスワードを入力してください。");
      return;
    }

    if (signupPassword !== signupPasswordConfirm) {
      setSignupMessage("確認用パスワードが一致しません。");
      return;
    }

    setIsSignupSubmitting(true);

    const normalizedInviteCode = signupInviteCode.trim().toUpperCase();
    const normalizedSignupEmail = signupEmail.trim().toLowerCase();

    // Consume first to avoid creating auth-only accounts.
    const { data: consumeSucceeded, error: consumeError } = await supabase.rpc(
      "consume_invite_code",
      {
        input_code: normalizedInviteCode,
        input_email: normalizedSignupEmail,
        input_user_id: null,
      }
    );

    if (consumeError) {
      setIsSignupSubmitting(false);
      setSignupMessage("招待コードを確認できませんでした。時間をおいてお試しください。");
      return;
    }

    if (!consumeSucceeded) {
      setIsSignupSubmitting(false);
      setSignupMessage("招待コードが正しくないか、すでに使われています。");
      return;
    }

    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined;

    const { error: signUpError } = await supabase.auth.signUp({
      email: normalizedSignupEmail,
      password: signupPassword,
      options: { emailRedirectTo: redirectTo },
    });

    if (signUpError) {
      setIsSignupSubmitting(false);
      setSignupMessage(signUpError.message);
      return;
    }

    setIsSignupSubmitting(false);
    setSignupMessageType("success");
    setSignupMessage("確認メールを送信しました。メールを確認してください。");
  };

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-2.5">
          <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-pink">
            安心してご利用いただくために
          </p>
          <h1 className="hero-title text-2xl font-semibold">ログイン・会員登録</h1>
          <p className="muted-text text-sm leading-6">
            会員登録後、メール認証を完了してからログインできます。<br />
            初回ログイン後にプロフィール登録へ進みます。
          </p>
        </header>

        <section className="soft-card flex flex-col gap-5">
          <div className="tab-shell">
            <button
              type="button"
              className={`tab-btn ${activeTab === "login" ? "tab-btn-active" : ""}`}
              onClick={() => setActiveTab("login")}
            >
              ログイン
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === "signup" ? "tab-btn-active" : ""}`}
              onClick={() => setActiveTab("signup")}
            >
              会員登録
            </button>
          </div>

          {activeTab === "login" ? (
            <form className="flex flex-col gap-3.5" onSubmit={handleLogin}>
              <h2 className="section-title">ログイン</h2>
              <p className="section-note">登録済みのメールアドレスとパスワードで続けます。</p>
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
                  招待コードは必須です。お手元にご用意のうえ入力してください。
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
              <label className="inline-flex items-start gap-2 text-sm text-[#47687c]">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                />
                <span>
                  <Link
                    href="/terms"
                    className="underline underline-offset-3"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    利用規約
                  </Link>
                  に同意する
                </span>
              </label>
              <label className="inline-flex items-start gap-2 text-sm text-[#47687c]">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={agreedPrivacy}
                  onChange={(e) => setAgreedPrivacy(e.target.checked)}
                />
                <span>
                  <Link
                    href="/privacy"
                    className="underline underline-offset-3"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    プライバシーポリシー
                  </Link>
                  に同意する
                </span>
              </label>
              {signupMessage && (
                <p className={`text-sm ${signupMessageType === "error" ? "text-rose-700" : "text-[#3f6680]"}`}>
                  {signupMessage}
                </p>
              )}
              {signupMessageType === "success" && signupMessage ? (
                <p className="text-xs muted-text">認証後、初回ログイン時にプロフィール登録へ進みます。</p>
              ) : null}
              <button className="primary-btn mt-1" type="submit" disabled={!isSignupReady}>
                {isSignupSubmitting ? "登録中..." : "会員登録する"}
              </button>
              <p className="text-[11px] muted-text">
                会員登録後に確認メールを送信します。メール認証後、初回ログインしてプロフィール登録へ進んでください。
              </p>
            </form>
          )}
        </section>

        <Link href="/" className="text-center text-sm muted-text underline underline-offset-3">
          トップに戻る
        </Link>
      </main>
    </div>
  );
}
