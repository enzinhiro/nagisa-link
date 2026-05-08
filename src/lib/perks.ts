export const PERK_AREAS = ["すべて", "逗子", "葉山", "横須賀"] as const;

export const PERK_CATEGORIES = [
  "ランチ・カフェ",
  "ディナー",
  "親子で行ける",
  "一人時間におすすめ",
  "習い事・体験",
  "美容・ケア",
  "からだ・整体",
  "暮らし・相談",
  "イベント",
  "雨の日OK",
  "初回体験",
  "予約制",
  "その他",
] as const;

export type PerkArea = (typeof PERK_AREAS)[number];
export type PerkCategory = (typeof PERK_CATEGORIES)[number];

export type PerkRecord = {
  id: string;
  slug: string;
  name: string;
  area: Exclude<PerkArea, "すべて">;
  address: string | null;
  categories: PerkCategory[];
  benefit: string;
  description: string | null;
  website_url: string | null;
  usage_text: string;
  condition_text: string | null;
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};
