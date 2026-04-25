"use client";

import Link from "next/link";

export default function RulesPage() {
  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <section className="soft-card flex flex-col gap-3.5 text-sm leading-relaxed text-[#365f78]">
          <h1 className="text-xl font-semibold leading-snug tracking-tight text-[#2a4a5f]">
            安心して使うためのご案内
          </h1>
          <div>
            <h2 className="section-title mb-2">このサービスの使い方で大事なこと</h2>
            <ul className="list-disc pl-5 text-sm leading-6 text-[#365f78]">
              <li>気になる相手がいたら「話したい」を送れます。</li>
              <li>相手も「話したい」を返すと、チャットを始められます。</li>
              <li>チャットは期間限定です。時間が来ると自動で終了します。</li>
              <li>個人情報の共有は慎重に進めてください。</li>
              <li>困ったときは、チャット内の「運営に知らせる」をご利用ください。</li>
            </ul>
          </div>
        </section>

        <Link href="/" className="text-center text-sm muted-text underline underline-offset-3">
          ホームに戻る
        </Link>
      </main>
    </div>
  );
}
