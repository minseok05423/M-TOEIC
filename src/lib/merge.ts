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
  return {
    ...emptyProgress(),
    lessons: byU(a.lessons, b.lessons),
    srs: byU(a.srs, b.srs),
    days,
  }
}

export function mergeWords(a: Record<string, CustomWord>, b: Record<string, CustomWord>): Record<string, CustomWord> {
  const out = { ...a }
  for (const [k, v] of Object.entries(b)) if (!out[k] || v.updatedAt > out[k].updatedAt) out[k] = v
  return out
}
