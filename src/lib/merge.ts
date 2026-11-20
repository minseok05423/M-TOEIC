import type { CustomWord, Progress } from './store.ts'
import { emptyProgress } from './store.ts'

/** 기기 간 병합: 항목마다 더 최근(u)에 바뀐 쪽을 택함 */
function byU<T extends { u: number }>(a: Record<string, T>, b: Record<string, T> | undefined): Record<string, T> {
  if (!b) return a
  const out = { ...a }
  for (const [k, v] of Object.entries(b)) if (!out[k] || v.u > out[k].u) out[k] = v
  return out
}

export function mergeProgress(a: Progress, b: Partial<Progress> | null | undefined): Progress {
  if (!b) return a
  const days = { ...a.days }
  for (const [k, v] of Object.entries(b.days ?? {})) days[k] = Math.max(days[k] ?? 0, v)
  const out: Progress = {
    ...emptyProgress(),
    lessons: byU(a.lessons, b.lessons),
    srs: byU(a.srs, b.srs),
    days,
  }
  // 표현집: 둘 다 없으면 칸을 만들지 않음 (서버와 똑같은 모양 → 괜히 다시 올리지 않게)
  if (a.phrases || b.phrases) out.phrases = byU(a.phrases ?? {}, b.phrases)
  if (a.myPhrases || b.myPhrases) out.myPhrases = byU(a.myPhrases ?? {}, b.myPhrases)
  return out
}

export function mergeWords(a: Record<string, CustomWord>, b: Record<string, CustomWord>): Record<string, CustomWord> {
  const out = { ...a }
  for (const [k, v] of Object.entries(b)) if (!out[k] || v.updatedAt > out[k].updatedAt) out[k] = v
  return out
}
