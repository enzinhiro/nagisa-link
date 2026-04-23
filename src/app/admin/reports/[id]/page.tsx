"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase/client";
import { toMamaDisplayName } from "../../../../lib/profile/displayName";
import { isAdminEmail } from "../../../../lib/admin-access";

type ReportRow = {
  id: string;
  created_at: string;
  reason: "uncomfortable" | "solicitation" | "pressured_contact" | "suspicious_profile" | "other";
  reporter_user_id: string;
  target_user_id: string;
  chat_id: string;
  note: string | null;
};

type ChatRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  expires_at: string;
};

type ProfileRow = {
  id: string;
  nickname: string;
};

const REASON_LABELS: Record<ReportRow["reason"], string> = {
  uncomfortable: "不快な言動",
  solicitation: "勧誘のように感じた",
  pressured_contact: "外部連絡先交換を強く求められた",
  suspicious_profile: "プロフィールに違和感",
  other: "その他",
};

export default function AdminReportDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const reportId = params.id;

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [report, setReport] = useState<ReportRow | null>(null);
  const [chat, setChat] = useState<ChatRow | null>(null);
  const [nameMap, setNameMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth");
        return;
      }

      if (!isAdminEmail(user.email)) {
        router.replace("/");
        return;
      }

      const { data: reportData, error: reportError } = await supabase
        .from("reports")
        .select("id,created_at,reason,reporter_user_id,target_user_id,chat_id,note")
        .eq("id", reportId)
        .maybeSingle();

      if (reportError || !reportData) {
        setMessage("対象の通報が見つかりませんでした。");
        setLoading(false);
        return;
      }

      const reportRow = reportData as ReportRow;
      setReport(reportRow);

      const { data: chatData } = await supabase
        .from("chats")
        .select("id,user_a_id,user_b_id,expires_at")
        .eq("id", reportRow.chat_id)
        .maybeSingle();

      if (chatData) {
        setChat(chatData as ChatRow);
      } else {
        setChat(null);
      }

      const profileIds = new Set<string>([reportRow.reporter_user_id, reportRow.target_user_id]);
      if (chatData) {
        const c = chatData as ChatRow;
        profileIds.add(c.user_a_id);
        profileIds.add(c.user_b_id);
      }

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id,nickname")
        .in("id", Array.from(profileIds));

      const map = new Map<string, string>();
      for (const p of (profilesData ?? []) as ProfileRow[]) {
        map.set(p.id, toMamaDisplayName(p.nickname));
      }
      setNameMap(map);

      setLoading(false);
    };

    fetchDetail();
  }, [reportId, router]);

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/admin" className="text-sm muted-text underline underline-offset-3">
              管理者トップに戻る
            </Link>
            <Link href="/admin/reports" className="text-sm muted-text underline underline-offset-3">
              通報一覧に戻る
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-blue">管理者</p>
            <h1 className="hero-title text-2xl font-semibold">通報詳細</h1>
            <p className="muted-text text-sm">内容を上から順に確認できます。</p>
          </div>
        </header>

        {loading ? (
          <section className="soft-card">
            <p className="muted-text text-sm">通報詳細を読み込んでいます...</p>
          </section>
        ) : null}

        {!loading && message ? (
          <section className="soft-card">
            <p className="muted-text text-sm">{message}</p>
          </section>
        ) : null}

        {!loading && !message && report ? (
          <>
            <section className="soft-card flex flex-col gap-3">
              <div className="soft-card-subtle">
                <p className="label-text mb-1">通報日時</p>
                <p className="text-sm text-[#365f78]">{new Date(report.created_at).toLocaleString("ja-JP")}</p>
              </div>
              <div className="soft-card-subtle">
                <p className="label-text mb-1">理由</p>
                <p className="text-sm text-[#365f78]">{REASON_LABELS[report.reason]}</p>
              </div>
              <div className="soft-card-subtle">
                <p className="label-text mb-1">補足コメント</p>
                <p className="text-sm leading-6 text-[#365f78]">{report.note?.trim() ? report.note : "なし"}</p>
              </div>
              <div className="soft-card-subtle">
                <p className="label-text mb-1">通報した人</p>
                <p className="text-sm text-[#365f78]">{nameMap.get(report.reporter_user_id) ?? "不明ユーザー"}</p>
              </div>
              <div className="soft-card-subtle">
                <p className="label-text mb-1">通報対象</p>
                <p className="text-sm text-[#365f78]">{nameMap.get(report.target_user_id) ?? "不明ユーザー"}</p>
              </div>
              <div className="soft-card-subtle">
                <p className="label-text mb-1">chat_id</p>
                <p className="text-xs muted-text break-all">{report.chat_id}</p>
              </div>
            </section>

            <section className="soft-card flex flex-col gap-3">
              <h2 className="section-title">対象チャット参加者</h2>
              {chat ? (
                <>
                  <div className="soft-card-subtle">
                    <p className="label-text mb-1">user_a</p>
                    <p className="text-sm text-[#365f78]">{nameMap.get(chat.user_a_id) ?? "不明ユーザー"}</p>
                  </div>
                  <div className="soft-card-subtle">
                    <p className="label-text mb-1">user_b</p>
                    <p className="text-sm text-[#365f78]">{nameMap.get(chat.user_b_id) ?? "不明ユーザー"}</p>
                  </div>
                  <div className="soft-card-subtle">
                    <p className="label-text mb-1">expires_at</p>
                    <p className="text-sm text-[#365f78]">
                      {chat.expires_at ? new Date(chat.expires_at).toLocaleString("ja-JP") : "なし"}
                    </p>
                  </div>
                </>
              ) : (
                <p className="muted-text text-sm">対象チャット情報は見つかりませんでした。</p>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
