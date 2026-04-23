"use client";

import Link from "next/link";

export default function RulesPage() {
  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3">
          <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-blue">ルール</p>
          <h1 className="hero-title text-2xl font-semibold">安心して使うためのご案内</h1>
        </header>

        <section className="soft-card flex flex-col gap-2.5">
          <h2 className="section-title">このサービスの使い方で大事なこと</h2>
          <ul className="list-disc pl-5 text-sm leading-6 text-[#365f78]">
            <li>個人情報の共有は慎重に進めましょう。</li>
            <li>チャットではURLや画像は送信できません。</li>
            <li>チャットは制限時間制で、時間が来ると自動的に終了します。</li>
            <li>困ったときは、チャット内の「運営に知らせる」をご利用ください。</li>
          </ul>
        </section>

        <section className="soft-card flex flex-col gap-2.5">
          <h2 className="section-title">詳しいルール</h2>
          <Link href="/terms" className="secondary-btn !h-10">
            利用規約を見る
          </Link>
          <Link href="/privacy" className="secondary-btn !h-10">
            プライバシーポリシーを見る
          </Link>
        </section>

        <Link href="/" className="text-center text-sm muted-text underline underline-offset-3">
          ホームに戻る
        </Link>
      </main>
    </div>
  );
}
