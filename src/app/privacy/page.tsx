import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3">
          <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-blue">ルール</p>
          <h1 className="hero-title text-2xl font-semibold">プライバシーポリシー</h1>
          <p className="muted-text text-sm">個人情報の取り扱いに関する基本方針です。</p>
        </header>

        <section className="soft-card flex flex-col gap-3">
          <h2 className="section-title">取得する情報</h2>
          <p className="muted-text text-sm leading-6">
            アカウント情報、プロフィール情報、やり取りに必要な利用情報、通報時に必要な情報を取得します。
          </p>
        </section>

        <section className="soft-card flex flex-col gap-3">
          <h2 className="section-title">利用目的</h2>
          <p className="muted-text text-sm leading-6">
            サービス提供、本人確認、安全管理、不正利用防止、通報対応、運営改善のために利用します。
          </p>
        </section>

        <section className="soft-card flex flex-col gap-3">
          <h2 className="section-title">チャット確認について</h2>
          <ul className="muted-text text-sm leading-6 list-disc pl-5 space-y-1">
            <li>通常のチャット内容は、運営が通常確認することはありません。</li>
            <li>通報時や安全管理上必要な場合に限り、対象チャットを確認することがあります。</li>
          </ul>
        </section>

        <section className="soft-card flex flex-col gap-3">
          <h2 className="section-title">保存期間の考え方</h2>
          <p className="muted-text text-sm leading-6">
            情報は利用目的に必要な期間のみ保持し、期間経過後は順次削除または適切な方法で管理します。
          </p>
        </section>

        <Link href="/auth" className="text-center text-sm muted-text underline underline-offset-3">
          ログイン・会員登録に戻る
        </Link>
      </main>
    </div>
  );
}
