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
- **A word list** ("N일차 단어"): write `english | 품사 | 뜻` lines to a file in the scratchpad, fixing obvious typos and adding 품사 yourself. Run `npm run teacher -- words add <file> --deck N일차 --date <that day>`, then `npm run teacher -- words` to confirm. Day 1 is 2026-11-12, Day 2 is 2026-11-13, and the next lesson is Day 3.
- **A word-test check**: `npm run teacher -- tests`. Report the scores, the words missed, and words missed twice or more. If a word keeps being missed, suggest `npm run teacher -- star <word>` or a lesson on it.

The student adds about 20 words a day themselves. The daily test is 20 newest + 10 review (see README "Daily word test"); the rules are in `src/lib/wordtest.ts`.

## UI

The UI is Astryx (block below). Screens use `Screen` from `src/components/Screen.tsx`; the app's own styles live only in `src/ui/styles.ts` (tokens only). Change colours, fonts or corners through the `notebook` theme editor, not CSS. After a UI change: `npm run build`, then `npx astryx doctor --built dist`, and screenshot the changed screen at phone width (390px) in light and dark mode before committing.

Never put the secret key (`SUPABASE_SECRET_KEY`) in a `VITE_` variable or in app code. The Supabase MCP refuses write statements in non-interactive sessions, so writes go through `npm run teacher`.

<!-- ASTRYX:START -->
Astryx v0.7.16 · 174 components
CLI: run every command as `npx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx template <Block>` for parts it lacks; `astryx component <Name>` to read props before using one.
Changing an existing page? Keep it: skip step 2 and add blocks/components inside its sections.
Before you deliver a build, run `astryx doctor --built <dir>`; don't deliver it if it fails.

RULES:
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then tokens (var(--color-*|--spacing-*|--radius-*)). No raw hex/px. No StyleX/Tailwind compiler here — don't use xstyle/utility classes directly. Some templates use StyleX and need a compiler plugin; see `astryx docs styling-overview`.
- THEMES: palettes and custom colors go through the theme, never :root overrides. To make or change a theme (colors, fonts, corners, spacing, a look from a picture), prefer the experimental theme editor over hand-written theme files: `astryx experimental theme editor new <name> --like neutral`, then `editor set <name> <thing> <value>` or `editor how "<what you want>"`; wire it with `astryx theme add <name>`; after each change look at it with `astryx experimental theme editor show <name> --png` and open the PNGs it writes (changes nothing in the app); a theme change is not done until you have looked at the pictures. In code, extend an imported theme to customize it; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any raw <div>/<span>, imported .css/@apply, or hardcoded #hex/px with the component or a token.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands and API reference
  docs authoring     build an integration package, and every field it holds
  upgrade --from <old version> --apply   run after a dependency bump
<!-- ASTRYX:END -->
