"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PERK_AREAS, PERK_CATEGORIES, PERKS, type PerkArea, type PerkCategory } from "../../../lib/perks";

export default function PerksPage() {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState<PerkArea>("すべて");
  const [selectedCategories, setSelectedCategories] = useState<PerkCategory[]>([]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return PERKS.filter((perk) => {
      const areaMatch = area === "すべて" || perk.area === area;
      const categoryMatch =
        selectedCategories.length === 0 || selectedCategories.every((category) => perk.categories.includes(category));
      const textTarget = [perk.title, perk.area, perk.address, perk.benefit, perk.categories.join(" ")].join(" ").toLowerCase();
      const searchMatch = normalizedQuery.length === 0 || textTarget.includes(normalizedQuery);
      return areaMatch && categoryMatch && searchMatch;
    });
  }, [area, query, selectedCategories]);

  const toggleCategory = (category: PerkCategory) => {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category]
    );
  };

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <section className="soft-card flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-9 items-center rounded-full border border-[#d7e7ef] bg-white px-3 text-sm text-[#47687c]"
            >
              ← 戻る
            </Link>
            <div className="min-w-0">
              <h1 className="section-title text-[18px]">地元特典</h1>
              <p className="section-note">会員向けのシンプルな特典チケット</p>
            </div>
          </div>
          <label className="block">
            <span className="sr-only">地元特典を検索</span>
            <input
              type="search"
              className="mock-input"
              placeholder="店名・エリア・カテゴリーで検索"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {PERK_AREAS.map((item) => {
              const active = area === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setArea(item)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "border-[#f0cddd] bg-[#fff0f6] text-[#7c4f64]"
                      : "border-[#d8e7ef] bg-white text-[#4e6d80]"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            {PERK_CATEGORIES.map((category) => {
              const active = selectedCategories.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    active
                      ? "border-[#efc9da] bg-[#ffeef6] text-[#7e4d65]"
                      : "border-[#d8e7ef] bg-white text-[#4f6f84]"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </section>

        {filtered.length === 0 ? (
          <section className="soft-card-subtle">
            <p className="text-sm text-[#44657a]">条件に合う特典がまだありません。</p>
            <p className="mt-1 text-xs muted-text">条件を変えてお試しください。</p>
          </section>
        ) : (
          <section className="screen-stack">
            {filtered.map((perk) => (
              <article
                key={perk.id}
                className="rounded-[20px] border border-[#f0dee7] bg-white px-4 py-3.5 shadow-[0_8px_18px_rgba(87,118,142,0.08)]"
              >
                <div className="flex items-start gap-3">
                  <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#f2d7e4] bg-[#fff5f9] text-lg">
                    {perk.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-[#315970]">{perk.title}</h2>
                      <span className="rounded-full border border-[#d9e9f2] bg-[#f3fbff] px-2 py-0.5 text-[11px] text-[#4a6e83]">
                        {perk.area}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#688194]">{perk.address}</p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {perk.categories.slice(0, 3).map((category) => (
                    <span
                      key={category}
                      className="rounded-full border border-[#e7edf2] bg-[#f9fcfe] px-2 py-1 text-[11px] text-[#547286]"
                    >
                      {category}
                    </span>
                  ))}
                </div>

                <p className="mt-3 rounded-xl border border-[#f2dce7] bg-[#fff8fb] px-3 py-2 text-sm font-medium text-[#5f4860]">
                  {perk.benefit}
                </p>

                {perk.links.length > 0 ? (
                  <div className="mt-2.5 flex flex-wrap gap-3 text-xs text-[#3f7aa0]">
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

                <Link
                  href={`/perks/${perk.id}`}
                  className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-[#d8e7ef] bg-[#f7fbfe] px-4 text-xs font-semibold text-[#3c6d88]"
                >
                  チケットを表示
                </Link>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
