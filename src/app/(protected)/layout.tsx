"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

export const PROTECTED_APP_PATH_HINTS = ["/", "/search", "/talk", "/chat"] as const;

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const guard = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("profile_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !data?.profile_completed) {
        router.replace("/onboarding/profile");
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

  return <>{children}</>;
}
