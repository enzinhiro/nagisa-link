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
    id: "umibe-cafe-nagisa",
    title: "海辺カフェ なぎさ",
    area: "逗子",
    address: "逗子市逗子1-2-3",
    categories: ["ランチ・カフェ", "親子で行ける", "一人時間におすすめ"],
    benefit: "会員証提示でドリンク100円OFF",
    description: "海風の気持ちいいテラス席で、親子でも一人でも過ごしやすいカフェです。",
    conditions: ["会計前にこの画面をご提示ください。", "他サービスとの併用はできません。"],
    icon: "☕",
    links: [
      { label: "公式サイト", url: "https://example.com" },
      { label: "Instagram", url: "https://instagram.com" },
    ],
  },
  {
    id: "hayama-oyako-studio",
    title: "葉山おやこスタジオ",
    area: "葉山",
    address: "葉山町一色2-4-5",
    categories: ["習い事・体験", "親子で行ける", "初回体験"],
    benefit: "体験レッスン1回無料",
    description: "親子で楽しめる少人数レッスン。はじめての方も参加しやすい雰囲気です。",
    conditions: ["初回利用の方が対象です。", "事前予約のうえご来店ください。"],
    icon: "🎨",
    links: [{ label: "予約", url: "https://example.com" }],
  },
  {
    id: "yokosuka-seitai-care",
    title: "よこすか整体ケア",
    area: "横須賀",
    address: "横須賀市若松町3-1-8",
    categories: ["からだ・整体", "美容・ケア", "一人時間におすすめ"],
    benefit: "初回施術500円OFF",
    description: "疲れやすい肩・腰まわりを丁寧にケア。短時間コースもあります。",
    conditions: ["初回のみ有効です。", "予約時にNAGISA Link特典利用をお伝えください。"],
    icon: "🫧",
    links: [
      { label: "公式サイト", url: "https://example.com" },
      { label: "Instagram", url: "https://instagram.com" },
    ],
  },
  {
    id: "zushi-kodomo-shokudo-support",
    title: "逗子こども食堂サポート",
    area: "逗子",
    address: "逗子市内",
    categories: ["親子で行ける", "暮らし・相談", "イベント"],
    benefit: "初回参加時に小さなおみやげ",
    description: "地域で子育てを支えるコミュニティ。見学参加も歓迎しています。",
    conditions: ["開催日程は公式サイトをご確認ください。", "対象年齢や同伴条件は会場ごとに異なります。"],
    icon: "🎁",
    links: [{ label: "公式サイト", url: "https://example.com" }],
  },
  {
    id: "hayama-relax-salon",
    title: "葉山リラックスサロン",
    area: "葉山",
    address: "葉山町堀内",
    categories: ["美容・ケア", "一人時間におすすめ", "予約制"],
    benefit: "初回カウンセリング無料",
    description: "海沿いの落ち着いた空間で、からだと気分を整えるプライベートケア。",
    conditions: ["女性会員限定メニューです。", "予約時間の5分前までにご来店ください。"],
    icon: "🌿",
    links: [
      { label: "Instagram", url: "https://instagram.com" },
      { label: "予約", url: "https://example.com" },
    ],
  },
];

export const getPerkById = (id: string) => PERKS.find((perk) => perk.id === id);
