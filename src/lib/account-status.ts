import { supabase } from "./supabase/client";
import { isAdminEmail } from "./admin-access";

export type ProfileGateStatus = {
  profileCompleted: boolean;
  isSuspended: boolean;
};

export async function fetchProfileGateStatus(userId: string): Promise<ProfileGateStatus | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("profile_completed,is_suspended")
    .eq("id", userId)
    .maybeSingle();

  if (error) return null;

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
  if (!status) return false;
  return !status.isSuspended;
}
