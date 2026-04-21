"use client";

import Link from "next/link";

export default function RulesPage() {
  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3">
          <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-blue">ルール</p>
          <h1 className="hero-title text-2xl font-semibold">安心して使うためのご案内</h1>
          <p className="muted-text text-sm">日々のやり取りで大切なポイントを短くまとめています。</p>
        </header>

        <section className="soft-card flex flex-col gap-2.5">
          <h2 className="section-title">このサービスの使い方で大事なこと</h2>
          <ul className="list-disc pl-5 text-sm leading-6 text-[#365f78]">
            <li>個人情報の共有は慎重に進めましょう。</li>
            <li>チャットではURL送信はできません。</li>
            <li>必要な場合のみ、運営が内容を確認することがあります。</li>
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
      </main>
    </div>
  );
}
