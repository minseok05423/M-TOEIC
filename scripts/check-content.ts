/**
 * 콘텐츠 검사기. `npm run check-content` (빌드할 때 자동 실행)
 * 정답 번호 범위, 탭 문제 별표, 문장 마크업 태그, id 중복 등을 검사합니다.
 */
import { CHAPTERS } from '../src/content/chapters/index.ts'
import { parseMarkup, TAG_KEYS } from '../src/content/markup.ts'

const errors: string[] = []
const warnings: string[] = []
const err = (where: string, msg: string) => errors.push(`✗ ${where}: ${msg}`)
const warn = (where: string, msg: string) => warnings.push(`△ ${where}: ${msg}`)

function dupes(ids: string[]): string[] {
  const seen = new Set<string>()
  const out = new Set<string>()
  for (const id of ids) (seen.has(id) ? out : seen).add(id)
  return [...out]
}

const globalWords = new Map<string, { ko: string; where: string }>()
let counts = { lessons: 0, words: 0, sentences: 0, quiz: 0 }

for (const d of dupes(CHAPTERS.map((c) => c.id))) err('chapters', `챕터 id 중복: ${d}`)

for (const ch of CHAPTERS) {
  const cw = `[${ch.id}]`
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(ch.id)) err(cw, `챕터 id 형식은 'YYYY-MM-DD-slug' (소문자/숫자/-)`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ch.date)) err(cw, `date 형식은 'YYYY-MM-DD'`)
  else if (!ch.id.startsWith(ch.date)) warn(cw, `id 가 date(${ch.date}) 로 시작하지 않음`)
  if (ch.lessons.length === 0) err(cw, '레슨이 없음')
  for (const d of dupes(ch.lessons.map((l) => l.id))) err(cw, `레슨 id 중복: ${d}`)

  for (const l of ch.lessons) {
    counts.lessons++
    const lw = `${cw} ${l.id}`
    if (!/^[a-z0-9-]+$/.test(l.id)) err(lw, '레슨 id 는 소문자/숫자/- 만')

    for (const s of l.sections) {
      if (s.table) {
        const n = s.table[0]?.length ?? 0
        s.table.forEach((row, i) => {
          if (row.length !== n) err(`${lw} 설명 "${s.heading}"`, `표 ${i + 1}행 칸 수(${row.length}) ≠ 헤더(${n})`)
        })
      }
    }

    // 단어
    const wordKeys = l.words.map((w) => (w.id ?? w.en).toLowerCase())
    for (const d of dupes(wordKeys)) err(lw, `단어 중복: ${d}`)
    for (const w of l.words) {
      counts.words++
      if (!w.en.trim() || !w.ko.trim()) err(lw, `빈 단어: ${JSON.stringify(w)}`)
      const key = (w.id ?? w.en).toLowerCase()
      const prev = globalWords.get(key)
      if (prev && prev.ko !== w.ko)
        warn(lw, `"${w.en}" 이(가) ${prev.where} 에도 다른 뜻으로 있음 → 복습 기록을 공유함. 따로 외우게 하려면 id 를 다르게`)
      else if (!prev) globalWords.set(key, { ko: w.ko, where: lw })
    }

    // 문장
    for (const d of dupes(l.sentences.map((s) => s.id))) err(lw, `문장 id 중복: ${d}`)
    for (const s of l.sentences) {
      counts.sentences++
      const sw = `${lw} 문장 ${s.id}`
      const tokens = parseMarkup(s.text)
      for (const t of tokens) {
        if (t.tag === undefined) {
          if (/[[\]|]/.test(t.text)) err(sw, `마크업이 깨짐 (닫히지 않은 [ ] 또는 | ): "${t.text.trim()}"`)
        } else if (!TAG_KEYS.includes(t.tag.toLowerCase())) err(sw, `모르는 태그 "${t.tag}" (가능: ${TAG_KEYS.join(', ')})`)
      }
      if (!tokens.some((t) => t.tag)) warn(sw, '색칠된 부분이 하나도 없음')
    }

    // 퀴즈
    for (const d of dupes(l.quiz.map((q) => q.id))) err(lw, `퀴즈 id 중복: ${d}`)
    for (const q of l.quiz) {
      counts.quiz++
      const qw = `${lw} 퀴즈 ${q.id}`
      if (!q.explain.trim()) err(qw, '해설(explain)이 비어 있음')
      if (q.type === 'mc') {
        if (q.choices.length < 2) err(qw, '보기가 2개 미만')
        if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length)
          err(qw, `answer ${q.answer} 가 보기 범위(0~${q.choices.length - 1}) 밖`)
        for (const d of dupes(q.choices)) err(qw, `보기 중복: ${d}`)
      } else if (q.type === 'tap') {
        const stars = (q.text.match(/\*/g) ?? []).length
        if (stars !== 2) err(qw, `정답을 *별표* 한 쌍으로 감싸야 함 (지금 별표 ${stars}개)`)
      } else {
        err(qw, `모르는 문제 type: ${(q as { type: string }).type}`)
      }
    }
  }
}

for (const w of warnings) console.log(w)
for (const e of errors) console.log(e)
console.log(
  `\n챕터 ${CHAPTERS.length} · 레슨 ${counts.lessons} · 단어 ${counts.words} · 문장 ${counts.sentences} · 퀴즈 ${counts.quiz}`,
)
if (errors.length) {
  console.log(`\n콘텐츠 오류 ${errors.length}개 — 고친 뒤 다시 실행하세요.`)
  process.exit(1)
}
console.log('콘텐츠 OK ✓')
