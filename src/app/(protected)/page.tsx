import Link from "next/link";

export default function Home() {
  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <section className="soft-card flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-blue">
              地域限定
            </p>
            <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-blue">
              匿名
            </p>
            <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-blue">
              完全招待制
            </p>
          </div>
          <div>
            <h1 className="hero-title text-[28px] font-semibold leading-10">渚リンク</h1>
            <p className="mt-3 muted-text text-[15px] leading-7">
              地元で、近い想いをもつ家庭と。<br />
              やさしく、静かにつながるための場所です。
            </p>
          </div>
          <div className="soft-card-subtle">
            <p className="text-sm leading-6 text-[#3f6680]">
              まずは匿名で、安心できる距離感から。<br />
              プロフィール登録後に利用を開始できます。
            </p>
          </div>
        </section>

        <section className="soft-card flex flex-col gap-4">
          <h2 className="section-title">はじめる</h2>
          <p className="muted-text text-sm">
            プロフィール完了後は、さがす画面から近い相手を探せます。
          </p>
          <div className="soft-card-subtle">
            <p className="section-note">地域・年齢帯・好きなことタグで最小絞り込みができます。</p>
          </div>
          <Link className="primary-btn" href="/search">
            さがす画面へ
          </Link>
          <Link className="secondary-btn" href="/talk">
            話したい一覧を見る
          </Link>
        </section>

        <section className="soft-card flex flex-col gap-3">
          <h2 className="section-title">登録の流れ</h2>
          <ol className="muted-text list-decimal space-y-1.5 pl-5 text-sm leading-6">
            <li>招待コード、メールアドレス、パスワードを入力</li>
            <li>確認メールでメール認証を完了</li>
            <li>初回ログイン後にプロフィールを3ステップで登録</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
