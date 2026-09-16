# Lumina Club: audit and unification plan

## Existing architecture

- One Next.js App Router project contains the public website (`/`) and Telegram Mini App (`/tg/*`).
- Both surfaces already use one Supabase project: Auth, Postgres and private Storage/R2 media.
- `profiles.id` is the internal UUID and references `auth.users.id`; Telegram ID is already nullable and unique.
- Telegram authentication validates official WebApp `initData` on the server and stores a signed HTTP-only session cookie.
- Posts and media already live in shared `posts` and `post_media` tables. `required_tier` is enforced server-side and by RLS.
- Legacy subscription state is stored directly on `profiles` (`tier`, `access_status`, `access_expires_at`).

## Gaps found

- There is no normalized subscription record or explicit guest tier.
- Web and Telegram identities are not represented separately, so an email user and a Telegram user can become duplicate profiles.
- There is no supported account-linking flow.
- Shared JSON endpoints for the current account, subscription and protected post access are incomplete.
- Several server reads use the service role, making application-level access checks critical even though RLS also exists.

## Compatibility strategy

- Add `subscriptions` as the source of truth and `user_identities` as the identity map.
- Backfill every existing profile and preserve all UUIDs, posts, media, messages, purchases and invites.
- Keep legacy access columns on `profiles` as a synchronized compatibility cache while existing UI is migrated incrementally.
- Keep the existing visual design and Telegram session mechanism.
- Do not introduce another database or copy-based synchronization.

## Components intentionally preserved

- Supabase Auth and current email/password accounts.
- Telegram Bot token validation, signed Mini App session and admin allow-list.
- Existing post schema, R2/Supabase media storage and signed URL generation.
- Admin screens, tier cards, feed, navigation and purchase-request workflow.
