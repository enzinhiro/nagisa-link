import Link from "next/link";
import { SERVICE_NAME } from "../../lib/brand";

export default function OperatorPage() {
  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3">
          <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-blue">運営情報</p>
          <h1 className="hero-title text-2xl font-semibold">運営元</h1>
          <p className="muted-text text-sm">
            {SERVICE_NAME} の運営に関する公開情報です。
          </p>
        </header>

        <section className="soft-card flex flex-col gap-4 text-sm leading-relaxed text-[#365f78]">
          <div>
            <p className="label-text mb-1">事業名</p>
            <p>ENZIN - 縁人 -</p>
          </div>
          <div>
            <p className="label-text mb-1">代表者</p>
            <p>五十嵐 寛記</p>
          </div>
          <div>
            <p className="label-text mb-1">所在地</p>
            <p className="whitespace-pre-line">
              〒104-0061{"\n"}
              東京都中央区銀座1丁目12番4号 N&E BLD.6F
            </p>
          </div>
          <div>
            <p className="label-text mb-1">事業内容</p>
            <p>コミュニティ運営、イベント企画、人材採用支援、アプリ開発支援</p>
          </div>
          <div>
            <p className="label-text mb-1">メールアドレス</p>
            <p>
              <a
                href="mailto:info@enzin-link.jp"
                className="text-[#3f7aa0] underline underline-offset-2 decoration-[#9fcde5]"
              >
                info@enzin-link.jp
              </a>
            </p>
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
