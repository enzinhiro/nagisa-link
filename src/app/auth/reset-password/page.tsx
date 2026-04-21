"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("再設定メールを送信しました。メールをご確認ください。");
  };

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3">
          <h1 className="hero-title text-2xl font-semibold">パスワード再設定</h1>
          <p className="muted-text text-sm leading-6">
            登録済みメールアドレスに再設定用メールを送信します。
          </p>
        </header>

        <section className="soft-card">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <label>
              <span className="label-text">メールアドレス</span>
              <input
                className="mock-input"
                type="email"
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            {message && <p className="text-sm text-[#3f6680]">{message}</p>}
            <button className="primary-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "送信中..." : "送信する"}
            </button>
          </form>
        </section>

        <Link href="/auth" className="text-center text-sm muted-text underline underline-offset-3">
          ログイン・会員登録に戻る
        </Link>
      </main>
    </div>
  );
}
