"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";
import { isAdminEmail } from "../../lib/admin-access";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const guard = async () => {
      setIsChecking(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        router.replace("/auth");
        return;
      }

      if (!isAdminEmail(user.email)) {
        router.replace("/");
        return;
      }

      setIsAllowed(true);
      setIsChecking(false);
    };

    void guard();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (isChecking || !isAllowed) {
    return (
      <div className="mock-page">
        <main className="mock-shell screen-stack">
          <section className="soft-card">
            <p className="muted-text text-sm">管理画面を確認しています...</p>
          </section>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
