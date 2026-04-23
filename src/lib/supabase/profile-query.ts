type SupabaseErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

export function isMissingProfileColumnError(error: SupabaseErrorLike | null | undefined): boolean {
  if (!error) return false;
  const text = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return (
    text.includes("avatar_seed") ||
    text.includes("column") ||
    text.includes("does not exist") ||
    error.code === "42703" ||
    error.code === "PGRST204"
  );
}
