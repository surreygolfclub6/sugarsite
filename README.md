# SugarMatch

Dating site built with Next.js 16 (App Router), Supabase (Postgres, Auth, Realtime, Storage) and Tailwind 4.
"SugarMatch" is the working name (domain: sugarmatch.site). Change it in `lib/config.ts`.

## Setup

1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor.
3. In Supabase, go to Authentication > URL configuration and add `http://localhost:3000/auth/callback` as a redirect URL.
4. Copy `.env.example` to `.env.local` and fill in the keys.
5. `npm install && npm run dev`

To make yourself an admin, sign up, then run in the SQL editor:

```sql
insert into admins (user_id) select id from auth.users where email = 'you@example.com';
```

## What's built

- Landing page, sign up and sign in (email and password), email confirmation callback
- Route protection in `proxy.ts` (Next.js 16's replacement for `middleware.ts`)
- Five-step onboarding (basics with UK place search, relationship, appearance, about you, photos) with server-side validation and an 18+ check enforced in the app and the database
- Profiles go live as soon as onboarding is complete. Only photos wait for review, and stay hidden from others until approved
- Search (the main tab, `/discover`): photo-led two-column tiles (photo, name, age, town, online dot, photo count, message and like icons), sort tabs for Nearest, Recently active and Newest, more tiles loading as you scroll, and a filter icon that opens `/discover/filters` (sliders for age, height and distance; a search area that is your own or any UK town; dropdowns with Select all for who to show, what they want, relationship status, body type, hair colour and ethnicity)
- Full profile pages at `/profile/[id]`, an Interests tab (who liked you, who you liked), a More tab, and bottom navigation. Mutual-orientation matching, approved photos only, distance as a rounded band
- Messaging: a Message button on every profile and tile opens `/messages/[id]`. Messages arrive live over Supabase Realtime, send optimistically, show Sent/Read receipts, load earlier history on demand and reconnect without losing anything. The Messages tab lists conversations with unread counts and shows a live unread badge. Plain-text only, 2,000 characters, 20 messages a minute
- Block and report: a menu on every profile and conversation. Blocking works both ways (you vanish from each other's search, profiles and chats and can't message), is silent, and is undone under More, Blocked members. Reports take a reason and details, attach the conversation when filed from a chat, can block at the same time, and allow one open report per member. Moderators work them at `/admin/reports`: possible under-18s first, with the reported profile, photos and conversation, and Dismiss, Mark actioned or Suspend
- Account: forgot and reset password (emailed link), change password, edit profile, download my data (JSON), and delete account. Terms, Privacy and Safety pages are drafts that need a solicitor's review (`LEGAL_DRAFT` and `COMPANY` in `lib/config.ts`). Sign-up records explicit consent for sensitive profile data (`consented_at`, `consent_version`)
- Demo members for testing: `node scripts/seed-profiles.mjs` creates 60 labelled demo profiles, `--remove` deletes them
- Photo upload (1 to 6, re-encoded to JPEG in the browser to strip EXIF) and an admin photo-review queue at `/admin` (approve, reject with a reason, suspend). Members see rejections on `/discover` and can replace photos at `/photos`
- Schema: profiles, photos, likes, blocks, reports, conversations, messages, admins
- Row-level security on every table, including blocked-user rules
- Entitlements and a `paywall_enabled` flag. While the flag is false every entitlement check passes, so turning on subscriptions later is a data change, not a rewrite
- `start_conversation()` function that checks status, blocks, entitlement and a daily cap on new conversations

## Age check

New profiles wait in `pending_review` until the member passes an AgeVerif check (OAuth2: `app/age-check/*`, `lib/age-assurance.ts`).
Set `AGEVERIF_CLIENT_ID` and `AGEVERIF_CLIENT_SECRET` (server-only) to turn it on; without them profiles go live straight away,
which is what you want in local development. Register `<site>/age-check/callback` as the OAuth2 redirect URI in AgeVerif.
The database enforces the gate too: a member who isn't live can't see other members, search, message or like (`is_active_member()`
in the RLS policies). Only the outcome is stored (`age_checks`), and one verification can back one account.
Confirm with AgeVerif which assurance level counts as highly effective for UK law and set `MIN_ASSURANCE` in `lib/age-assurance.ts`.

## Account approval (testing phase)

While `app_flags.require_approval` is true, a new member waits for a moderator after finishing their profile and passing the
age check: incomplete, pending_review (age check), awaiting_approval, active. Moderators decide at `/admin/approvals`
(approving also approves the member's photos; declining sets `declined`). Turn it off at launch with
`update app_flags set value = false where key = 'require_approval';`. Members who were already active are unaffected.

## Admin two-step sign-in

Admins (rows in `admins`) must enter a code from an authenticator app before any admin page or action works, and again
after 8 hours (`lib/admin.ts`). The first sign-in goes to `/admin/mfa` to set it up; `/admin/mfa` also lets an admin add a
second device or remove one (the last can't be removed). `is_admin()` in the database also needs an aal2 session, so a
stolen admin password can't read other members' data through the API either. Every moderator decision and every code
attempt is recorded in `moderation_log`; five wrong codes lock the screen for 15 minutes.

If an admin loses every authenticator, remove their factors in the Supabase SQL editor, then they set up a new one at
their next sign-in: `delete from auth.mfa_factors where user_id = '<their user id>';`

## Not built yet

- Email or push notifications for new messages and likes, and custom SMTP (Supabase's built-in sender allows only a few emails an hour)
- Typing indicators
- Messaging UI (the schema and realtime publication are ready)
- ID verification vendor (Veriff, Onfido). Profiles are not ID-verified before going live yet
- Subscriptions and the billing webhook

## Notes

- `SUPABASE_SERVICE_ROLE_KEY` is server-only. `lib/supabase/admin.ts` imports `server-only` so it can't be bundled for the browser.
- Members can only edit descriptive profile columns. Status and verification flags change through server code or an admin.
- Before launch: confirm Supabase's and your host's acceptable use policies cover the site, and have a solicitor review the terms, privacy policy, Online Safety Act risk assessment and DPIA.

## Running and checking

- `npm run dev` for development, `npx playwright test` for the end-to-end suite (it reuses a running server; set `E2E_BASE_URL` to test another).
- To check a production build beside the dev server: `NEXT_BUILD_DIR=.next-build npm run build`, then `NEXT_BUILD_DIR=.next-build npx next start -p 3100` and `E2E_BASE_URL=http://localhost:3100 npx playwright test`. This caught problems the dev server hid, so run it before launch.
- For password reset links that work when the email is opened on another device, change the Supabase email templates to link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery` (and `type=signup` for confirmation).
