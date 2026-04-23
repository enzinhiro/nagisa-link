"use client";

import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

export default function SuspendedPage() {
  const router = useRouter();

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <section className="soft-card flex flex-col gap-3">
          <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-pink">ご案内</p>
          <h1 className="hero-title text-2xl font-semibold">ご利用を一時停止しています</h1>
          <p className="muted-text text-sm leading-6">
            詳細確認が必要なため、現在このアカウントはご利用を停止しています。
          </p>
          <button
            type="button"
            className="secondary-btn !h-10"
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/auth");
            }}
          >
            ログアウト
          </button>
        </section>
      </main>
    </div>
  );
}
