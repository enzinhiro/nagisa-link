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
] as const;

export type PerkArea = (typeof PERK_AREAS)[number];
export type PerkCategory = (typeof PERK_CATEGORIES)[number];

export type PerkLink = {
  label: "公式サイト" | "Instagram" | "予約";
  url: string;
};

export type Perk = {
  id: string;
  title: string;
  area: Exclude<PerkArea, "すべて">;
  address: string;
  categories: PerkCategory[];
  benefit: string;
  description: string;
  conditions: string[];
  icon: string;
  links: PerkLink[];
};

export const PERKS: Perk[] = [
  {
    id: "tanagokoro-zushi-hayama",
    title: "たなごころ整心整体院　逗子葉山店",
    area: "逗子",
    address: "逗子市逗子1-7-8 1F右",
    categories: ["からだ・整体"],
    benefit: "NAGISA Link会員は施術料金5%オフ",
    description:
      "心身のつらさを整えて、リフレッシュしたいママにおすすめの整体院です。逗子・葉山エリアで、からだのケアをしたい方はぜひお試しください。",
    conditions: ["予約時にNAGISA Linkの特典画面を提示"],
    icon: "🧘",
    links: [
      { label: "公式サイト", url: "https://tanagokoro-zushi.com/" },
    ],
  },
];

export const getPerkById = (id: string) => PERKS.find((perk) => perk.id === id);
