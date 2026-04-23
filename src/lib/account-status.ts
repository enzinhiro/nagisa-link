import { supabase } from "./supabase/client";

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
