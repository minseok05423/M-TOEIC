/**
 * 챕터 검사기. 빌드(check-content), 맞춤 챕터 올리기(teacher push), 앱(서버에서 받은 맞춤 챕터) 이 같이 씀.
 * 정답 번호 범위, 탭 문제 별표, 문장 마크업 태그, id 중복, (JSON 으로 온 경우) 모양까지 검사합니다.
 */
import type { Chapter } from './types.ts'
import { parseMarkup, TAG_KEYS } from './markup.ts'

export interface ValidateResult {
  errors: string[]
  warnings: string[]
  counts: { chapters: number; lessons: number; words: number; sentences: number; quiz: number }
}

function dupes(ids: string[]): string[] {
  const seen = new Set<string>()
  const out = new Set<string>()
  for (const id of ids) (seen.has(id) ? out : seen).add(id)
  return [...out]
}

const isStr = (v: unknown): v is string => typeof v === 'string'
const isArr = Array.isArray

/** 타입 검사 없이 들어온 JSON 의 모양만 확인 (빠진 배열·문자열 등). 통과해야 아래 내용 검사를 할 수 있음 */
function shapeErrors(ch: unknown): string[] {
  const out: string[] = []
  const c = ch as Record<string, unknown>
  const where = `[${isStr(c?.id) ? c.id : '?'}]`
  if (!c || typeof c !== 'object') return [`${where}: 챕터가 객체가 아님`]
  for (const k of ['id', 'date', 'title', 'reason']) if (!isStr(c[k])) out.push(`${where}: ${k} (문자열) 없음`)
  if (!isArr(c.lessons)) return [...out, `${where}: lessons (배열) 없음`]
  ;(c.lessons as Record<string, unknown>[]).forEach((l, i) => {
    const lw = `${where} 레슨 ${isStr(l?.id) ? l.id : `#${i + 1}`}`
    if (!l || typeof l !== 'object') return out.push(`${lw}: 객체가 아님`)
    for (const k of ['id', 'title', 'summary']) if (!isStr(l[k])) out.push(`${lw}: ${k} (문자열) 없음`)
    for (const k of ['sections', 'words', 'sentences', 'quiz']) if (!isArr(l[k])) out.push(`${lw}: ${k} (배열) 없음`)
    if (isArr(l.sections))
      (l.sections as Record<string, unknown>[]).forEach((s, j) => {
        if (!isStr(s?.heading) || !isStr(s?.body)) out.push(`${lw} 설명 #${j + 1}: heading·body 필요`)
      })
    if (isArr(l.words))
      (l.words as Record<string, unknown>[]).forEach((w, j) => {
        if (!isStr(w?.en) || !isStr(w?.ko)) out.push(`${lw} 단어 #${j + 1}: en·ko 필요`)
        if (w?.pos !== undefined && !isStr(w.pos)) out.push(`${lw} 단어 #${j + 1}: pos 는 글자여야 해요`)
      })
    if (isArr(l.sentences))
      (l.sentences as Record<string, unknown>[]).forEach((s, j) => {
        if (!isStr(s?.id) || !isStr(s?.text) || !isStr(s?.ko)) out.push(`${lw} 문장 #${j + 1}: id·text·ko 필요`)
      })
    if (isArr(l.quiz))
      (l.quiz as Record<string, unknown>[]).forEach((q, j) => {
        const qw = `${lw} 퀴즈 #${j + 1}`
        if (!isStr(q?.id) || !isStr(q?.explain)) out.push(`${qw}: id·explain 필요`)
        else if (q.type === 'mc' && (!isStr(q.q) || !isArr(q.choices) || typeof q.answer !== 'number')) out.push(`${qw}: q·choices·answer 필요`)
        else if (q.type === 'tap' && (!isStr(q.prompt) || !isStr(q.text))) out.push(`${qw}: prompt·text 필요`)
      })
  })
  return out
}

export function validateChapters(chapters: unknown[]): ValidateResult {
  const errors: string[] = []
  const warnings: string[] = []
  const err = (where: string, msg: string) => errors.push(`✗ ${where}: ${msg}`)
  const warn = (where: string, msg: string) => warnings.push(`△ ${where}: ${msg}`)
  const counts = { chapters: 0, lessons: 0, words: 0, sentences: 0, quiz: 0 }

  const ok: Chapter[] = []
  for (const ch of chapters) {
    const shape = shapeErrors(ch)
    if (shape.length) errors.push(...shape.map((m) => `✗ ${m}`))
    else ok.push(ch as Chapter)
  }

  for (const d of dupes(ok.map((c) => c.id))) err('chapters', `챕터 id 중복: ${d}`)
  const globalWords = new Map<string, { ko: string; where: string }>()

  for (const ch of ok) {
    counts.chapters++
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
      if (l.sections.length === 0) err(lw, '설명(sections)이 없음')
      if (l.quiz.length === 0) err(lw, '퀴즈가 없음')
      if (l.sentences.length === 0) err(lw, "문장이 없음 ('뼈대 찾기' 단계에 필요)")

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
        // '뼈대 찾기' 게임은 대문자 V(주절 동사)를 눌러서 찾는 문제라 꼭 있어야 함. S 는 있으면 두 번째 문제로 나옴
        if (!tokens.some((t) => t.tag === 'V')) err(sw, "주절 동사에 [..|V] 태그가 없음 ('뼈대 찾기' 게임에 필요)")
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
  return { errors, warnings, counts }
}
