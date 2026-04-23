import { supabase } from "./supabase/client";
import { isAdminEmail } from "./admin-access";

export type ProfileGateStatus = {
  profileCompleted: boolean;
  isSuspended: boolean;
};

function isNoProfileRowError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST116") return true;
  return (error.message ?? "").toLowerCase().includes("0 rows");
}

async function ensureProfileRowExists(userId: string): Promise<void> {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      nickname: "未設定",
      area: "未設定",
      child_age_group: "未設定",
      child_gender: "未設定",
      child_interest_tags: [],
      want_to_connect: "未設定",
      connection_preference: "未設定",
      meeting_range: "未設定",
      intro: "未設定",
      profile_completed: false,
    },
    { onConflict: "id" }
  );
  if (error) {
    console.warn("[account-status] could not create fallback profile row", error);
  }
}

export async function fetchProfileGateStatus(userId: string): Promise<ProfileGateStatus | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("profile_completed,is_suspended")
    .eq("id", userId)
    .maybeSingle();

  if (error && !isNoProfileRowError(error)) {
    // Backward-compatible fallback for environments where one column is missing.
    const { data: profileOnly, error: profileOnlyError } = await supabase
      .from("profiles")
      .select("profile_completed")
      .eq("id", userId)
      .maybeSingle();
    if (!profileOnlyError && profileOnly) {
      return {
        profileCompleted: profileOnly.profile_completed === true,
        isSuspended: false,
      };
    }
    return null;
  }
  if (!data) {
    await ensureProfileRowExists(userId);
    return {
      profileCompleted: false,
      isSuspended: false,
    };
  }

  return {
    profileCompleted: data?.profile_completed === true,
    isSuspended: data?.is_suspended === true,
  };
}

export async function canPerformUserWriteAction(
  userId: string,
  email?: string | null
): Promise<boolean> {
  if (isAdminEmail(email)) return true;
  const status = await fetchProfileGateStatus(userId);
  if (!status) return true;
  return !status.isSuspended;
}
