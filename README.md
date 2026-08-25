# MyFinance

A private, multi-user personal finance app for tracking income and expenses.
Each family member signs in with their own Google account and sees only their
own money — enforced by Postgres Row Level Security, not by app code.

**Stack:** Expo SDK 57 (React Native 0.86) · TypeScript · Supabase (Postgres +
Auth) · TanStack Query · GitHub Actions + EAS Build.

**Target:** Android, distributed as a shareable APK. The code avoids
Android-only APIs so the web/PWA export can be switched on later.

---

## Quick start

```bash
npm install
cp .env.example .env      # then fill in your Supabase values
npm start
```

`npm start` launches the bundler for a **development build**. Google sign-in
uses a `pfa://` deep link, which Expo Go cannot handle — see
[Development builds](#development-builds) below.

---

## Project layout

```
src/
  app/                 expo-router routes (file = screen)
    (auth)/sign-in     the only unauthenticated screen
    (tabs)/            home · history · [+] · reports · profile
    transaction/       new/edit, presented as a modal
  components/ui/       design-system primitives — Card, PillButton, ListRow, …
  features/            one folder per domain (auth, accounts, transactions, …)
  lib/                 supabase client, query client + query keys
  theme/               tokens.ts and typography.ts — the single source of colour
  types/database.ts    GENERATED — do not edit by hand
  utils/               money.ts, date.ts
supabase/migrations/   schema, RLS policies, views, triggers
assets/brand/          GENERATED vector source for the icons — see below
assets/images/         GENERATED PNGs that app.config.ts points at
scripts/test-rls.mjs   proves two users cannot see each other's data
scripts/generate-icons.mjs  draws every icon from one mark
.github/workflows/     CI, database migrations, Android build
```

### Two rules worth knowing before you edit anything

1. **Never hard-code a colour, radius or spacing value.** Everything comes from
   `src/theme/tokens.ts`, so a palette change is a one-file change.
2. **Never add two money values with `+`.** Postgres `numeric` is exact but
   JavaScript floats are not (`0.1 + 0.2 !== 0.3`). Totals are aggregated in SQL
   (`account_balances`, `monthly_summary`); if you must add in JS, use
   `sumAmounts` from `src/utils/money.ts`.

### Icons

Nothing under `assets/` is hand-drawn. `scripts/generate-icons.mjs` holds the
mark's geometry, reads its colours out of `src/theme/tokens.ts`, and renders
every SVG and PNG:

```bash
npm run icons
```

Edit the geometry constants at the top of that script — never the output files,
which are overwritten on the next run. The three sizes are not interchangeable:
the launcher tile is full-bleed, while the adaptive foreground and the
monochrome (themed) icon are shrunk to fit Android's circular safe zone, so
their marks are deliberately smaller. `android.adaptiveIcon.backgroundColor`
must stay the dark `colors.primary`, because the foreground mark is white.

---

## One-time setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com) — region **South
   Asia (Mumbai)** for the lowest latency from India.
2. In the dashboard: **Settings → API** for the project URL, and
   **Settings → API Keys → Publishable key** for the key. Put both in `.env`
   (the green **Connect** button in the top bar shows them together). Older
   projects show these under **Legacy API Keys** as the `anon` key instead.
3. Apply the schema:

   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   After this, pushes to `main` apply new migrations automatically.

Both keys in `.env` are _meant_ to be public — they ship inside the APK. RLS is
what protects the data. The service-role key is different: it bypasses RLS
entirely and must never appear in app code (only `scripts/test-rls.mjs` uses it).

### 2. Google OAuth

1. In [Google Cloud Console](https://console.cloud.google.com), create a project.
2. **APIs & Services → OAuth consent screen**: External. Add each family
   member's Gmail address under _Test users_ (or publish the app to skip the
   100-user cap and the "unverified app" warning).
3. **Credentials → Create credentials → OAuth client ID → Web application.**
   Authorised redirect URI:

   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```

4. In Supabase: **Authentication → Providers → Google** — enable it and paste
   the client ID and secret.
5. In Supabase: **Authentication → URL Configuration → Redirect URLs** — add:

   ```
   pfa://auth/callback
   pfa://**
   ```

   Both stars matter: Supabase matches these as globs where `*` stops at a `/`,
   so `pfa://*` does **not** match the `pfa://auth/callback` the app actually
   asks for. An unmatched redirect is discarded silently and the flow falls
   back to **Site URL**.

6. In Supabase: **Authentication → URL Configuration → Site URL** — change it
   from the default `http://localhost:3000` to `pfa://auth/callback`. There is
   no web deployment, so a fallback to localhost only ever dead-ends on a
   refused connection.

   Get either of these wrong and the browser completes the Google flow and then
   strands the user: the app never receives the code. It is the single most
   common setup mistake.

### 3. Expo / EAS

```bash
npm install -g eas-cli
eas login
eas init
eas env:set --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value "https://…"
eas env:set --environment preview --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value "sb_publishable_…"
```

`eas init` cannot write into a dynamic TypeScript config; it prints the project
ID and stops. Paste it into `extra.eas.projectId` in `app.config.ts` by hand,
as a literal — CI builds from a clean checkout with no `.env`, so reading it
from `process.env` there would leave the build unable to resolve the project.

EAS builds run on Expo's servers, so they read these EAS environment variables —
not your local `.env` and not the GitHub secrets. Which set a build reads is
pinned by `environment` on each profile in `eas.json`.

**Never add `SUPABASE_SERVICE_ROLE_KEY` to EAS.** It bypasses RLS, so shipping
it inside an APK would hand every install full read and write access to every
family member's data. It belongs only in your local `.env`, for `test:rls`.

### 4. GitHub secrets

**Settings → Secrets and variables → Actions:**

| Secret                  | Used by             | Where to find it                            |
| ----------------------- | ------------------- | ------------------------------------------- |
| `EXPO_TOKEN`            | `android-build.yml` | expo.dev → Account settings → Access tokens |
| `SUPABASE_ACCESS_TOKEN` | `db-migrate.yml`    | supabase.com → Account → Access tokens      |
| `SUPABASE_PROJECT_ID`   | `db-migrate.yml`    | the project ref in your Supabase URL        |
| `SUPABASE_DB_PASSWORD`  | `db-migrate.yml`    | set when you created the project            |

---

## Development builds

Google sign-in needs the `pfa://` deep link, which Expo Go does not register.
Build a dev client once, then reuse it for all day-to-day work:

```bash
eas build --profile development --platform android
```

Install the resulting APK on your phone, then:

```bash
npm start
```

Rebuild the dev client only when native dependencies change — not for ordinary
JavaScript edits.

With Android Studio and JDK 17 installed you can build locally instead, which
costs no EAS build credits:

```bash
npx expo run:android
```

---

## Checks

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # ESLint, zero warnings tolerated
npm run format:check  # Prettier
npm test              # Jest unit tests
npm run test:rls      # two-user isolation test against a real project
```

`npm run test:rls` is the important one. It creates two throwaway users, has one
record income, expenses and a transfer, then asserts the other sees **zero**
rows and cannot write to them — and that the balances and monthly totals are
exact to the paisa. It deletes both users when it finishes. Run it after any
change to `supabase/migrations/`.

If it fails with `Could not find the table 'public.accounts' in the schema
cache`, the keys are fine but the migrations were never applied — go back and
run `npx supabase db push`.

---

## Releasing to the family

```bash
git tag v0.1.0
git push origin v0.1.0
```

That triggers `android-build.yml`, which builds a signed APK and posts the
install link to the workflow summary. Share the link; no Play Store account
needed.

Builds are tag-triggered on purpose — the EAS free tier allows 15 Android builds
per month, so building on every push would exhaust it in days.

---

## Current status

| Milestone                                               | State |
| ------------------------------------------------------- | ----- |
| M0 Foundations — scaffold, theme, lint/test/CI          | ✅    |
| M1 Database — schema, RLS, views, seed trigger          | ✅    |
| M2 Auth — Google PKCE, session persistence, route guard | ✅    |
| M3 Design system — UI primitives                        | ✅    |
| M4 Accounts & categories CRUD                           | ✅    |
| M5 Transactions — numpad, transfers, history            | ✅    |
| M6 Dashboard — real balances and summaries              | ✅    |
| M7 Ship — icon, splash, first tagged APK                | ✅    |

**v1 is shipped.** A signed APK builds from a tag, installs on Android, signs in
with Google and reads and writes real data, with isolation between users proven
by `npm run test:rls`.

Work from here is tracked in Jira under the `MF` project rather than in this
table. Put the issue key in the branch name (`MF-14-recurring-transactions`) and
the board updates itself as the branch, pull request and merge land.

Post-v1: budgets, savings goals, reports and CSV/PDF export, recurring
transactions, receipt photos, PWA, biometric lock, offline queue.
