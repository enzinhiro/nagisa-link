const ADMIN_EMAILS = ["enzin-office@gmail.com"] as const;

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.includes(normalized as (typeof ADMIN_EMAILS)[number]);
}

export function getAdminEmails(): readonly string[] {
  return ADMIN_EMAILS;
}
