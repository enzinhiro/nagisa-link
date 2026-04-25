"use client";

import Link from "next/link";

export default function RulesPage() {
  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <section className="soft-card flex flex-col gap-3.5 text-sm leading-relaxed text-[#365f78]">
          <h1 className="text-xl font-semibold leading-snug tracking-tight text-[#2a4a5f]">
            渚リンクの使い方
          </h1>
          <p className="muted-text text-sm">はじめて使う方に向けた、かんたんな案内です。</p>

          <div className="flex flex-col gap-4">
            <div>
              <h2 className="section-title mb-1.5">ホーム</h2>
              <ul className="list-disc pl-5 text-sm leading-6 text-[#365f78]">
                <li>通知やお知らせが表示されます。</li>
                <li>新しく届いた「話したい」や、進行中のチャットを確認できます。</li>
              </ul>
            </div>

            <div>
              <h2 className="section-title mb-1.5">さがす</h2>
              <ul className="list-disc pl-5 text-sm leading-6 text-[#365f78]">
                <li>ママを検索できます。</li>
                <li>カテゴリ検索、地域検索、フリーワード検索ができます。</li>
                <li>話してみたいママがいたら、詳細画面から「話したい」ボタンを押してください。</li>
              </ul>
            </div>

            <div>
              <h2 className="section-title mb-1.5">話したい</h2>
              <ul className="list-disc pl-5 text-sm leading-6 text-[#365f78]">
                <li>自分が送ったリクエストや、相手から届いたリクエストを確認できます。</li>
                <li>お互いに「話したい」になった相手とは、チャットを始められます。</li>
              </ul>
            </div>

            <div>
              <h2 className="section-title mb-1.5">チャット</h2>
              <ul className="list-disc pl-5 text-sm leading-6 text-[#365f78]">
                <li>成立すると、24時間限定の1対1チャットが始まります。</li>
                <li>お互いに合意した場合は、最大72時間まで延長できます。</li>
              </ul>
            </div>

            <div>
              <h2 className="section-title mb-1.5">気をつけること</h2>
              <ul className="list-disc pl-5 text-sm leading-6 text-[#365f78]">
                <li>チャット内で個人情報を共有する場合は、慎重に進めてください。</li>
                <li>困ったときは、チャット内の「運営に知らせる」を使ってください。</li>
              </ul>
            </div>
          </div>
        </section>

        <Link href="/" className="text-center text-sm muted-text underline underline-offset-3">
          ホームに戻る
        </Link>
      </main>
    </div>
  );
}
