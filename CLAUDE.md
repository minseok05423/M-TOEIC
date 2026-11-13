# M-TOEIC

TOEIC study PWA for one beginner student (phone only). README.md covers setup; CONTENT_GUIDE.md covers content rules.

## Turning student notes into personal lessons

When asked to handle the student's notes:

1. `npm run teacher -- notes` lists new notes. Each one shows what the student understood, what confuses them, and the lesson content it points at.
2. Decide per note: add a new personal chapter, change an existing lesson for this student, or just reply (`npm run teacher -- done <id> --reply "..."`).
3. Write or edit `personal/<chapter-id>.ts`, starting from `personal/_template.ts`. Follow CONTENT_GUIDE.md: the student is a near-zero beginner, so explain in Korean, keep sentences short, and tag every sentence's main verb as `V`. Put each answered note id in `meta.notes` with a short Korean reply for the student.
4. `npm run check-content` and `npx tsc --noEmit -p .`, then `npm run teacher -- push personal/<file>.ts`.
5. Commit the `personal/` file so the source stays in the repo.

## Daily routine with the teacher

The teacher sends a rough lesson topic almost every day and asks for progress and word-test checks.

- **A topic** ("오늘은 분사구문"): write a new chapter in `src/content/chapters/YYYY-MM-DD/` following CONTENT_GUIDE.md. Fill in the explanation, words, sentences and quiz yourself from the topic. Run `npm run build`, then commit and push (Vercel redeploys from `main`). If the topic answers a student note, a personal chapter (above) may fit better.
- **A progress check**: `npm run teacher -- progress`. Report in Korean: days studied, lessons and stages done, quiz scores, words added per day.
- **A word-test check**: `npm run teacher -- tests`. Report the scores, the words missed, and words missed twice or more. If a word keeps being missed, suggest `npm run teacher -- star <word>` or a lesson on it.

The student adds about 20 words a day themselves. The daily test is 20 newest + 10 review (see README "Daily word test"); the rules are in `src/lib/wordtest.ts`.

Never put the secret key (`SUPABASE_SECRET_KEY`) in a `VITE_` variable or in app code. The Supabase MCP refuses write statements in non-interactive sessions, so writes go through `npm run teacher`.
