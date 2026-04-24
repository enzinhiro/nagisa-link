# NAGISA Link Security Checklist

## Goal
- Prevent leakage of private data (real name, email, invite usage email, admin notes).
- Confirm users cannot read other users' private records by URL guessing or direct access.

## Test Accounts
- `A`: normal user
- `B`: normal user
- `C`: admin user (whitelisted email)

## Pre-Checks
- Apply latest migrations.
- Confirm `public_profiles` exists and only exposes safe columns.
- Confirm `profiles` policies are own/admin only.

## A/B/C Test Steps

### 1) Public profile exposure
- Login as `A`, open `/search` and `/search/[id]`.
- Verify UI shows only safe fields:
  - `id`, `nickname`, `avatar_seed`, `area`, `child_age_group`, `child_gender`,
    `child_interest_tags`, `want_to_connect`, `intro`, `connection_preference`,
    `meeting_range`, `connection_achievement_count`, `created_at` (if used).
- Verify these never appear:
  - `real_name`, `email`, `used_by_email`, `is_suspended`, `suspension_note`,
    invite/admin memo fields.

### 2) Talk and chat privacy
- As `A`, check `/talk`, `/chat`, `/chat/[id]`.
- Verify only anonymous profile info is shown (nickname/avatar based identity).
- Open `/chat/[id]` with a non-participant chat ID from another user.
- Expected: no message body or counterpart profile should load.

### 3) Wants and reports isolation
- As `A`, ensure only wants where `A` is `from_user` or `to_user` are visible.
- As `A`, verify own reports are visible only to `A`.
- As `B`, confirm `A`'s report list/details are not visible.

### 4) Admin direct URL checks
- As `A` or `B`, open `/admin`, `/admin/users`, `/admin/reports`, `/admin/invite-codes`.
- Expected: redirected away and no admin data rendered.
- As `C`, verify admin pages and metrics still work.

### 5) Invite data boundary
- Confirm general screens never query `invite_codes` table directly.
- Signup flow should use RPCs (`validate_invite_code`, `consume_invite_code`) only.

### 6) Logging leakage checks
- Inspect browser console during auth/signup/chat/report flows.
- Ensure logs do not print:
  - message body, report note, real name, email, used_by_email, invite code.

## Pass Criteria
- All non-admin screens show only public-safe profile fields.
- Non-participants cannot read foreign chat/message data.
- Non-admin users cannot access admin data even by direct URL.
- No sensitive data appears in console logs.

## 100名βテスト前チェック
- **Admin直打ち耐性**
  - `A/B` で `/admin`, `/admin/users`, `/admin/reports`, `/admin/reports/<id>`, `/admin/invite-codes` を直打ちし、管理画面が描画されないこと。
- **Admin正常動作**
  - `C` で同URLが正常表示され、一覧・詳細・ステータス更新ができること。
- **管理情報漏洩なし**
  - `A/B` で本名・メール・招待コード使用メール・管理メモがUI/ネットワークレスポンスに出ないこと。
- **チャット非参加者耐性**
  - 他人の `chat_id` 直打ちで本文/相手情報が取得されないこと。
- **公開プロフィール境界**
  - 一般画面は `public_profiles` の安全列のみを参照し、`profiles` 本体は本人編集/管理用途のみであること。
