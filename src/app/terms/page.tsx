import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <section className="soft-card flex flex-col gap-5 text-sm leading-relaxed text-[#365f78]">
          <h1 className="text-xl font-semibold leading-snug tracking-tight text-[#2a4a5f]">
            利用規約
          </h1>

          <div className="flex flex-col gap-5">
            <div>
              <h2 className="section-title mb-2">サービスの性質</h2>
              <ul className="muted-text text-sm leading-6 list-disc pl-5 space-y-1">
                <li>本サービスは完全招待制のクローズドサービスです。</li>
                <li>本サービスは母親向けサービスです。</li>
              </ul>
            </div>

            <div>
              <h2 className="section-title mb-2">ご利用上のお願い</h2>
              <ul className="muted-text text-sm leading-6 list-disc pl-5 space-y-1">
                <li>利用者間トラブルは原則として当事者間で解決してください。</li>
                <li>オフライン面会、連絡先交換、やり取りは自己責任でお願いします。</li>
                <li>画像送信、URL送信、外部サービスへの誘導は禁止です。</li>
              </ul>
            </div>

            <div>
              <h2 className="section-title mb-2">責任に関する考え方</h2>
              <ul className="muted-text text-sm leading-6 list-disc pl-5 space-y-1">
                <li>
                  スクリーンショット、転載、再共有、口外、端末管理不備など運営管理外の情報流出について、運営は原則責任を負いません。
                </li>
                <li>運営の責任は、法令上許される範囲で制限されます。</li>
              </ul>
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
