import Link from "next/link";
import { notFound } from "next/navigation";
import { getPerkById } from "../../../../lib/perks";

type PerkDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PerkDetailPage({ params }: PerkDetailPageProps) {
  const { id } = await params;
  const perk = getPerkById(id);
  const officialSiteLink = perk?.links.find((link) => link.label === "公式サイト");

  if (!perk) {
    notFound();
  }

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="px-1 pt-1">
          <h1 className="section-title text-[18px]">地元特典チケット</h1>
        </header>

        <section className="perk-feature-card !rounded-[14px] px-4 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-[#315970]">{perk.title}</h2>
              <span className="rounded-full border border-[#d9e9f2] bg-[#f3fbff] px-2 py-0.5 text-[11px] text-[#4a6e83]">
                {perk.area}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#698293]">{perk.address}</p>
          </div>

          <div className="card-divider my-4" />

          <p className="text-[11px] font-semibold tracking-wide text-[#7e93a2]">特典内容</p>
          <p className="perk-benefit-strip mt-1 text-base font-semibold text-[#5e4760]">
            {perk.benefit}
          </p>

          <p className="mt-3 text-sm leading-relaxed text-[#5f7b8d]">
            心身の辛さを解消してリフレッシュできますのでお試しくださいね。
          </p>

          {officialSiteLink ? (
            <>
              <div className="mt-3">
                <a
                  href={officialSiteLink.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center justify-center rounded-full border border-[#d8e7ef] bg-[#f7fbfe] px-4 text-xs font-semibold text-[#3c6d88]"
                >
                  公式サイトを見る
                </a>
              </div>
            </>
          ) : null}

          <div className="card-divider my-4" />
          <p className="text-[11px] font-semibold tracking-wide text-[#7e93a2]">使い方</p>
          <ol className="mt-2 flex flex-col gap-1.5 text-sm text-[#4e6f83]">
            <li>1. お店でこの画面を開く</li>
            <li>2. スタッフに提示する</li>
            <li>3. 特典を利用する</li>
          </ol>
          <p className="mt-2 text-[11px] text-[#6f8797]">予約時にNAGISA Linkの特典画面を提示</p>
          <ul className="mt-1 list-disc pl-4 text-xs leading-relaxed text-[#5f7b8d]">
            {perk.conditions.map((condition) => (
              <li key={condition}>{condition}</li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#e8edf2] pt-3">
            <p className="inline-flex rounded-full border border-[#f2d6e3] bg-[#fff2f8] px-2.5 py-1 text-[11px] text-[#7e5267]">
              NAGISA Link会員限定
            </p>
            <p className="text-[11px] text-[#6f8797]">内容は変更になる場合があります。</p>
          </div>
        </section>
      </main>
    </div>
  );
}
