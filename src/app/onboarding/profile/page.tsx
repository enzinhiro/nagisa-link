import Link from "next/link";

const STEP_1_AREAS = ["逗子市", "葉山町", "横須賀市"];
const CHILD_AGE_GROUPS = [
  "未就学",
  "小学校低学年",
  "小学校高学年",
  "中学生",
  "高校生",
  "18歳以上",
];

const CHILD_GENDERS = [
  "男の子",
  "女の子",
  "どちらもいる",
  "その他 / 答えたくない",
];

const CHILD_INTEREST_TAGS = [
  "ゲーム",
  "YouTube",
  "アニメ・マンガ",
  "絵を描く",
  "工作・ものづくり",
  "電車・車",
  "動物・生き物",
  "外遊び",
  "スポーツ",
  "音楽",
  "本・読書",
  "パソコン・プログラミング",
  "料理・お菓子",
  "自然・散歩",
  "その他",
];

const CONNECTION_PREFERENCES = [
  "まずは親同士で少し話したい",
  "似た状況の家庭と情報交換したい",
  "子どもの好きなことが近い家庭とつながりたい",
  "将来的に親子で会える相手を探したい",
  "まずはオンラインでやり取りしたい",
];

const MEETING_RANGES = [
  "同じ市町村なら話しやすい",
  "近隣エリアまでならOK",
  "少し離れていてもオンラインならOK",
  "まずはメッセージだけでやり取りしたい",
];

export default function ProfileOnboardingPage() {
  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3">
          <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-blue">
            プロフィール登録
          </p>
          <h1 className="hero-title text-2xl font-semibold">
            はじめにプロフィールを登録しましょう
          </h1>
          <p className="muted-text text-sm leading-6">
            3つのステップで入力できます。落ち着いて、分かる範囲でご記入ください。
          </p>
        </header>

        <section className="soft-card flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="step-chip">Step 1</span>
            <h2 className="section-title">基本情報</h2>
          </div>
          <label>
            <span className="label-text">ニックネーム</span>
            <input className="mock-input" type="text" placeholder="例: 渚" />
          </label>
          <label>
            <span className="label-text">お住まいのエリア</span>
            <select className="mock-select" defaultValue="">
              <option value="" disabled>
                選択してください
              </option>
              {STEP_1_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="soft-card flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="step-chip">Step 2</span>
            <h2 className="section-title">お子さんについて</h2>
          </div>
          <label>
            <span className="label-text">お子さんの年齢帯</span>
            <select className="mock-select" defaultValue="">
              <option value="" disabled>
                選択してください
              </option>
              {CHILD_AGE_GROUPS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label-text">お子さんの性別</span>
            <select className="mock-select" defaultValue="">
              <option value="" disabled>
                選択してください
              </option>
              {CHILD_GENDERS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label-text">お子さんの好きなこと（最大5つ）</span>
            <select className="mock-select" defaultValue="" multiple size={6}>
              <option value="" disabled>
                好きなことを選択してください
              </option>
              {CHILD_INTEREST_TAGS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs muted-text">
              ※ 最大5つまで選ぶ想定です（モックでは選択数制御は未実装）
            </p>
          </label>
        </section>

        <section className="soft-card flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="step-chip">Step 3</span>
            <h2 className="section-title">つながり方の希望</h2>
          </div>
          <label>
            <span className="label-text">今つながりたいこと</span>
            <textarea
              className="mock-textarea"
              placeholder="例: まずは親同士で少し話したいです"
            />
          </label>
          <label>
            <span className="label-text">つながり方の希望</span>
            <select className="mock-select" defaultValue="">
              <option value="" disabled>
                選択してください
              </option>
              {CONNECTION_PREFERENCES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label-text">会いやすい範囲</span>
            <select className="mock-select" defaultValue="">
              <option value="" disabled>
                選択してください
              </option>
              {MEETING_RANGES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label-text">ひとこと紹介</span>
            <textarea
              className="mock-textarea"
              placeholder="例: 無理のない範囲でゆるくつながれたらうれしいです"
            />
          </label>
        </section>

        <section className="soft-card flex flex-col gap-3">
          <p className="text-sm muted-text leading-6">
            入力内容を確認して、次へお進みください。
          </p>
          <Link className="primary-btn" href="/">
            プロフィールを完了してホームへ
          </Link>
          <p className="text-[11px] muted-text">※ 画面は現在モック表示です。</p>
          <Link className="text-center text-sm muted-text underline underline-offset-3" href="/auth">
            認証ページに戻る
          </Link>
        </section>
      </main>
    </div>
  );
}
