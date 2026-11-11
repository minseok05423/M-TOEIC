import type { Chapter } from '../../types.ts'
import { basics } from './basics.ts'
import { prep } from './prep.ts'
import { modal } from './modal.ts'
import { conj } from './conj.ts'
import { rel } from './rel.ts'
import { suffix } from './suffix.ts'
import { drill } from './drill.ts'

export const chapter: Chapter = {
  id: '2026-11-11-sentence-basics',
  date: '2026-11-11',
  title: '문장 분석 필수 어휘',
  subtitle: '전치사 · 조동사 · 접속사 · 관계대명사 · 품사 어미',
  reason: '문장을 덩어리로 나누는 신호 단어들이 아직 헷갈려서, 긴 문장에서 주어와 동사를 찾기 어려웠어요.',
  lessons: [basics, prep, modal, conj, rel, suffix, drill],
}
