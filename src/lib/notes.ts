import type { Lesson } from '../content/types.ts'
import { plainText, tapPlain } from '../content/markup.ts'
import type { NoteCategory, NoteStage } from './store.ts'
import { wordKey } from './words.ts'

/** 메모가 가리킬 수 있는 곳: 레슨 전체 또는 설명 한 장 / 단어 / 문장 / 퀴즈 한 문제 */
export interface NoteTarget {
  /** '' = 레슨 전체. 그 외 'learn:s0' · 'words:w:agenda' · 'sentences:s1' · 'quiz:q3' */
  id: string
  stage: NoteStage
  label: string
}

const cut = (s: string, n = 70) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

export const WHOLE: NoteTarget = { id: '', stage: 'lesson', label: '이 레슨 전체' }

export interface TargetGroup {
  stage: NoteStage
  title: string
  items: NoteTarget[]
}

export function lessonTargets(lesson: Lesson): TargetGroup[] {
  const groups: TargetGroup[] = [
    { stage: 'learn', title: '개념', items: lesson.sections.map((s, i) => ({ id: `learn:s${i}`, stage: 'learn', label: s.heading })) },
    {
      stage: 'words',
      title: '단어',
      items: lesson.words.map((w) => ({ id: `words:${wordKey(w)}`, stage: 'words', label: `${w.en} · ${w.ko}` })),
    },
    {
      stage: 'sentences',
      title: '문장',
      items: lesson.sentences.map((s) => ({ id: `sentences:${s.id}`, stage: 'sentences', label: cut(plainText(s.text)) })),
    },
    {
      stage: 'quiz',
      title: '퀴즈',
      items: lesson.quiz.map((q, i) => ({
        id: `quiz:${q.id}`,
        stage: 'quiz',
        label: `${i + 1}번 · ${cut(q.type === 'mc' ? q.q.split('\n')[0] : tapPlain(q.text))}`,
      })),
    },
  ]
  return groups.filter((g) => g.items.length)
}

export function findTarget(lesson: Lesson, id: string | undefined): NoteTarget {
  if (!id) return WHOLE
  for (const g of lessonTargets(lesson)) for (const t of g.items) if (t.id === id) return t
  return WHOLE
}

export const CATEGORIES: { id: NoteCategory; label: string; hint: string }[] = [
  { id: 'meaning', label: '뜻', hint: '단어나 문장 뜻을 모르겠어요' },
  { id: 'structure', label: '문장 구조', hint: '주어·동사가 어디인지 모르겠어요' },
  { id: 'grammar', label: '문법 규칙', hint: '규칙이 언제 쓰이는지 헷갈려요' },
  { id: 'answer', label: '왜 정답?', hint: '해설을 봐도 왜 그 답인지 모르겠어요' },
  { id: 'other', label: '기타', hint: '' },
]

export const LEVELS: { id: 1 | 2 | 3; label: string }[] = [
  { id: 1, label: '조금 헷갈려요' },
  { id: 2, label: '꽤 헷갈려요' },
  { id: 3, label: '전혀 모르겠어요' },
]

/** 앱에서 강제하는 최소 글자 수 (DB 는 5자. 공백 빼고 셈) */
export const MIN_CHARS = 8
export const textLen = (s: string) => s.replace(/\s/g, '').length
