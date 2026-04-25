import Link from "next/link";

export default function OperatorPage() {
  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <section className="soft-card flex flex-col gap-3.5 text-sm leading-relaxed text-[#365f78]">
          <h1 className="text-xl font-semibold leading-snug tracking-tight text-[#2a4a5f]">
            運営元
          </h1>

          <div className="flex flex-col gap-3">
            <div>
              <p className="label-text mb-0.5">事業名</p>
              <p>ENZIN - 縁人 -</p>
            </div>
            <div>
              <p className="label-text mb-0.5">代表者</p>
              <p>五十嵐 寛記</p>
            </div>
            <div>
              <p className="label-text mb-0.5">所在地</p>
              <p className="whitespace-pre-line">
                〒104-0061{"\n"}
                東京都中央区銀座1丁目12番4号 N&E BLD.6F
              </p>
            </div>
            <div>
              <p className="label-text mb-0.5">事業内容</p>
              <p>コミュニティ運営、イベント企画、採用支援、アプリ開発支援</p>
            </div>
            <div>
              <p className="label-text mb-0.5">メールアドレス</p>
              <p>
                <a
                  href="mailto:info@enzin-link.jp"
                  className="text-[#3f7aa0] underline underline-offset-2 decoration-[#9fcde5]"
                >
                  info@enzin-link.jp
                </a>
              </p>
            </div>
          </div>
        </section>

        <p className="text-center">
          <Link
            href="/auth"
            className="text-sm text-[#3f7aa0] underline underline-offset-2 decoration-[#9fcde5]"
          >
            ログイン・新規登録へ戻る
          </Link>
        </p>
      </main>
    </div>
  );
}
