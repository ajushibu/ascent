# Ascent — CAT prep tracker

Installable web app (PWA) for the last weeks before CAT: total goals, manual weekly and daily goals,
focus timer → XP and levels, streaks with a weekly rest day, mock log (reads result screenshots),
countdown, evening reflection, note to future you, weekly reward. Light and dark mode.
Data syncs across iPhone, iPad and laptop through Supabase.

## Try it locally (no accounts needed)

```bash
npm install
npm run dev        # http://localhost:5173  — runs in local-only mode
npm test           # unit tests for streaks, XP, goals
```

Without Supabase keys the app saves on the device only. Add `?demo=1` in dev to see sample data.

## Deploy (about 15 minutes)

### 1. Supabase
1. Create a free project at supabase.com.
2. SQL Editor → paste `supabase/schema.sql` → Run.
3. Authentication → Providers → Email: keep it on. For the fastest start, turn **off** "Confirm email"
   (Authentication → Sign In / Providers → Email). Otherwise you must click a confirmation link first.
4. Project Settings → API: copy the **Project URL** and the **anon public** key.

### 2. GitHub + Vercel
1. Push this folder to a new GitHub repo.
2. vercel.com → Add New → Project → import the repo (framework: Vite, defaults are fine).
3. Settings → Environment Variables, add all five (Production + Preview):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_URL` | same Project URL |
| `SUPABASE_ANON_KEY` | same anon key |
| `ANTHROPIC_API_KEY` | your key from console.anthropic.com |

4. Deploy. The `ANTHROPIC_API_KEY` is only used by `api/parse-mock.ts` on the server and is never sent to the browser.

### 3. Install on your devices
Open the Vercel URL in **Safari** on iPhone/iPad → Share → **Add to Home Screen**. On the laptop use Chrome/Edge → Install.
Sign in with the same email and password everywhere. Your partner can use the same login to see everything.

## How things work

- **Daily goals** link to a total (DI sets, Quant revision). Logging progress moves the total and earns XP.
- **Weekly goals** linked to a total fill automatically from your daily work that week.
- **A day counts** for the streak with 45 focus minutes (editable) or all planned goals done.
  One missed day per week is covered by a rest day.
- **XP**: 1/min focus, per-unit XP on goals, bonuses for finishing goals/days/weeks, mocks (+100) and mock analysis (+150),
  reflection (+15). Everything except mocks is capped per day (default 500) so grinding for points doesn't beat real progress.
  XP is derived from your records: undo something and its XP goes too.
- **Mock screenshots** are downscaled in the browser and read by Claude. You always confirm the numbers before saving.

## Known limits

- No background notifications. iOS web apps can't ring a timer while closed. Keep the app open during a session
  (the screen stays awake while the timer runs).
- Sync is last-writer-wins per item. Two devices editing the exact same item within a second can lose one edit.
- The mock reader can misread digits from photos of screens. Check against the original.
