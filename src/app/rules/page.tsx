"use client";

import Link from "next/link";

export default function RulesPage() {
  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <section className="soft-card flex flex-col gap-3.5 text-sm leading-relaxed text-[#365f78]">
          <h1 className="text-xl font-semibold leading-snug tracking-tight text-[#2a4a5f]">
            NAGISA Linkの使い方
          </h1>

          <section className="rounded-2xl border border-[#f2d9e7] bg-[#fff7fb] px-4 py-3">
            <h2 className="section-title mb-1.5">安心して使えるための工夫</h2>
            <ul className="list-disc pl-5 text-sm leading-6 text-[#365f78]">
              <li>本名・メールアドレスは利用者には表示されません。</li>
              <li>プロフィールやチャットにURL・外部リンクは入力できません。</li>
              <li>画像やファイルの送信はできません。</li>
              <li>相互に「話したい」になった相手とだけチャットできます。</li>
              <li>チャットは24時間限定で始まり、最大72時間で終了します。</li>
              <li>困ったときは、チャット内から運営に知らせることができます。</li>
            </ul>
          </section>

          <div className="flex flex-col gap-3.5">
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
