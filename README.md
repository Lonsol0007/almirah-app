# Almirah

A case diary for advocates in India. Add a case once by its CNR, record what happens at each hearing, and keep your whole caseload in your own account — synced across phone and laptop, so an app update or a new phone never wipes it.

Almirah is independent and not affiliated with any court or government body. It does not fetch data from court systems: advocates add their own cases, and dates should always be checked against the court's own record.

## What it does

- **Diary first** — Home opens on the calendar; pick a day to see its hearings, CNR lookup below
- **Record a hearing** — what happened, the stage, the next date, or disposal; the history writes itself
- **Search** your cases by case number, party, advocate (name or bar registration), FIR, filing number, case type or Act
- **District courts, High Courts and consumer commissions** — court pickers switch between the three.
  Consumer cases (District, State, National commissions) are added by their e-Jagriti case number and tracked
  by hand, with a link to the e-Jagriti portal: it has no public API
- **Add to Google Calendar** for a case's next hearing
- **Cause list** for a court, and an advocate's day list across a whole complex
- **Calendar** of hearings, **My cases** grouped by date or court
- **Backup and restore** that matches by CNR — restoring twice never duplicates a case
- **Order PDFs** attached to cases, **copy case details** in one tap, **QR scan** of the case code
- **English, Hindi and Marathi** across every app screen
- Accounts, a free plan (20 cases) and a paid plan through Stripe, daily hearing-reminder emails

## Run it

```bash
npm install
npm run dev -- --port 3100
```

Open http://localhost:3100. With no environment variables set, it runs as a **demo on your device** with sample cases — no accounts needed.

To switch on accounts, billing and email, copy `.env.example` to `.env.local` and fill it in (Supabase, Stripe, Resend). Then apply the database:

```bash
npx supabase@2.20.12 link --project-ref <your-project-ref>
npx supabase@2.20.12 db push      # migrations in supabase/migrations
```

…and load the reference court data from `supabase/seed.sql`. `supabase/demo-backup.json` is a backup file you can restore into a real account to try it with sample cases.

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 with design tokens · Supabase (Postgres with row-level security, Auth, Storage) · Stripe Checkout and Customer Portal · Resend · Vercel (hosting and the daily reminder cron).

The app talks to one data contract (`src/lib/data/contract.ts`) with two implementations: an on-device demo (`fake.ts`) and Supabase (`supabase.ts`). Which one runs depends only on whether the Supabase variables are set.

## Tests

```bash
npx playwright test                  # end-to-end, production build, phone and desktop widths, axe scans
node --test tests/unit/backend.test.mjs tests/unit/dates.test.mjs tests/unit/messages.test.mjs
node --test tests/db/rls.test.mjs tests/db/limits.test.mjs tests/db/courts.test.mjs   # real Postgres via PGlite
```

The database tests apply every migration and check the access rules — including that a second user can see and change nothing of the first's.

## Android app

The Android app (Capacitor) packages the static demo build: cases live on the phone, with no account or sync.
Needs the Android SDK and Java 21.

```bash
node scripts/build-mobile.mjs   # static export into out/
npx cap sync android
cd android && ./gradlew assembleDebug   # → android/app/build/outputs/apk/debug/app-debug.apk
```

Backups go through the Android share sheet. "Add to Google Calendar" opens Google's own event screen (no API key).
Debug builds are for testing on your own phone only: they are debuggable, so anyone with USB access can read the
cases on the device. Anything you hand out is a signed release build, which also keeps case data out of Android's
cloud backups and phone-to-phone transfers. Create your upload key once, and keep the file and passwords safe
(losing them means no update can ever install over your app):

```bash
keytool -genkeypair -v -keystore almirah-upload.jks -alias almirah -keyalg RSA -keysize 2048 -validity 10000
```

Then create `android/keystore.properties` (gitignored) pointing at it:

```properties
storeFile=C:/path/to/almirah-upload.jks
storePassword=…
keyAlias=almirah
keyPassword=…
```

```bash
cd android && ./gradlew assembleRelease   # → app/build/outputs/apk/release/app-release.apk
cd android && ./gradlew bundleRelease     # → the .aab for Google Play
```
`node scripts/make-android-icons.mjs` regenerates the launcher icons and splash screens.

## Before going live

The app isn't deployed. Still to do: production accounts and keys (Supabase, Stripe live mode, Resend with a verified domain), a domain and a real support email, the app icon and social image, a manual test pass on real accounts, a trademark search for the name, a lawyer's review of the privacy policy and terms, and a native-speaker review of the Hindi and Marathi.
