import type { Chapter } from '../../types.ts'
import { forms } from './forms.ts'
import { noun } from './noun.ts'
import { count } from './count.ts'
import { quantity } from './quantity.ts'
import { drill } from './drill.ts'

export const chapter: Chapter = {
  id: '2026-11-14-forms-nouns',
  date: '2026-11-14',
  title: '문장의 형식과 명사',
  subtitle: '1~5형식 · 명사 자리 · 셀 수 있는/없는 명사 · 수량 표현',
  reason: '3일차 수업이에요. 동사 뒤 모양(형식)과 명사 자리, 가산/불가산을 알면 토익 빈칸 문제를 빨리 풀 수 있어요.',
  lessons: [forms, noun, count, quantity, drill],
}
