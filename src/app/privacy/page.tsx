import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <section className="soft-card flex flex-col gap-5 text-sm leading-relaxed text-[#365f78]">
          <h1 className="text-xl font-semibold leading-snug tracking-tight text-[#2a4a5f]">
            プライバシーポリシー
          </h1>

          <div className="flex flex-col gap-5">
            <div>
              <h2 className="section-title mb-2">取得する情報</h2>
              <p className="muted-text text-sm leading-6">
                アカウント情報、プロフィール情報、やり取りに必要な利用情報、通報時に必要な情報を取得します。
              </p>
            </div>

            <div>
              <h2 className="section-title mb-2">利用目的</h2>
              <p className="muted-text text-sm leading-6">
                サービス提供、本人確認、安全管理、不正利用防止、通報対応、運営改善のために利用します。
              </p>
            </div>

            <div>
              <h2 className="section-title mb-2">チャット確認について</h2>
              <ul className="muted-text text-sm leading-6 list-disc pl-5 space-y-1">
                <li>通常のチャット内容は、運営が通常確認することはありません。</li>
                <li>通報時や安全管理上必要な場合に限り、対象チャットを確認することがあります。</li>
              </ul>
            </div>

            <div>
              <h2 className="section-title mb-2">保存期間の考え方</h2>
              <p className="muted-text text-sm leading-6">
                情報は利用目的に必要な期間のみ保持し、期間経過後は順次削除または適切な方法で管理します。
              </p>
            </div>
          </div>
        </section>

        <Link href="/auth" className="text-center text-sm muted-text underline underline-offset-3">
          ログイン・会員登録に戻る
        </Link>
      </main>
    </div>
  );
}
