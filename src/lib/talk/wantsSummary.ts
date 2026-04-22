/**
 * Shared rules for /talk and home: one matched row (A→B) is enough for both users to see "一致".
 */

export type WantEdge = {
  id?: string;
  from_user: string;
  to_user: string;
  status: string;
};

export type ChatExpiryRow = {
  user_a_id: string;
  user_b_id: string;
  expires_at: string;
  status: string;
};

/** Map otherUserId → chat row with latest expires_at for current user. */
export function chatByOtherUserMap(userId: string, chats: ChatExpiryRow[]): Map<string, ChatExpiryRow> {
  const map = new Map<string, ChatExpiryRow>();
  for (const chat of chats) {
    const otherId = chat.user_a_id === userId ? chat.user_b_id : chat.user_a_id;
    const prev = map.get(otherId);
    if (!prev || new Date(chat.expires_at).getTime() > new Date(prev.expires_at).getTime()) {
      map.set(otherId, chat);
    }
  }
  return map;
}

export function splitMatchedAndEnded(
  userId: string,
  wants: WantEdge[],
  chatByOther: Map<string, ChatExpiryRow>
): { matchedOtherIds: string[]; endedOtherIds: string[] } {
  const matched = new Set<string>();
  const ended = new Set<string>();
  for (const want of wants) {
    if (want.status !== "matched") continue;
    const other = want.from_user === userId ? want.to_user : want.from_user;
    if (!other || other === userId) continue;
    const relatedChat = chatByOther.get(other);
    if (relatedChat && new Date(relatedChat.expires_at).getTime() <= Date.now()) {
      ended.add(other);
    } else {
      matched.add(other);
    }
  }
  return {
    matchedOtherIds: Array.from(matched),
    endedOtherIds: Array.from(ended),
  };
}

export function pendingReceivedOffers(
  userId: string,
  wants: WantEdge[],
  matched: Set<string>,
  ended: Set<string>
): { wantId: string; otherUserId: string }[] {
  return wants
    .filter((w) => w.to_user === userId && w.status === "pending")
    .filter((w) => !matched.has(w.from_user) && !ended.has(w.from_user))
    .map((w) => ({ wantId: w.id ?? "", otherUserId: w.from_user }))
    .filter((x) => x.wantId.length > 0);
}

export function pendingSentOffers(
  userId: string,
  wants: WantEdge[],
  matched: Set<string>,
  ended: Set<string>
): { wantId: string; otherUserId: string }[] {
  return wants
    .filter((w) => w.from_user === userId && w.status === "pending")
    .filter((w) => !matched.has(w.to_user) && !ended.has(w.to_user))
    .map((w) => ({ wantId: w.id ?? "", otherUserId: w.to_user }))
    .filter((x) => x.wantId.length > 0);
}
