import Link from "next/link";
import { notFound } from "next/navigation";
import { getPerkById } from "../../../../lib/perks";

type PerkDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PerkDetailPage({ params }: PerkDetailPageProps) {
  const { id } = await params;
  const perk = getPerkById(id);

  if (!perk) {
    notFound();
  }

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="flex items-center gap-3 px-1 pt-1">
          <Link
            href="/perks"
            className="inline-flex h-9 items-center rounded-full border border-[#d7e7ef] bg-white px-3 text-sm text-[#47687c]"
          >
            ← 戻る
          </Link>
          <h1 className="section-title text-[18px]">地元特典チケット</h1>
        </header>

        <section className="perk-feature-card px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#f0d5e2] bg-[#fff2f8] text-2xl">
              {perk.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-[#315970]">{perk.title}</h2>
                <span className="rounded-full border border-[#d9e9f2] bg-[#f3fbff] px-2 py-0.5 text-[11px] text-[#4a6e83]">
                  {perk.area}
                </span>
            </div>
              <p className="mt-1 text-xs text-[#698293]">{perk.address}</p>
            </div>
          </div>

          <div className="card-divider my-4" />

          <p className="text-[11px] font-semibold tracking-wide text-[#7e93a2]">特典内容</p>
          <p className="perk-benefit-strip mt-1 text-base font-semibold text-[#5e4760]">
            {perk.benefit}
          </p>

          {perk.links.length > 0 ? (
            <>
              <p className="mt-3 text-[11px] font-semibold tracking-wide text-[#7e93a2]">関連リンク</p>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#3f7aa0]">
                {perk.links.map((link) => (
                  <a
                    key={`${perk.id}-${link.label}`}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-[#9fcde5] underline-offset-2"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </>
          ) : null}

          <p className="mt-3 text-[11px] font-semibold tracking-wide text-[#7e93a2]">利用条件</p>
          <ul className="mt-1 list-disc pl-4 text-xs leading-relaxed text-[#5f7b8d]">
            {perk.conditions.map((condition) => (
              <li key={condition}>{condition}</li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="inline-flex rounded-full border border-[#f2d6e3] bg-[#fff2f8] px-2.5 py-1 text-[11px] text-[#7e5267]">
              NAGISA Link会員限定
            </p>
            <p className="text-[11px] text-[#6f8797]">この画面をお店で提示してください。</p>
          </div>
          <p className="mt-1 text-[11px] text-[#7a8f9e]">内容は変更になる場合があります。</p>
        </section>
      </main>
    </div>
  );
}
