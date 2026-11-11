/** 기기 시간 기준 'YYYY-MM-DD' */
export function today(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  return today(new Date(y, m - 1, d + n))
}

/** 오늘(또는 아직 오늘 공부 안 했으면 어제)까지 연속으로 공부한 날 수 */
export function streak(days: Record<string, number>): number {
  let d = today()
  if (!days[d]) d = addDays(d, -1)
  let n = 0
  while (days[d]) {
    n++
    d = addDays(d, -1)
  }
  return n
}

export function formatDate(day: string): string {
  const [, m, d] = day.split('-').map(Number)
  return `${m}월 ${d}일`
}
