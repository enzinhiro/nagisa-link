import Link from "next/link";

export default function ChatIndexPage() {
  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3">
          <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-blue">チャット</p>
          <h1 className="hero-title text-2xl font-semibold">一致した相手とのやり取り</h1>
          <p className="muted-text text-sm">
            チャットは「話したい」で一致した相手から始まります。進行中のやり取りは順次ここに集約していきます。
          </p>
        </header>

        <section className="soft-card flex flex-col gap-3">
          <p className="section-note">まずは「話したい」画面で一致した相手を確認してください。</p>
          <Link className="primary-btn" href="/talk">
            話したい一覧へ
          </Link>
        </section>
      </main>
    </div>
  );
}
