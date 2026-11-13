# M-TOEIC

TOEIC study PWA for one beginner student (phone only). README.md covers setup; CONTENT_GUIDE.md covers content rules.

## Turning student notes into personal lessons

When asked to handle the student's notes:

1. `npm run teacher -- notes` lists new notes. Each one shows what the student understood, what confuses them, and the lesson content it points at.
2. Decide per note: add a new personal chapter, change an existing lesson for this student, or just reply (`npm run teacher -- done <id> --reply "..."`).
3. Write or edit `personal/<chapter-id>.ts`, starting from `personal/_template.ts`. Follow CONTENT_GUIDE.md: the student is a near-zero beginner, so explain in Korean, keep sentences short, and tag every sentence's main verb as `V`. Put each answered note id in `meta.notes` with a short Korean reply for the student.
4. `npm run check-content` and `npx tsc --noEmit -p .`, then `npm run teacher -- push personal/<file>.ts`.
5. Commit the `personal/` file so the source stays in the repo.

Never put the secret key (`SUPABASE_SECRET_KEY`) in a `VITE_` variable or in app code. The Supabase MCP refuses write statements in non-interactive sessions, so writes go through `npm run teacher`.
