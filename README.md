# M-TOEIC

A small TOEIC study app for a beginner student who studies on a phone. It's live at
[m-toeic.vercel.app](https://m-toeic.vercel.app). Each chapter is written after a real class,
around whatever the student struggled with that day (`src/content/chapters/2026-11-11/`,
`2026-11-14/`, ...). A lesson inside a chapter has four short stages:

1. **개념 익히기**: the explanation, one card at a time.
2. **단어 게임**: meaning, reverse and listening picks, then a matching round. A missed word comes back
   later in the same round, and the first answer to each word goes into spaced repetition.
3. **뼈대 찾기**: tap the main verb, then the subject, of each sentence. A wrong tap says why ("that
   verb is inside a clause"), and then the colour-coded analysis is shown.
4. **실전 퀴즈**: TOEIC-style questions with an explanation for each.

Around the lessons there's a word book the student fills in every day, a daily word test, a
review tab with a Part 1 listening drill, and a 회화 tab where the student writes a few English
sentences that get an AI review before free talking with the teacher. A teacher account sees
every student's progress.

The lessons are written ahead of time into `src/content/` and the voice is the phone's own TTS, so
the app makes no AI calls at runtime except the writing review, which is capped at $2 a month.

React 19, Vite 8 and TypeScript, with plain CSS (`src/styles.css`). Routing uses the URL hash, so
the phone's back button works. Progress is saved in localStorage first and synced to Supabase when
it's configured. A service worker (`public/sw.js`) keeps it working offline, and it can be added
to the home screen.

## Development

```bash
npm install
npm run dev              # http://localhost:5173, plus a Network URL to open on a phone on the same Wi-Fi
npm test                 # tests/ with node --test
npm run check-content    # validate the lesson content
npm run build            # check-content, test, typecheck, then build to dist/
```

With no `.env.local` the app runs on that device only: there's no login, and the data stays in the
browser.

## Supabase

Supabase is optional, but without it the data doesn't survive a change of phone.

1. Create a project and run all of [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
   It's safe to run again.
2. Put the project URL and publishable key in `.env.local`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   The publishable key is meant to be public, because row level security limits every row to its
   owner. Never put the secret key in a `VITE_` variable, since those are bundled into the app.
3. Create accounts in Authentication → Users (check Auto Confirm User). Students can also sign up
   on `#/signup` if sign-ups are enabled. In that case, set the Site URL and Redirect URLs (the
   Vercel address and `http://localhost:5173`) so the confirmation link opens the right page.
   Supabase's own mailer only sends a few emails an hour.
4. `npm run check-supabase` reads `.env.local` and reports missing tables, permission problems and
   whether sign-ups are open. It never prints the key.

If sync fails, the app keeps working from the phone's copy, and Settings shows the error. A student
who starts without logging in (로그인 없이 이 휴대폰에서만 쓰기) can log in later, and the two sets
of records are merged.

## Teacher workflow

`npm run teacher` is a local script for everything that writes to a student's data. It needs
`SUPABASE_SECRET_KEY` in `.env.local`. That key bypasses row level security, so it never leaves
the machine, and the script never prints it.

```bash
npm run teacher -- progress [--days 14]        # study days, lesson stages, quiz scores, words per day
npm run teacher -- tests [--days 7]            # word test scores and words missed twice or more
npm run teacher -- writings [--days 14]        # 회화 writings, common mistakes, 표현집 tests, review cost
npm run teacher -- notes                       # new student notes, with the content each points at
npm run teacher -- done <note-id> --reply "…"  # answer a note without a new lesson
npm run teacher -- push personal/<id>.ts       # check and upload a personal chapter
npm run teacher -- words add day3.txt --deck 3일차 --date 2026-11-14   # lines: english | 품사 | 뜻
npm run teacher -- words [--deck 1일차] | words pos "place=동사 / 명사" | words dupes [--apply]
npm run teacher -- star <word> [--off]         # mark a word as important
npm run teacher -- role <email> teacher        # turn an account into a teacher account
npm run teacher -- chapters | pull <id> | rm <id> | users
```

With more than one student, add `--user <email>`.

Students can leave structured notes from any lesson stage, any word, or the home screen. A note is
either "what I understood" or "what confuses me", with required fields, not free text. A note is
answered with a reply, a personal chapter, or both. A personal chapter is an ordinary `Chapter` in
`personal/<id>.ts` (start from [`personal/_template.ts`](personal/_template.ts)) that only that
student sees. Giving it the id of an existing chapter replaces that chapter for them. `push` runs
the same checks as the build, and the student gets the chapter on their next sync with no redeploy.

## Daily word test

The student adds about 20 words a day to the word book, either one by one or by pasting lines like
`hold - (동) 들다`. `#/test` builds the day's test from them. It has the most recent day's words (up
to 30, topped up to 20 with older untested ones), plus at least 10 review words (enough to reach
30 questions in total): words missed last time,
words marked ★, words that keep failing in review, then the least recently tested. Each question
gives four meanings and a 모르겠어요 button. The rules are in `src/lib/wordtest.ts`.

The wrong options are spread across the whole test so the same ones don't keep coming back. They
also match the answer's part of speech, and none of them shares a meaning with it
(`src/lib/game.ts`). A word with meanings for two parts of speech (`shade`: 그늘지게 하다 / 그늘) is
asked one meaning at a time. A word missed in two tests is flipped: the meaning is shown, and the
student types the English, with one typo allowed in longer words. Only finished tests are saved,
in `word_tests`.

## 회화: writing review

The 회화 tab (`#/talk`) runs a daily loop. The student writes a few sentences (Korean is fine for
words they don't know: `I went to 은행.`), passes a short self-check, and submits. The Supabase Edge
Function `review-writing` checks the login and the limits, asks Claude for a structured review, and
saves it in `writings`.

The review has:

- scores
- per-sentence corrections with a Korean reason for each fix
- correct but unnatural phrases
- up to three points to remember
- a corrected version and a natural rewrite, both of which can be read aloud
- 3–5 questions for free talking with the teacher

Afterwards the teacher saves a short talk note on the writing.

The prompt, response schema and cost table are in `supabase/functions/review-writing/review.ts`,
which the function, the app and `tests/writing.test.ts` all share. Setup goes in the function's
secrets:

- `ANTHROPIC_API_KEY`: required.
- `REVIEW_MODEL`: defaults to `claude-opus-5-5`.
- `REVIEW_EFFORT`: `low` is about $0.06 and 20 s per review, `medium` about $0.09 and 35 s.
- `REVIEWS_PER_DAY`: per student, default 3.
- `REVIEW_MONTHLY_USD`: for everyone combined, default 2.

Deploy it with `verify_jwt: false` (it checks the login itself) and upload both files.

### 표현집 and phrase tests

Each review also returns 4–8 phrases in the same call (`review.phrases`): the student's mistakes
first, then correct but unnatural phrases, then useful ones from the natural rewrite. Each has a
Korean meaning, what the student wrote, why, the word to blank out and three wrong options. Writings
reviewed before this get phrases from their corrected sentences, without a Korean meaning.

- **표현집** (`#/talk/phrases`): every phrase, newest first, filtered by 틀린 표현, AI 추천,
  내가 넣음 or 자주 틀림 (missed twice or more). The student can add their own and hide AI ones.
- **표현 테스트** (`#/talk/phrases/test`): up to 10 phrases, due ones first, then new ones. Each
  review page can also test just its own phrases. Questions get harder as a phrase is learned:
  pick the right sentence or fill the blank from options, then put the words in order or type the
  blank, then say it from the Korean and check yourself. Same intervals as words.

Phrase test state and the student's own phrases are saved in the synced `progress` row
(`progress.phrases`, `progress.myPhrases`), apart from the word `srs`. The logic is in
`src/lib/phrases.ts`, with tests in `tests/phrases.test.ts`.

## Teacher account

An account whose `app_metadata.role` is `teacher` gets a 학생 현황 screen instead of the student
screens. It lists every student, starting with those falling behind. A student is behind when:

- a lesson is past its due date, or
- they haven't studied or taken a word test for 2 days, or
- more than 30 review words are overdue.

These rules are in `src/lib/analytics.ts`.

The per-student page shows the last 14 days, each lesson's stages, recent tests, repeatedly missed
words, notes and writings. The only things a teacher can write from the app are lesson due dates
(2 days after the class by default) and talk notes. Everything else goes through
`npm run teacher`. Only the secret key can change `app_metadata`, so a student can't promote
themselves.

## Deploying

Vercel builds `main` with the defaults (`npm run build` → `dist`). Set `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` in the project's environment variables. Because the build runs the
content check and the tests, a broken chapter fails the build instead of reaching the student.

To add a chapter after a class, see [CONTENT_GUIDE.md](CONTENT_GUIDE.md).

## Layout

```
src/content/            lesson schema (types.ts), sentence markup parser, chapters/ by class date, part1.ts
src/lib/store.ts        local state and actions
src/lib/sync.ts         Supabase sync: pull, newest-wins merge per item, push
src/lib/srs.ts          Leitner boxes at 1, 3, 7, 14, 30 and 60 days
src/lib/wordtest.ts     which words go into the daily test
src/lib/game.ts         wrong options and typed-answer checking
src/lib/analytics.ts    the teacher's "behind" rules
src/screens/            one file per screen (Home, Lesson, WordTest, Talk, Teacher, ...)
scripts/                check-content, check-supabase, teacher
supabase/               schema.sql and the review-writing function
tests/                  unit tests
```
