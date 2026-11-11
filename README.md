# M-TOEIC

A private TOEIC study PWA for one student. Every **chapter** is built from a class where the student struggled, and each chapter holds small **lessons** with four parts: 설명 (explanation) → 단어 (word cards) → 문장 (colour-coded sentence analysis) → 퀴즈 (quiz).
The student can also add their own words, which go into spaced-repetition review alongside the lesson words.

- React 19 + Vite 8 + TypeScript. Routing is by URL hash, so the phone's back button works.
- **Runtime AI cost: $0.** All content is written ahead of time into `src/content/`, and pronunciation uses the phone's built-in voice.
- Saving is local first (localStorage). If Supabase is configured, the app signs in and syncs progress and the student's own words across devices.
- Works offline once loaded (`public/sw.js`), and can be added to the phone's home screen.

## Development

```bash
npm install
npm run dev            # http://localhost:5173 (on the same Wi-Fi, open the printed Network URL on a phone)
npm run check-content  # validate content only
npm run build          # content check → typecheck → build to dist/
```

With no `.env`, the app runs in **this-device-only mode**: no login, data stays in the browser.

## Supabase setup (optional, but recommended so data survives a phone change)

1. Create a project at [supabase.com](https://supabase.com) (the free tier is plenty).
2. In **SQL Editor**, paste all of [`supabase/schema.sql`](supabase/schema.sql) and run it.
3. In **Authentication → Sign In / Providers**, turn off **Allow new users to sign up** so only the account you create can log in.
4. In **Authentication → Users → Add user → Create new user**, enter the student's email and password and check **Auto Confirm User**.
5. From **Project Settings → API**, copy the Project URL and the `anon` public key into `.env.local`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

The anon key is meant to be public. Row Level Security limits every row to its owner.

### Adding words for the student from the dashboard

In **Table Editor → custom_words → Insert row**, fill in `en`, `ko` and `deck`, and set `user_id` to the student's UUID (shown under Authentication → Users). The word appears in the student's word list and today's review the next time the app opens or comes back to the foreground.

## Deploying to Vercel

1. Push this repo to GitHub, then **Add New → Project** in Vercel and import it. Vercel detects Vite; leave the defaults (`npm run build`, output `dist`).
2. Under **Settings → Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then redeploy.
3. Send the URL to the student. On iPhone: Safari → Share → **Add to Home Screen**. On Android: Chrome → ⋮ → **Install app**.

Every later `git push` redeploys automatically. If a content error slips in, `npm run build` fails, so a broken chapter never goes live.

## Adding a chapter after a class

See [CONTENT_GUIDE.md](CONTENT_GUIDE.md). In short: tell Claude what the student was weak on, it writes `src/content/chapters/YYYY-MM-DD/`, you run `npm run build`, then push.

## Layout

```
src/content/types.ts          content schema (chapters, lessons, words, sentences, quiz)
src/content/markup.ts         sentence-analysis markup parser: [text|TAG|note]
src/content/chapters/         one folder per class date + index.ts registry
scripts/check-content.ts      content validator (runs on every build)
src/lib/store.ts              local state + actions (progress, review, custom words)
src/lib/sync.ts               Supabase sync (pull → per-item newest-wins merge → push changes)
src/lib/srs.ts                Leitner-box spaced repetition (1, 3, 7, 14, 30, 60 days)
src/screens/                  Home, Lesson, Cards, Review, Words, WordForm, BulkAdd, Settings, Login
supabase/schema.sql           tables + row-level security
```
