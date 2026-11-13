import type { StudyWord } from './words.ts'

export function shuffle<T>(a: readonly T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z가-힣]/g, '')

/**
 * 오답 보기 고르기: 같은 묶음(group) 단어를 먼저, 부족하면 전체에서.
 * 뜻이나 철자가 정답과 겹치는 단어는 빼요 (둘 다 정답처럼 보이면 안 되니까).
 */
export function distractors(answer: StudyWord, pool: readonly StudyWord[], n = 3): StudyWord[] {
  const usedEn = new Set([norm(answer.en)])
  const usedKo = new Set([norm(answer.ko)])
  const out: StudyWord[] = []
  const take = (list: StudyWord[]) => {
    for (const w of list) {
      if (out.length >= n) return
      const e = norm(w.en)
      const k = norm(w.ko)
      if (usedEn.has(e) || usedKo.has(k)) continue
      usedEn.add(e)
      usedKo.add(k)
      out.push(w)
    }
  }
  take(shuffle(pool.filter((w) => w.group === answer.group)))
  take(shuffle(pool))
  return out
}

/** 점수 → 별 1~3개. 끝까지 한 것만으로 별 하나 (초보에게는 끝까지 하는 게 제일 중요) */
export function stars(score: number, total: number): number {
  if (!total) return 1
  const r = score / total
  return r >= 1 ? 3 : r >= 0.75 ? 2 : 1
}
