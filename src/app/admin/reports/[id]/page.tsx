"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase/client";
import { toMamaDisplayName } from "../../../../lib/profile/displayName";

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

const ADMIN_EMAIL = "enzin-office@gmail.com";

const REASON_LABELS: Record<ReportRow["reason"], string> = {
  uncomfortable: "不快な言動",
  solicitation: "勧誘のように感じた",
  pressured_contact: "外部連絡先交換を強く求められた",
  suspicious_profile: "プロフィールに違和感",
  other: "その他",
};

export default function AdminReportDetailPage() {
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
        setMessage("ログイン状態を確認できませんでした。");
        setLoading(false);
        return;
      }

      if ((user.email ?? "").toLowerCase() !== ADMIN_EMAIL) {
        setMessage("この画面は管理者のみ利用できます。");
        setLoading(false);
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
  }, [reportId]);

  return (
    <div className="mock-page">
      <main className="mock-shell screen-stack">
        <header className="soft-card flex flex-col gap-3">
          <Link href="/admin/reports" className="text-sm muted-text underline underline-offset-3">
            通報一覧に戻る
          </Link>
          <p className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium pill-blue">管理者</p>
          <h1 className="hero-title text-2xl font-semibold">通報詳細</h1>
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
            <section className="soft-card flex flex-col gap-2.5">
              <p className="text-xs muted-text">{new Date(report.created_at).toLocaleString("ja-JP")}</p>
              <p className="text-sm text-[#365f78]">理由: {REASON_LABELS[report.reason]}</p>
              <p className="text-sm text-[#365f78]">
                通報者: {nameMap.get(report.reporter_user_id) ?? "不明ユーザー"}
              </p>
              <p className="text-sm text-[#365f78]">
                対象者: {nameMap.get(report.target_user_id) ?? "不明ユーザー"}
              </p>
              <p className="text-xs muted-text">chat_id: {report.chat_id}</p>
              <p className="text-sm text-[#365f78]">補足コメント: {report.note?.trim() ? report.note : "なし"}</p>
            </section>

            <section className="soft-card flex flex-col gap-2.5">
              <h2 className="section-title">対象チャット参加者</h2>
              {chat ? (
                <>
                  <p className="text-sm text-[#365f78]">
                    user_a: {nameMap.get(chat.user_a_id) ?? "不明ユーザー"}
                  </p>
                  <p className="text-sm text-[#365f78]">
                    user_b: {nameMap.get(chat.user_b_id) ?? "不明ユーザー"}
                  </p>
                  <p className="text-xs muted-text">
                    expires_at: {chat.expires_at ? new Date(chat.expires_at).toLocaleString("ja-JP") : "なし"}
                  </p>
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
