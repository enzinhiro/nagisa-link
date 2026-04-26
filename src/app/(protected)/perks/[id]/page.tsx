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
        <section className="soft-card flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/perks"
              className="inline-flex h-9 items-center rounded-full border border-[#d7e7ef] bg-white px-3 text-sm text-[#47687c]"
            >
              ← 戻る
            </Link>
            <h1 className="section-title text-[18px]">地元特典チケット</h1>
          </div>
        </section>

        <section className="rounded-[22px] border border-[#efdbe5] bg-white p-4 shadow-[0_10px_24px_rgba(83,114,136,0.1)]">
          <div className="rounded-[18px] border border-[#f0d9e6] bg-gradient-to-b from-[#fff9fc] via-[#fffefe] to-[#f8fdff] p-4">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#f0d5e2] bg-[#fff2f8] text-2xl">
                {perk.icon}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-[#315970]">{perk.title}</h2>
                <p className="mt-1 text-xs text-[#698293]">{perk.address}</p>
              </div>
            </div>

            <p className="mt-4 text-[11px] font-semibold tracking-wide text-[#7e93a2]">特典内容</p>
            <p className="mt-1 rounded-xl border border-[#f2dce8] bg-[#fff6fa] px-3 py-2.5 text-base font-semibold text-[#5e4760]">
              {perk.benefit}
            </p>

            {perk.links.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#3f7aa0]">
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
            ) : null}

            <div className="mt-4 rounded-xl border border-[#e2edf3] bg-[#f8fcff] px-3 py-2.5">
              <p className="text-xs font-semibold text-[#4f7388]">利用条件</p>
              <ul className="mt-1.5 list-disc pl-4 text-xs leading-relaxed text-[#5f7b8d]">
                {perk.conditions.map((condition) => (
                  <li key={condition}>{condition}</li>
                ))}
              </ul>
            </div>

            <p className="mt-3 inline-flex rounded-full border border-[#f2d6e3] bg-[#fff2f8] px-2.5 py-1 text-[11px] text-[#7e5267]">
              NAGISA Link会員限定
            </p>
          </div>
        </section>

        <section className="soft-card-subtle">
          <p className="text-sm text-[#466579]">この画面をお店で提示してください。</p>
          <p className="mt-1 text-xs muted-text">内容は変更になる場合があります。</p>
        </section>
      </main>
    </div>
  );
}
