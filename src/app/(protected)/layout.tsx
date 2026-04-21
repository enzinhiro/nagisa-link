"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

export const PROTECTED_APP_PATH_HINTS = ["/", "/search", "/talk", "/chat"] as const;

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    const guard = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth");
        return;
      }

      if (user.email) {
        await supabase.rpc("link_invite_code_user", {
          input_email: user.email,
          input_user_id: user.id,
        });
      }

      const { data: hasConsumedInvite, error: inviteError } = await supabase.rpc(
        "has_consumed_invite",
        { input_email: user.email ?? "", input_user_id: user.id }
      );

      if (inviteError || !hasConsumedInvite) {
        router.replace("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("profile_completed,is_suspended")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !data?.profile_completed) {
        router.replace("/onboarding/profile");
        return;
      }

      if (data.is_suspended) {
        setIsSuspended(true);
        setIsChecking(false);
        return;
      }

      setIsChecking(false);
    };

    guard();
  }, [router]);

  if (isChecking) {
    return (
      <div className="mock-page">
        <main className="mock-shell screen-stack">
          <section className="soft-card">
            <p className="muted-text text-sm">読み込み中です...</p>
          </section>
        </main>
      </div>
    );
  }

  if (isSuspended) {
    return (
      <div className="mock-page">
        <main className="mock-shell screen-stack">
          <section className="soft-card flex flex-col gap-3">
            <h1 className="section-title">ご利用について</h1>
            <p className="muted-text text-sm">
              現在ご利用を停止しています。ご不明点は運営までご連絡ください。
            </p>
            <button
              type="button"
              className="secondary-btn"
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

  return <>{children}</>;
}
