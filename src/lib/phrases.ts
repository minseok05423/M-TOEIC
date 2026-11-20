import { normalizePhrase, type PhraseKind, type Review } from '../../supabase/functions/review-writing/review.ts'
import type { MyPhrase, PhraseCard } from './store.ts'
import { today } from './date.ts'

/**
 * 표현집 (회화 탭 #/talk/phrases).
 * - AI 표현: 작문 검수(review.phrases)에서. 예전 검수는 고친 문장 · 아쉬운 표현에서 만들어요.
 * - 내 표현: 학생이 직접 넣은 것 (progress.myPhrases).
 * - 테스트 기록은 progress.phrases (단어와 같은 상자 방식, lib/srs.ts).
 * 이 파일은 화면 없이 계산만 해요 (tests/phrases.test.ts).
 */

export type PhraseSource = PhraseKind | 'mine'

export interface Phrase {
  /** 'w:<작문 id>:<번호>' · 'm:<내 표현 id>' (= progress.phrases 의 key) */
  id: string
  en: string
  ko: string
  kind: PhraseSource
  /** 학생이 쓴 틀린 모양 (없으면 '') */
  wrong: string
  why: string
  /** 빈칸으로 만들 부분 (en 안에 있음). 없으면 '' */
  blank: string
  /** 빈칸 오답 보기 */
  choices: string[]
  /** 표현집에 들어온 날 'YYYY-MM-DD' */
  day: string
  /** 정렬용 (최근 것이 큼) */
  at: number
  writingId?: string
  topic?: string | null
  note?: string
}

export const SOURCE_LABEL: Record<PhraseSource, string> = {
  fix: '틀린 표현',
  better: '아쉬운 표현',
  useful: 'AI 추천',
  mine: '내가 넣음',
}

/** 작문 한 편에서 표현집에 넣을 수 있는 최대 수 */
export const PER_WRITING = 8

const words = (t: string) => t.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/g) ?? []
export const norm = (t: string) =>
  t
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[.,!?;:"“”()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** 빈칸을 못 받았을 때: 가장 긴 단어 (3글자 이상). 없으면 '' */
export function pickBlank(en: string): string {
  let best = ''
  for (const w of words(en)) if (w.length >= 3 && w.length > best.length) best = w
  return best
}

interface WritingLike {
  id: string
  day: string
  topic: string | null
  created_at: string
  review: Review
}

/** 예전 검수 (phrases 칸이 없던 때): 고친 문장 → 틀린 표현, 아쉬운 표현 → 아쉬운 표현. 한국어 뜻은 없어요 */
function legacy(r: Review): unknown[] {
  const out: unknown[] = []
  for (const s of r.sentences) {
    if (s.verdict === 'ok' || norm(s.corrected) === norm(s.original)) continue
    const i = s.issues.find((x) => x.right && s.corrected.toLowerCase().includes(x.right.toLowerCase()))
    out.push({
      en: s.corrected,
      ko: '',
      kind: s.verdict === 'fix' ? 'fix' : 'better',
      wrong: s.original,
      why: s.issues.map((x) => x.why).filter(Boolean)[0] ?? '',
      blank: i?.right ?? '',
      choices: i?.wrong ? [i.wrong] : [],
    })
  }
  for (const b of r.better) out.push({ en: b.better, ko: '', kind: 'better', wrong: b.original, why: b.why, blank: '', choices: [] })
  return out
}

/** 작문 한 편의 표현들 (같은 영어는 한 번만) */
export function phrasesFromWriting(w: WritingLike): Phrase[] {
  const raw = w.review.phrases?.length ? w.review.phrases : legacy(w.review)
  const seen = new Set<string>()
  const out: Phrase[] = []
  const base = Date.parse(w.created_at) || 0
  raw.forEach((x, i) => {
    const p = normalizePhrase(x)
    if (!p || seen.has(norm(p.en)) || out.length >= PER_WRITING) return
    seen.add(norm(p.en))
    out.push({ ...p, blank: p.blank || pickBlank(p.en), id: `w:${w.id}:${i}`, day: w.day, at: base - i, writingId: w.id, topic: w.topic })
  })
  return out
}

export function fromMine(m: MyPhrase): Phrase {
  const d = new Date(m.createdAt)
  return {
    id: `m:${m.id}`,
    en: m.en,
    ko: m.ko,
    kind: 'mine',
    wrong: '',
    why: '',
    blank: pickBlank(m.en),
    choices: [],
    day: today(d),
    at: m.createdAt,
    note: m.note,
  }
}

/** 표현집 전체: 최근 것부터. 숨긴 것은 따로 */
export function buildLibrary(
  writings: WritingLike[],
  mine: Record<string, MyPhrase> | undefined,
  cards: Record<string, PhraseCard> | undefined,
): { shown: Phrase[]; hidden: Phrase[] } {
  const all = [...writings.flatMap(phrasesFromWriting), ...Object.values(mine ?? {}).filter((m) => !m.deleted).map(fromMine)].sort((a, b) => b.at - a.at)
  return { shown: all.filter((p) => !cards?.[p.id]?.hidden), hidden: all.filter((p) => cards?.[p.id]?.hidden) }
}

// ───────── 외운 정도 ─────────

export type Status = 'new' | 'again' | 'learning' | 'known'
export const STATUS_LABEL: Record<Status, string> = { new: '새 표현', again: '다시 보기', learning: '익히는 중', known: '외움' }

export function status(c: PhraseCard | undefined): Status {
  if (!c?.reps) return 'new'
  if (c.box === 0) return 'again'
  return c.box <= 2 ? 'learning' : 'known'
}

/** 두 번 이상 틀린 표현 (표현집 "자주 틀림", 단어 테스트와 같은 기준) */
export const weak = (c: PhraseCard | undefined) => (c?.lapses ?? 0) >= 2

// ───────── 테스트 계획 ─────────

export const TEST_SIZE = 10

/** 오늘 볼 표현: 복습할 차례(덜 외운 것부터) → 아직 안 본 새 표현(최근 것부터). 최대 TEST_SIZE */
export function planTest(phrases: Phrase[], cards: Record<string, PhraseCard> | undefined, day = today(), max = TEST_SIZE) {
  const c = (p: Phrase) => cards?.[p.id]
  const due = phrases
    .filter((p) => c(p)?.reps && c(p)!.due <= day)
    .sort((a, b) => c(a)!.box - c(b)!.box || c(b)!.lapses - c(a)!.lapses)
  const fresh = phrases.filter((p) => !c(p)?.reps)
  const items = [...due, ...fresh].slice(0, max)
  return { items, due: due.length, fresh: fresh.length }
}

/** 오늘 볼 것이 없을 때 "그래도 연습": 덜 외운 것 · 자주 틀린 것 · 오래 안 본 것부터 */
export function practicePick(phrases: Phrase[], cards: Record<string, PhraseCard> | undefined, max = TEST_SIZE): Phrase[] {
  const c = (p: Phrase) => cards?.[p.id]
  return [...phrases]
    .sort((a, b) => (c(a)?.box ?? 0) - (c(b)?.box ?? 0) || (c(b)?.lapses ?? 0) - (c(a)?.lapses ?? 0) || (c(a)?.u ?? 0) - (c(b)?.u ?? 0))
    .slice(0, max)
}

// ───────── 문제 모양 ─────────

/**
 * pick-right  바른 문장 고르기 (내가 쓴 것 vs 고친 것)
 * cloze-pick  빈칸 고르기
 * order       단어 순서 맞추기
 * cloze-type  빈칸 직접 쓰기
 * speak       한국어 보고 영어로 말하기 (스스로 채점)
 */
export type Form = 'pick-right' | 'cloze-pick' | 'order' | 'cloze-type' | 'speak'

export const FORM_LABEL: Record<Form, string> = {
  'pick-right': '바른 문장 고르기',
  'cloze-pick': '빈칸 고르기',
  order: '순서 맞추기',
  'cloze-type': '빈칸 쓰기',
  speak: '말해 보기',
}

/** 단어 순서 맞추기 조각: 띄어쓰기로 나누고 끝 문장 부호는 뺌 */
export function orderTokens(en: string): string[] {
  return en
    .trim()
    .replace(/[.!?]+$/, '')
    .split(/\s+/)
    .filter(Boolean)
}

export function formsFor(p: Phrase): Form[] {
  const out: Form[] = []
  // 대문자 · 마침표만 틀린 것도 문제로 냄 (그래서 norm 이 아니라 글자 그대로 비교)
  if (p.wrong && p.wrong.trim() !== p.en.trim() && p.wrong.length <= 160) out.push('pick-right')
  if (p.blank && p.choices.length) out.push('cloze-pick')
  const n = orderTokens(p.en).length
  if (n >= 3 && n <= 12) out.push('order')
  if (p.blank) out.push('cloze-type')
  if (p.ko) out.push('speak')
  return out
}

/** 외운 정도에 따라 쉬운 것 → 어려운 것. 같은 단계 안에서는 i 로 번갈아 (한 테스트가 한 모양만 나오지 않게) */
const TIERS: Form[][] = [
  ['pick-right', 'cloze-pick', 'order', 'cloze-type', 'speak'],
  ['cloze-pick', 'order', 'cloze-type', 'pick-right', 'speak'],
  ['order', 'cloze-type', 'speak', 'cloze-pick', 'pick-right'],
]

/** 단계마다 앞에서 몇 개를 번갈아 낼지 (잘 외운 표현은 말해 보기까지) */
const SPREAD = [2, 2, 3]

export function chooseForm(p: Phrase, c: PhraseCard | undefined, i = 0): Form | null {
  const box = c?.reps ? c.box : 0
  const t = box === 0 ? 0 : box <= 2 ? 1 : 2
  const have = new Set(formsFor(p))
  const tier = TIERS[t].filter((f) => have.has(f))
  if (!tier.length) return null
  return tier[i % Math.min(SPREAD[t], tier.length)]
}

/** 빈칸 앞 · 뒤 (대소문자 상관없이 처음 나온 곳) */
export function clozeParts(en: string, blank: string): [string, string] {
  const i = en.toLowerCase().indexOf(blank.toLowerCase())
  if (i < 0) return [en, '']
  return [en.slice(0, i), en.slice(i + blank.length)]
}

/** 바른 문장 고르기 보기: 정답(en) · 내가 쓴 것 · (있으면) 빈칸에 오답을 넣은 것. 겹치면 뺌 */
export function rightOptions(p: Phrase): string[] {
  const out = [p.en]
  const add = (t: string) => {
    if (t && !out.some((x) => x.trim() === t.trim())) out.push(t)
  }
  add(p.wrong)
  if (p.blank && p.choices[0]) {
    const [a, b] = clozeParts(p.en, p.blank)
    add(a + p.choices[0] + b)
  }
  return out
}

function distance(a: string, b: string): number {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]
    d[0] = i
    for (let j = 1; j <= b.length; j++) {
      const t = d[j]
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = t
    }
  }
  return d[b.length]
}

/**
 * 빈칸 쓰기 채점: 문장 부호 무시. 대소문자만 다르거나, 4글자 이상에서 한 글자 실수면
 * 'typo' = 정답으로 치고 바른 철자를 보여 줌 (english → English 도 배우게).
 */
export function checkBlank(input: string, blank: string): 'exact' | 'typo' | false {
  const a = norm(input)
  const b = norm(blank)
  if (!a) return false
  const keepCase = (t: string) => t.replace(/[’‘]/g, "'").replace(/[.,!?;:"“”()]/g, ' ').replace(/\s+/g, ' ').trim()
  if (a === b) return keepCase(input) === keepCase(blank) ? 'exact' : 'typo'
  return b.length >= 4 && distance(a, b) <= 1 ? 'typo' : false
}

/** 순서 맞추기 채점 (문장 부호 · 대소문자 무시) */
export const checkOrder = (picked: string[], en: string) => norm(picked.join(' ')) === norm(en)

export function shuffle<T>(a: readonly T[], rnd = Math.random): T[] {
  const x = [...a]
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[x[i], x[j]] = [x[j], x[i]]
  }
  return x
}

/** 섞었는데 원래 순서 그대로면 한 번 더 (순서 맞추기가 이미 풀려 있지 않게) */
export function shuffleOrder(tokens: string[], rnd = Math.random): string[] {
  if (new Set(tokens.map(norm)).size < 2) return tokens
  for (let k = 0; k < 8; k++) {
    const s = shuffle(tokens, rnd)
    if (!checkOrder(s, tokens.join(' '))) return s
  }
  return [...tokens].reverse()
}
