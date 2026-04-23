const READ_PREFIX = "nagisa-chat-read";

function keyOf(userId: string, chatId: string): string {
  return `${READ_PREFIX}:${userId}:${chatId}`;
}

export function getChatLastReadAt(userId: string, chatId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(keyOf(userId, chatId));
}

export function setChatLastReadAt(userId: string, chatId: string, isoTimestamp: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keyOf(userId, chatId), isoTimestamp);
}
