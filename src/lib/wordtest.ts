import type { CustomWord, WordTest, WordTestItem } from './store.ts'
import type { SrsCard } from './srs.ts'
import { fromCustom, type StudyWord } from './words.ts'
import { shuffle } from './game.ts'
import { today } from './date.ts'

/**
 * 매일 단어 테스트에 낼 단어 고르기.
 *
 * 새 단어: 가장 최근에 단어를 넣은 날의 단어 전부 (최대 NEW_MAX).
 *   20개보다 적으면 아직 시험에 안 나온 이전 단어로 20개까지 채움 (이틀에 나눠 넣은 경우).
 * 복습 단어: 10개. 새 단어가 적어서 합이 30이 안 되면 30까지 더.
 *   ① 지난 시험에서 틀렸거나 "모르겠어요" (그 뒤 시험에서 맞히면 빠짐)
 *   ② ★ 중요 표시
 *   ③ 복습할 때 자주 틀리는 단어
 *   ④ 나머지는 랜덤 (시험에 오래 안 나온 단어부터)
 * 이전 단어가 모자라면 레슨에서 공부한 단어로 채움.
 */
export const NEW_TARGET = 20
export const NEW_MAX = 30
export const REVIEW_MIN = 10
export const TOTAL_TARGET = 30

export type Why = NonNullable<WordTestItem['why']>
export const WHY_LABEL: Record<Why, string> = { missed: '지난번에 틀림', star: '★ 중요', weak: '자주 틀림', random: '랜덤' }

export interface PlannedItem {
  w: StudyWord
  part: 'new' | 'review'
  why?: Why
}

export interface TestPlan {
  items: PlannedItem[]
  /** 새 단어의 기준 날짜 (단어를 마지막으로 넣은 날) */
  latestDay?: string
  /** 새 단어 중 latestDay 에 넣은 것 (나머지는 아직 시험에 안 나온 이전 단어) */
  latestCount: number
  newCount: number
  reviewCount: number
  why: Record<Why, number>
}

export const dayOf = (ms: number) => today(new Date(ms))

/** 단어별 가장 최근 시험 결과 */
export function lastResults(tests: Record<string, WordTest>): Map<string, { ok: boolean; at: number }> {
  const out = new Map<string, { ok: boolean; at: number }>()
  for (const t of Object.values(tests).sort((a, b) => a.finishedAt - b.finishedAt))
    for (const it of t.items) out.set(it.key, { ok: it.ok, at: t.finishedAt })
  return out
}

export function planTest(
  words: Record<string, CustomWord>,
  srs: Record<string, SrsCard>,
  tests: Record<string, WordTest>,
  lessonPool: readonly StudyWord[],
): TestPlan {
  const mine = Object.values(words)
    .filter((w) => !w.deleted)
    .sort((a, b) => b.createdAt - a.createdAt)
  const last = lastResults(tests)
  const latestDay = mine[0] ? dayOf(mine[0].createdAt) : undefined

  const fresh = mine.filter((w) => dayOf(w.createdAt) === latestDay).slice(0, NEW_MAX)
  const latestCount = fresh.length
  for (const w of mine) {
    if (fresh.length >= NEW_TARGET) break
    if (!fresh.includes(w) && !last.has(`c:${w.id}`)) fresh.push(w)
  }
  const items: PlannedItem[] = fresh.map((w) => ({ w: fromCustom(w), part: 'new' }))
  const taken = new Set(items.map((x) => x.w.key))

  const seen = new Set<string>()
  const cands = [...mine.map(fromCustom), ...lessonPool.filter((w) => srs[w.key])].filter((w) => {
    if (taken.has(w.key) || seen.has(w.key)) return false
    seen.add(w.key)
    return true
  })
  const need = Math.max(REVIEW_MIN, TOTAL_TARGET - items.length)
  const why: Record<Why, number> = { missed: 0, star: 0, weak: 0, random: 0 }
  let review = 0
  const add = (list: StudyWord[], reason: Why) => {
    for (const w of list) {
      if (review >= need) return
      if (taken.has(w.key)) continue
      taken.add(w.key)
      items.push({ w, part: 'review', why: reason })
      why[reason]++
      review++
    }
  }
  add(
    cands.filter((w) => last.get(w.key)?.ok === false).sort((a, b) => last.get(b.key)!.at - last.get(a.key)!.at),
    'missed',
  )
  add(shuffle(cands.filter((w) => w.important)), 'star')
  add(
    cands
      .filter((w) => (srs[w.key]?.lapses ?? 0) > 0 && srs[w.key].box <= 1)
      .sort((a, b) => srs[b.key].lapses - srs[a.key].lapses),
    'weak',
  )
  // 내 단어를 먼저, 그다음 레슨 단어. 같은 쪽 안에서는 오래 시험에 안 나온 것부터 (같으면 랜덤)
  const random = shuffle(cands).sort(
    (a, b) =>
      Number(a.origin !== 'custom') - Number(b.origin !== 'custom') || (last.get(a.key)?.at ?? 0) - (last.get(b.key)?.at ?? 0),
  )
  add(random, 'random')

  return { items, latestDay, latestCount, newCount: fresh.length, reviewCount: review, why }
}
