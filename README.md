# M-TOEIC

A private TOEIC study PWA for one student. Every **chapter** is built from a class where the student struggled, and each chapter holds small **lessons**. A lesson is a path of four short, active stages:

1. **개념 익히기**: the explanation, one card at a time.
2. **단어 게임**: new words get an intro card, then meaning / reverse / listening picks and a pair-matching round. The first answer to each word feeds spaced repetition; a missed word comes back in the same round.
3. **뼈대 찾기**: the student taps the main verb, then the subject, of each sentence. A wrong tap explains why (e.g. "that verb is inside a clause"). Then the full colour-coded analysis is shown.
4. **실전 퀴즈**: TOEIC-style questions with a streak counter, stars and per-question explanations.

The word list and the colour-coded sentence notes stay available as reference pages. Daily review and deck practice use the same word game.
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
5. From **Connect → App Frameworks → React (Vite)**, copy the two values into `.env.local`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   (An older `anon` key in `VITE_SUPABASE_ANON_KEY` also works. Never put the secret / `service_role` key in a `VITE_` variable: those go into the app.)

The publishable key is meant to be public. Row Level Security limits every row to its owner.

Check the setup any time with:

```bash
npm run check-supabase   # reads .env.local, never prints the key
```

It reports a missing table (`PGRST205 … schema cache`) or permission problem, and whether sign-ups are still open. If the tables are missing, re-run `supabase/schema.sql`; it is safe to run more than once.

If sync fails, the app keeps working: everything is saved on the phone first, and Settings shows what is wrong. The student can also choose **로그인 없이 이 휴대폰에서만 쓰기** on the login screen and log in later; the records merge.

### Adding words for the student from the dashboard

In **Table Editor → custom_words → Insert row**, fill in `en`, `ko` and `deck`, and set `user_id` to the student's UUID (shown under Authentication → Users). The word appears in the student's word list and today's review the next time the app opens or comes back to the foreground.

## Daily word test

The student memorises about 20 words a day and types them into **단어장** (one at a time, or **여러 개 붙여넣기**). **단어 테스트** on the home screen (`#/test`) then builds the day's test:

- **New words:** every word added on the most recent day that has words (up to 30). If that day has fewer than 20, older words that have never been tested fill it up to 20.
- **Review words:** 10, or more if the new words are few, so the test reaches 30. In this order: words missed or answered "모르겠어요" in the last test that had them; words marked ★ important; words the student keeps missing in review; then random older words, least recently tested first. If there are not enough of the student's own words, studied lesson words fill in.

Each question shows the English word with four meanings to pick from, plus a **모르겠어요** button so the student doesn't guess. Each word is asked once, and every answer also updates spaced repetition. Only finished tests are saved. They sync to the `word_tests` table, and the student can send and read them but not change them.

★ important can be set by the student (word list or word form) or by you (`npm run teacher -- star <word>`).

## Student notes → personal lessons

The student can leave a note from any lesson: the **메모** button in every stage header (the current card, word, sentence or question is picked for them), **왜 틀렸는지 모르겠다면** after a wrong quiz answer, or **내 메모** at the bottom of the lesson page. The form is fixed, not free text:

- **중요한 점**: "내 말로 정리하면" (required, 8+ characters) and an optional example sentence.
- **헷갈리는 점**: where they got stuck (뜻 / 문장 구조 / 문법 규칙 / 왜 정답? / 기타), "지금 내가 이해한 건" and "그런데 이게 헷갈려요" (both required, 8+ characters), how confused they are (1–3) and an optional sentence.

Notes are saved on the phone first, then uploaded to `lesson_notes`. Students can send and read their own notes but not change them. The lesson page shows each note's status: 보내는 중 → 선생님께 전달됨 → 레슨에 반영됨, plus your reply.

You answer with a **personal chapter**, a normal `Chapter` stored in `user_chapters` that only that student sees. A personal chapter with the same id as a base chapter replaces it for that student, which is how you change an existing lesson. Personal chapters are written as `personal/<chapter-id>.ts` (start from [`personal/_template.ts`](personal/_template.ts)) and uploaded with a local script:

```bash
npm run teacher -- notes            # new notes, with the lesson content each one points at
npm run teacher -- push personal/2026-11-14-me-ing.ts   # check, upload, mark the notes in meta.notes as done
npm run teacher -- done <note-id> --reply "..."         # reply without a lesson
npm run teacher -- chapters | pull <id> | rm <id> | users
npm run teacher -- progress [--days 14]   # study days, lesson stages and quiz scores, words added per day, review state, test summary
npm run teacher -- tests [--days 7]       # each word test: score, missed words; words missed twice or more
npm run teacher -- star postpone "in advance" [--off]   # mark the student's words as important
```

The script needs `SUPABASE_SECRET_KEY=sb_secret_...` in `.env.local` (Project Settings → API Keys → Secret keys). The key bypasses Row Level Security, so it stays on your machine; the script never prints it. `push` runs the same checks as the build and uploads nothing if one fails. The app checks each personal chapter again and skips any broken one. No redeploy is needed: the student gets new chapters on the next sync.

## Deploying to Vercel

1. Push this repo to GitHub, then **Add New → Project** in Vercel and import it. Vercel detects Vite; leave the defaults (`npm run build`, output `dist`).
2. Under **Settings → Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, then redeploy.
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
src/lib/wordtest.ts           which words go into the daily word test
src/screens/                  Home, Lesson, Cards, Review, WordTest, Words, WordForm, BulkAdd, Settings, Login
supabase/schema.sql           tables + row-level security
```
