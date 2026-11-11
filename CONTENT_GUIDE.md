# Adding a chapter

One chapter = one class = the things the student struggled with in that class.
The schema lives in [`src/content/types.ts`](src/content/types.ts); today's chapter, [`src/content/chapters/2026-11-11/`](src/content/chapters/2026-11-11/), is the reference example.

## Workflow

1. After class, give Claude something like:
   > Today (2026-11-18) the student struggled with: tense (present perfect vs past), passive voice. Make a chapter.
2. Claude creates `src/content/chapters/2026-11-18/` with one file per lesson plus an `index.ts`, and registers it in `src/content/chapters/index.ts`.
3. `npm run build`: the content checker catches broken markup, out-of-range answers and duplicate ids.
4. `npm run dev` and check it on a phone, then `git push`. Vercel deploys it.

## Rules (for whoever writes the content)

**Audience.** The student is a near-zero-base adult learner reading on a phone. All explanations are in Korean, short, friendly 해요체. Example sentences are TOEIC-style office/business English and kept short (aim for ≤ 15 words; the combined drill can go longer).

**Ids are permanent.** Chapter id `YYYY-MM-DD-slug`, and lesson, sentence and quiz ids are keys for the student's saved progress. Never rename them after release; fix the text instead.

**Lesson shape.** Aim for about 4–6 sections, 8–30 words, 5–8 sentences and 8–12 quiz questions. Finish each chapter with a combined drill lesson that mixes everything in it.

**Words.** The `group` field drives the headings in the word tab. If the same English word already exists in an earlier lesson with a *different* meaning, give it an explicit `id` (e.g. `'since-conj'`); otherwise the two share one review record. The checker warns about this.

**Sentence markup** (`sentences[].text`):

```
[The report|S] [that|REL|note shown on tap] [you|s] [sent|v] [was|V] [helpful|C].
```

- Tags: `S V O C MOD PREP CONJ REL N ADJ ADV`.
- **UPPERCASE** = main clause. **lowercase** = inside a subordinate/relative clause (shown dashed, faded in "skeleton" view).
- Only uppercase `S/V/O/C/MOD` survive "뼈대만 보기", so make sure the main-clause skeleton is fully tagged.
- Untagged text is fine (articles, prepositional objects, punctuation).
- `slash` uses ` / ` between chunks, in English order. `note` is a one-line takeaway (usually `뼈대: …`).

**Quiz.**
- `mc`: `____` marks the blank; `answer` is a 0-based index; give `ko` (the translation) whenever the question is an English sentence.
- `tap`: wrap exactly one answer chunk in `*stars*` (multi-word allowed: `*next to*`).
- Every question needs an `explain` that teaches the *rule* (e.g. "빈칸 뒤 명사 → 전치사"), not just the answer.

**Copyright.** Write original sentences only. Never copy questions from 기출문제집 or other published books.
