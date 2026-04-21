import Link from "next/link";

export default function AuthPage() {
  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3">
          <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-pink">
            安心してご利用いただくために
          </p>
          <h1 className="hero-title text-2xl font-semibold">ログイン・会員登録</h1>
          <p className="muted-text text-sm leading-6">
            渚リンクは地域限定・匿名のサービスです。<br />
            お手続きは数分で完了します。
          </p>
        </header>

        <section className="soft-card flex flex-col gap-4">
          <h2 className="section-title">ログイン</h2>
          <label>
            <span className="label-text">メールアドレス</span>
            <input className="mock-input" type="email" placeholder="example@mail.com" />
          </label>
          <label>
            <span className="label-text">パスワード</span>
            <input className="mock-input" type="password" placeholder="8文字以上" />
          </label>
          <Link className="primary-btn" href="/onboarding/profile">
            ログインして進む（モック遷移）
          </Link>
        </section>

        <section className="soft-card flex flex-col gap-4">
          <h2 className="section-title">会員登録</h2>
          <div className="soft-card-subtle">
            <p className="text-sm leading-6 text-[#406984]">
              招待コードをお持ちの方のみ登録できます。
            </p>
          </div>
          <label>
            <span className="label-text">招待コード</span>
            <input className="mock-input" type="text" placeholder="招待コードを入力" />
          </label>
          <label>
            <span className="label-text">メールアドレス</span>
            <input className="mock-input" type="email" placeholder="example@mail.com" />
          </label>
          <label>
            <span className="label-text">パスワード</span>
            <input className="mock-input" type="password" placeholder="8文字以上" />
          </label>
          <label className="inline-flex items-start gap-2 text-sm text-[#47687c]">
            <input type="checkbox" className="mt-1" />
            <span>利用規約に同意する</span>
          </label>
          <label className="inline-flex items-start gap-2 text-sm text-[#47687c]">
            <input type="checkbox" className="mt-1" />
            <span>プライバシーポリシーに同意する</span>
          </label>
          <Link className="primary-btn" href="/onboarding/profile">
            会員登録してプロフィールへ進む
          </Link>
          <p className="text-[11px] muted-text">※ 画面は現在モック表示です。</p>
        </section>

        <Link href="/" className="text-center text-sm muted-text underline underline-offset-3">
          トップに戻る
        </Link>
      </main>
    </div>
  );
}
