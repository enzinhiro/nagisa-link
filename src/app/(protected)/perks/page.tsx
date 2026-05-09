"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase/client";
import { PERK_AREAS, PERK_CATEGORIES, type PerkArea, type PerkCategory, type PerkRecord } from "../../../lib/perks";

export default function PerksPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [perks, setPerks] = useState<PerkRecord[]>([]);
  const [query, setQuery] = useState("");
  const [area, setArea] = useState<PerkArea>("すべて");
  const [selectedCategories, setSelectedCategories] = useState<PerkCategory[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [categoryError, setCategoryError] = useState("");

  const formatBenefit = (benefit: string) => {
    const trimmed = benefit.trim();
    if (trimmed.startsWith("NAGISA Link会員は")) {
      return `会員特典：${trimmed.replace("NAGISA Link会員は", "")}`;
    }
    if (trimmed.startsWith("会員特典：")) return trimmed;
    return `会員特典：${trimmed}`;
  };

  useEffect(() => {
    const fetchPerks = async () => {
      setLoading(true);
      setMessage("");
      const { data, error } = await supabase
        .from("perks")
        .select(
          "id,slug,name,area,address,categories,benefit,description,website_url,usage_text,condition_text,is_published,display_order,created_at,updated_at"
        )
        .eq("is_published", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        setMessage("地元特典の読み込みに失敗しました。時間をおいて再度お試しください。");
        setPerks([]);
        setLoading(false);
        return;
      }

      setPerks((data ?? []) as PerkRecord[]);
      setLoading(false);
    };

    void fetchPerks();
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return perks.filter((perk) => {
      const areaMatch = area === "すべて" || perk.area === area;
      const categoryMatch =
        selectedCategories.length === 0 || selectedCategories.every((category) => perk.categories.includes(category));
      const textTarget = [perk.name, perk.area, perk.address ?? "", perk.benefit, perk.categories.join(" ")]
        .join(" ")
        .toLowerCase();
      const searchMatch = normalizedQuery.length === 0 || textTarget.includes(normalizedQuery);
      return areaMatch && categoryMatch && searchMatch;
    });
  }, [area, perks, query, selectedCategories]);

  const toggleCategory = (category: PerkCategory) => {
    setSelectedCategories((current) => {
      if (current.includes(category)) {
        setCategoryError("");
        return current.filter((item) => item !== category);
      }
      if (current.length >= 3) {
        setCategoryError("カテゴリーは最大3つまでです。");
        return current;
      }
      setCategoryError("");
      return [...current, category];
    });
  };

  const resetConditions = () => {
    setQuery("");
    setArea("すべて");
    setSelectedCategories([]);
    setCategoryError("");
  };

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack !gap-2">
        <section className="flex flex-col gap-2 rounded-[14px] border border-[#e6eef5] bg-[#fcfeff] px-3 py-2.5 shadow-[0_2px_10px_rgba(102,119,137,0.05)]">
          <div className="flex flex-col gap-2">
            <label className="block">
              <span className="sr-only">地元特典を検索</span>
              <input
                type="search"
                className="mock-input !h-10"
                placeholder="店名・エリア・カテゴリーで検索"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button
              type="button"
              aria-expanded={isDetailOpen}
              onClick={() => {
                setIsDetailOpen((current) => !current);
                setCategoryError("");
              }}
              className="secondary-btn !h-10 w-full sm:w-auto sm:self-start"
            >
              {isDetailOpen ? "条件を閉じる" : "詳細条件"}
            </button>
          </div>

          {area !== "すべて" || selectedCategories.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {area !== "すべて" ? (
                <button
                  type="button"
                  onClick={() => setArea("すべて")}
                  className="inline-flex items-center gap-1 rounded-full border border-[#d9e9f2] bg-[#f3fbff] px-2.5 py-1 text-[11px] text-[#4a6e83]"
                >
                  {area} <span aria-hidden>×</span>
                </button>
              ) : null}
              {selectedCategories.map((category) => (
                <button
                  key={`chip-${category}`}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="inline-flex items-center gap-1 rounded-full border border-[#efc9da] bg-[#ffeef6] px-2.5 py-1 text-[11px] text-[#7d4d64]"
                >
                  {category} <span aria-hidden>×</span>
                </button>
              ))}
            </div>
          ) : null}

          {isDetailOpen ? (
            <section className="flex flex-col gap-3 border-t border-[#dbe8f0] pt-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#4b6f84]">エリア</p>
                <button
                  type="button"
                  onClick={resetConditions}
                  className="text-[11px] font-medium text-[#3f7aa0] underline underline-offset-2"
                >
                  条件をリセット
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
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

              <p className="mt-3 text-xs font-semibold text-[#4b6f84]">カテゴリー</p>
              <p className="mt-1 text-[11px] text-[#6f8797]">カテゴリーは最大3つまで選択できます。</p>
              {categoryError ? <p className="mt-1 text-[11px] text-rose-700">{categoryError}</p> : null}
              <div className="mt-2 flex flex-wrap gap-2">
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
          ) : null}
        </section>

        {loading ? (
          <section className="soft-card">
            <p className="muted-text text-sm">地元特典を読み込んでいます...</p>
          </section>
        ) : message ? (
          <section className="soft-card">
            <p className="text-sm text-rose-700">{message}</p>
          </section>
        ) : filtered.length === 0 ? (
          <section className="empty-state-card">
            <p className="text-sm text-[#44657a]">条件に合う特典がまだありません。</p>
            <p className="mt-1 text-xs muted-text">条件を変えてお試しください。</p>
          </section>
        ) : (
          <section className="screen-stack">
            {filtered.map((perk) => (
              <article
                key={perk.id}
                className="soft-card !rounded-[18px] !px-4 !py-3.5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-[#315970]">{perk.name}</h2>
                    <span className="rounded-full border border-[#d9e9f2] bg-[#f3fbff] px-2 py-0.5 text-[11px] text-[#4a6e83]">
                      {perk.area}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#688194]">{perk.address ?? "住所情報は準備中です。"}</p>
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

                <p className="perk-benefit-strip mt-3 text-sm font-semibold text-[#5f4860]">
                  {formatBenefit(perk.benefit)}
                </p>

                <Link
                  href={`/perks/${perk.slug}`}
                  className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-[#d8e7ef] bg-[#f7fbfe] px-4 text-xs font-semibold text-[#3c6d88]"
                >
                  会員特典を見る
                </Link>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
