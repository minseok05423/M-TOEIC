import type { StudyWord } from './words.ts'

export function shuffle<T>(a: readonly T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9가-힣]/g, '')

/** 뜻 앞의 '동:' '명 :' 같은 표시와 괄호 설명 빼기 */
const bare = (s: string) => s.replace(/\([^)]*\)/g, '').replace(/^\s*[동명형부구]\s*:/, '').trim()

/** 뜻 하나하나: '(물건을) 들다, 잡다' → ['들다', '잡다'] */
function senses(ko: string): string[] {
  return ko.split(/[,/;]/).map((s) => norm(bare(s))).filter(Boolean)
}

type Shape = 'v' | 'a' | 'r' | 'n' | 'g'

/**
 * 보기에 보이는 뜻의 모양: 동사(…다) · 형용사(…한/…인) · 부사 · 명사 · 문법 (g).
 * 정답이 '…하다' 인데 오답이 '통로' 면 단어를 몰라도 지울 수 있어서, 같은 모양끼리 섞어요.
 * 품사 없는 레슨 단어는 문법 항목 (can '~할 수 있다', because '~ 때문에', -tion …): 어휘 문제엔 안 섞어요.
 */
function shape(w: StudyWord): Shape {
  if (w.origin === 'lesson' && !w.pos) return 'g'
  const first = bare(w.ko.split(/[,/;]/)[0])
  if (/다$/.test(first)) return 'v'
  const pos = w.pos?.split(/[/·,]/)[0].trim()
  if (pos === '형용사') return 'a'
  if (pos === '부사') return 'r'
  if (/(한|인|된|운|는|은|던)$/.test(first)) return 'a'
  return 'n'
}

/**
 * 모양이 다른 단어는 이만큼 '이미 여러 번 나온' 것처럼 취급 (같은 모양 단어가 한 판에 세 번씩 나온 뒤에야 나옴).
 * 동사 문제에 명사 보기는 단어를 몰라도 지울 수 있어서, 같은 오답이 세 번 나오는 것보다 나빠요.
 * 문법 항목과 어휘는 거의 섞지 않아요 (보기가 정말 모자랄 때만).
 */
function offShape(a: Shape, b: Shape): number {
  return a === b ? 0 : a === 'g' || b === 'g' ? 10 : 3
}

/** 같은 레슨 단어끼리는 조금 먼저 (can 의 오답은 could · will 처럼 비교가 되는 것). 내 단어 묶음엔 안 씀 */
const SAME_LESSON = 1.5
const sameLesson = (a: StudyWord, b: StudyWord) =>
  a.origin === 'lesson' && b.origin === 'lesson' && a.chapterId === b.chapterId && a.lessonId === b.lessonId

/**
 * 뜻이 ' / ' 로 나뉜 단어 (shade '그늘지게 하다 / 그늘', '동사 / 명사') → 뜻 하나씩 (key 는 같음).
 * 보기에 ' / ' 가 붙은 뜻이 하나만 있으면 그게 정답(또는 오답)인 게 티가 나서, 문제에는 뜻 하나만 보여 줘요.
 * 품사가 뜻 수와 맞으면 품사도 같이 나눠요.
 */
export function senseVariants(w: StudyWord): StudyWord[] {
  const ks = w.ko.split('/').map((s) => s.trim()).filter(Boolean)
  if (ks.length < 2) return [w]
  const ps = w.pos?.split('/').map((s) => s.trim())
  return ks.map((ko, i) => ({ ...w, ko, pos: ps && ps.length === ks.length ? ps[i] : w.pos }))
}

/** 문제로 낼 뜻 하나 (뜻이 하나면 그대로) */
export function oneSense(w: StudyWord): StudyWord {
  const vs = senseVariants(w)
  return vs[Math.floor(Math.random() * vs.length)]
}

/**
 * 한 판(테스트 · 복습) 동안 쓰는 오답 보기 고르개. answer 는 oneSense 로 고른 뜻이어도 돼요.
 *
 * - 한 판 안에서 덜 나온 단어부터: 같은 오답이 계속 나와서 외워 버리지 않게.
 *   이번 판의 정답 단어(answers)는 처음부터 한 번 나온 것으로 쳐요 (다른 문제의 정답이면 쉽게 지워지니까).
 * - 정답과 같은 모양의 뜻 (동사엔 동사): 모양만 보고 지울 수 없게. 뜻이 여럿인 오답은 정답과 같은 모양의 뜻 하나만 보여 줘요.
 * - 뜻이 하나라도 정답 단어와 겹치면 빼요 (hold '들다, 잡다' 와 carry '들다, 나르다' 는 둘 다 정답처럼 보임).
 */
export function distractorPicker(pool: readonly StudyWord[], answers: readonly StudyWord[] = []) {
  const id = (w: StudyWord) => norm(w.en)
  const uses = new Map<string, number>()
  for (const w of answers) uses.set(id(w), 1)
  const variants = new Map(pool.map((w) => [w, senseVariants(w).map((v) => ({ v, shape: shape(v) }))]))
  const byKey = new Map(pool.map((w) => [w.key, w]))

  return (answer: StudyWord, n = 3): StudyWord[] => {
    const want = shape(answer)
    const full = byKey.get(answer.key) ?? answer
    const ranked = pool
      .map((w) => {
        const fit = variants.get(w)!.filter((x) => x.shape === want)
        const shown = fit.length ? fit[Math.floor(Math.random() * fit.length)].v : oneSense(w)
        const off = fit.length ? 0 : offShape(variants.get(w)![0].shape, want)
        return { w, shown, cost: (uses.get(id(w)) ?? 0) + off - (sameLesson(w, answer) ? SAME_LESSON : 0) + Math.random() }
      })
      .sort((a, b) => a.cost - b.cost)
    const usedEn = new Set([norm(answer.en)])
    const taken = new Set(senses(full.ko))
    const out: StudyWord[] = []
    for (const { w, shown } of ranked) {
      if (out.length >= n) break
      const e = norm(w.en)
      const s = senses(w.ko)
      if (usedEn.has(e) || !s.length || s.some((x) => taken.has(x))) continue
      usedEn.add(e)
      s.forEach((x) => taken.add(x))
      out.push(shown)
    }
    for (const w of out) uses.set(id(w), (uses.get(id(w)) ?? 0) + 1)
    return out
  }
}

export type DistractorPicker = ReturnType<typeof distractorPicker>

// ───────── 영어 직접 쓰기 (두 번 이상 틀린 단어) ─────────

/** 자리만 표시하는 말: ~ing, -ing, 대문자 한 글자(A, B, V), sb, sth. 소문자 a 는 진짜 단어 (a few ≠ few) */
const PLACEHOLDER = /~\S*|-ing\b|\b(?:[A-Z]|sb|sth|somebody|something)\b/g

const cleanEn = (s: string) =>
  s
    .toLowerCase()
    .replace(/[-–—]/g, ' ')
    .replace(/[^a-z' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * 정답으로 받아 줄 영어: 괄호는 넣어도 빼도 OK, 쉼표·/ 로 나뉜 건 하나만 써도 OK, ~ing·A·B 같은 자리 표시는 빼도 OK.
 *   'pack (up)' → pack up · pack     '(re)pave' → repave · pave     'turn on/off' → turn on · turn off
 *   'look forward to ~ing' → look forward to ~ing · look forward to
 */
export function acceptedAnswers(en: string): string[] {
  const out = new Set<string>()
  const add = (s: string) => {
    for (const x of [s.replace(/[()]/g, ''), s.replace(/\([^)]*\)/g, '')]) {
      out.add(cleanEn(x))
      out.add(cleanEn(x.replace(PLACEHOLDER, ' ')))
    }
  }
  for (const part of en.split(/[,;]/)) {
    const alts = part.split('/').map((x) => x.trim()).filter(Boolean)
    const first = alts[0]?.split(/\s+/) ?? []
    alts.forEach((a, i) => {
      // 'turn on/off' 의 'off' 는 'turn off' 로
      if (i > 0 && first.length > 1 && !/\s/.test(a)) add([...first.slice(0, -1), a].join(' '))
      else add(a)
    })
  }
  out.delete('')
  return [...out]
}

function editDistance(a: string, b: string): number {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]
    d[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j]
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return d[b.length]
}

/** 쓴 답 채점: 'exact' 정답, 'typo' 다섯 글자 넘는 단어에서 한 글자만 틀림 (정답으로 치고 철자를 보여 줌), false 오답 */
export function checkTyped(input: string, en: string): 'exact' | 'typo' | false {
  const x = cleanEn(input)
  if (!x) return false
  const ok = acceptedAnswers(en)
  if (ok.includes(x)) return 'exact'
  return ok.some((a) => a.replace(/ /g, '').length >= 5 && editDistance(a, x) <= 1) ? 'typo' : false
}

/** 점수 → 별 1~3개. 끝까지 한 것만으로 별 하나 (초보에게는 끝까지 하는 게 제일 중요) */
export function stars(score: number, total: number): number {
  if (!total) return 1
  const r = score / total
  return r >= 1 ? 3 : r >= 0.75 ? 2 : 1
}
