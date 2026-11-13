import { addDays, today } from './date.ts'

/**
 * 라이트너 상자 방식 간격 반복.
 * box 0 = 새 단어 / 방금 틀림 (오늘 다시), 맞힐 때마다 한 칸씩 올라가고 틀리면 0으로.
 */
export interface SrsCard {
  box: number
  /** 다음 복습일 'YYYY-MM-DD' */
  due: string
  reps: number
  lapses: number
  /** 마지막 수정 시각 (ms) — 기기 간 동기화 병합용 */
  u: number
}

/** box 별 다음 복습까지 일수 */
export const INTERVALS = [0, 1, 3, 7, 14, 30, 60]
export const MAX_BOX = INTERVALS.length - 1

export function review(card: SrsCard | undefined, known: boolean): SrsCard {
  const prev = card ?? { box: 0, due: today(), reps: 0, lapses: 0, u: 0 }
  const box = known ? Math.min(prev.box + 1, MAX_BOX) : 0
  return {
    box,
    due: addDays(today(), INTERVALS[box]),
    reps: prev.reps + 1,
    lapses: prev.lapses + (known || !card ? 0 : 1),
    u: Date.now(),
  }
}

export function isDue(card: SrsCard | undefined, day = today()): boolean {
  return !!card && card.due <= day
}

export function boxLabel(card: SrsCard | undefined): string {
  if (!card) return '아직 안 외움'
  if (card.box === 0) return '다시 보기'
  if (card.box <= 2) return '익히는 중'
  if (card.box < MAX_BOX) return '거의 외움'
  return '완벽'
}
