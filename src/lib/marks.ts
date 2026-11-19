/** 문장 안 표시하기 (작문 검수 화면). 아무것도 import 하지 않아서 테스트에서 바로 씀 */

/**
 * 원래 문장에서 틀린 부분(needles)을 찾아 나누기 → 화면이 빨간 줄로 표시.
 * 겹치거나 못 찾은 것은 건너뜀. 대소문자는 구분 안 함.
 */
export function markParts(text: string, needles: string[]): { t: string; hit: boolean }[] {
  const low = text.toLowerCase()
  const spans: [number, number][] = []
  for (const n of needles) {
    const q = n.trim().toLowerCase()
    if (!q) continue
    let from = 0
    while (from <= low.length) {
      const i = low.indexOf(q, from)
      if (i < 0) break
      const j = i + q.length
      if (!spans.some(([a, b]) => i < b && j > a)) {
        spans.push([i, j])
        break
      }
      from = i + 1
    }
  }
  spans.sort((a, b) => a[0] - b[0])
  const out: { t: string; hit: boolean }[] = []
  let at = 0
  for (const [a, b] of spans) {
    if (a > at) out.push({ t: text.slice(at, a), hit: false })
    out.push({ t: text.slice(a, b), hit: true })
    at = b
  }
  if (at < text.length) out.push({ t: text.slice(at), hit: false })
  return out
}
