import { supabase } from "../supabase/client";

type AchievementRow = {
  user_low_id: string;
  user_high_id: string;
};

function toCsv(ids: string[]): string {
  return ids.map((id) => id.trim()).filter(Boolean).join(",");
}

/**
 * Public-facing count:
 * count only pairs where both profiles currently exist and profile_completed=true.
 */
export async function getVisibleConnectionAchievementCounts(
  userIds: string[]
): Promise<Map<string, number>> {
  const normalized = Array.from(new Set(userIds.map((id) => id.trim()).filter(Boolean)));
  const result = new Map<string, number>();
  for (const id of normalized) result.set(id, 0);
  if (normalized.length === 0) return result;

  const csv = toCsv(normalized);
  const { data: achievementRows, error: achievementError } = await supabase
    .from("connection_achievements")
    .select("user_low_id,user_high_id")
    .or(`user_low_id.in.(${csv}),user_high_id.in.(${csv})`);

  if (achievementError) {
    console.warn("[connection-achievements] list failed", achievementError);
    return result;
  }

  const rows = (achievementRows ?? []) as AchievementRow[];
  if (rows.length === 0) return result;

  const involvedIds = Array.from(
    new Set(rows.flatMap((row) => [row.user_low_id, row.user_high_id]).filter(Boolean))
  );

  const { data: visibleProfiles, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .in("id", involvedIds)
    .eq("profile_completed", true);

  if (profileError) {
    console.warn("[connection-achievements] visible profile lookup failed", profileError);
    return result;
  }

  const visibleIdSet = new Set((visibleProfiles ?? []).map((row) => row.id as string));
  for (const row of rows) {
    const a = row.user_low_id;
    const b = row.user_high_id;
    if (!visibleIdSet.has(a) || !visibleIdSet.has(b)) continue;
    if (result.has(a)) result.set(a, (result.get(a) ?? 0) + 1);
    if (result.has(b)) result.set(b, (result.get(b) ?? 0) + 1);
  }

  return result;
}

