# M-TOEIC

TOEIC study PWA for one beginner student (phone only). README.md covers setup; CONTENT_GUIDE.md covers content rules.

## Turning student notes into personal lessons

When asked to handle the student's notes:

1. `npm run teacher -- notes` lists new notes. Each one shows what the student understood, what confuses them, the screen it was written on, and the lesson content it points at. Notes can also be about a single word or general (no lesson); those usually just need a reply.
2. Decide per note: add a new personal chapter, change an existing lesson for this student, or just reply (`npm run teacher -- done <id> --reply "..."`).
3. Write or edit `personal/<chapter-id>.ts`, starting from `personal/_template.ts`. Follow CONTENT_GUIDE.md: the student is a near-zero beginner, so explain in Korean, keep sentences short, and tag every sentence's main verb as `V`. Put each answered note id in `meta.notes` with a short Korean reply for the student.
4. `npm run check-content` and `npx tsc --noEmit -p .`, then `npm run teacher -- push personal/<file>.ts`.
5. Commit the `personal/` file so the source stays in the repo.

## Daily routine with the teacher

The teacher sends a rough lesson topic almost every day and asks for progress and word-test checks.

- **A topic** ("오늘은 분사구문"): write a new chapter in `src/content/chapters/YYYY-MM-DD/` following CONTENT_GUIDE.md. Fill in the explanation, words, sentences and quiz yourself from the topic. Run `npm run build`, then commit and push (Vercel redeploys from `main`). If the topic answers a student note, a personal chapter (above) may fit better.
- **A progress check**: `npm run teacher -- progress`. Report in Korean: days studied, lessons and stages done, quiz scores, words added per day. The teacher account also sees this in the app (학생 현황, rules in `src/lib/analytics.ts`); keep the two consistent.
- **A word list** ("N일차 단어"): write `english | 품사 | 뜻` lines to a file in the scratchpad, fixing obvious typos and adding 품사 yourself. Run `npm run teacher -- words add <file> --deck N일차 --date <that day>`, then `npm run teacher -- words` to confirm. Day 1 is 2026-11-12, Day 2 is 2026-11-13, and the next lesson is Day 3.
- **A writing check** (회화 탭): `npm run teacher -- writings`. Report in Korean: writings per day, scores, the mistakes that keep coming back, whether free talking happened, 표현집 test results (phrases missed twice or more), and this month's review cost. A mistake that recurs across days is a good next lesson topic. To change how the AI reviews, edit `supabase/functions/review-writing/review.ts`, run `npm test`, then redeploy the function (README "회화").
- **A word-test check**: `npm run teacher -- tests`. Report the scores, the words missed, and words missed twice or more. If a word keeps being missed, suggest `npm run teacher -- star <word>` or a lesson on it.

With more than one student, teacher commands need `--user <email>`. Duplicate words: `npm run teacher -- words dupes` (plan), then `--apply` only after the user agrees, since it changes the student's word book.

The student adds about 20 words a day themselves. The daily test is 20 newest + 10 review (see README "Daily word test"); the rules are in `src/lib/wordtest.ts`.

## Cloud sessions (from the phone)

The user often sends the daily topic from the Claude app (Code tab), which runs a cloud session on this GitHub repo. `scripts/cloud-setup.sh` (SessionStart hook in `.claude/settings.json`) installs Node 24 and runs `npm ci`; if `npm run build` fails with a Node version or "cannot find module" error, run `bash scripts/cloud-setup.sh` again.

- Release = push to `main`. After `npm run build` passes, commit and run `git push origin HEAD:main` so Vercel deploys. Don't stop at a `claude/...` branch or a PR unless the user asks; Vercel only deploys `main` to the student.
- `npm run teacher` needs `SUPABASE_SECRET_KEY`, which cloud sessions don't have (no `.env.local`). Without it, progress, tests, notes, word lists and personal-chapter pushes can't run. Say so in one line and suggest doing it from the codespace, or the 학생 현황 screen in the app for progress. Don't ask the user to paste the key into the chat.
- The Supabase MCP isn't available there either.

## UI

The UI is plain React with one hand-written stylesheet, `src/styles.css` ("수업 노트" look: paper, ink, highlighter yellow, red/green pen; colours are the tokens at its top, with a dark-mode block). The user tried an Astryx rewrite (branch `astryx-rewrite`) and preferred this design, so keep it. `npm run build` runs `npm test` (tests/, Node's test runner); add a test when you change logic in `src/lib/`. After a UI change, screenshot the changed screen at phone width (390px) in light and dark mode before committing.

Never put the secret key (`SUPABASE_SECRET_KEY`) in a `VITE_` variable or in app code. The Supabase MCP refuses write statements in non-interactive sessions, so writes go through `npm run teacher`.
