"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { type PerkRecord } from "../../../../lib/perks";
import { supabase } from "../../../../lib/supabase/client";

export default function PerkDetailPage() {
  const params = useParams<{ id: string }>();
  const slug = params?.id ?? "";
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [perk, setPerk] = useState<PerkRecord | null>(null);

  useEffect(() => {
    if (!slug) return;
    const fetchPerk = async () => {
      setLoading(true);
      setMessage("");
      const { data, error } = await supabase
        .from("perks")
        .select(
          "id,slug,name,area,address,categories,benefit,description,website_url,usage_text,condition_text,is_published,display_order,created_at,updated_at"
        )
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (error) {
        setMessage("特典チケットの読み込みに失敗しました。時間をおいて再度お試しください。");
        setPerk(null);
        setLoading(false);
        return;
      }

      if (!data) {
        setMessage("この特典チケットは表示できません。");
        setPerk(null);
        setLoading(false);
        return;
      }

      setPerk(data as PerkRecord);
      setLoading(false);
    };

    void fetchPerk();
  }, [slug]);

  if (loading) {
    return (
      <div className="mock-page">
        <main className="mock-shell screen-stack">
          <section className="soft-card">
            <p className="muted-text text-sm">特典チケットを読み込んでいます...</p>
          </section>
        </main>
      </div>
    );
  }

  if (!perk) {
    return (
      <div className="mock-page">
        <main className="mock-shell screen-stack">
          <section className="soft-card">
            <p className="text-sm text-[#4d6e83]">{message || "特典チケットが見つかりませんでした。"}</p>
            <Link href="/perks" className="mt-3 inline-flex text-xs text-[#3f7aa0] underline underline-offset-2">
              地元特典一覧へ戻る
            </Link>
          </section>
        </main>
      </div>
    );
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
              <h2 className="text-base font-semibold text-[#315970]">{perk.name}</h2>
              <span className="rounded-full border border-[#d9e9f2] bg-[#f3fbff] px-2 py-0.5 text-[11px] text-[#4a6e83]">
                {perk.area}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#698293]">{perk.address ?? "住所情報は準備中です。"}</p>
          </div>

          <div className="card-divider my-4" />

          <p className="text-[11px] font-semibold tracking-wide text-[#7e93a2]">特典内容</p>
          <p className="perk-benefit-strip mt-1 text-base font-semibold text-[#5e4760]">
            {perk.benefit}
          </p>

          {perk.description ? (
            <>
              <p className="mt-3 text-[11px] font-semibold tracking-wide text-[#7e93a2]">お店からのひとこと</p>
              <p className="mt-1 text-sm leading-relaxed text-[#5f7b8d]">{perk.description}</p>
            </>
          ) : null}

          {perk.website_url ? (
            <>
              <div className="mt-3">
                <a
                  href={perk.website_url}
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
          <p className="mt-2 text-sm text-[#4e6f83]">{perk.usage_text}</p>
          {perk.condition_text ? (
            <>
              <p className="mt-3 text-[11px] font-semibold tracking-wide text-[#7e93a2]">利用条件</p>
              <p className="mt-1 text-sm text-[#4e6f83]">{perk.condition_text}</p>
            </>
          ) : null}

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
