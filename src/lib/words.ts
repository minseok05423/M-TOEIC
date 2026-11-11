import type { Example, Word } from '../content/types.ts'
import { CHAPTERS } from './content.ts'
import type { CustomWord } from './store.ts'

/** 레슨 단어와 내 단어를 같은 모양으로 다루기 위한 형태 */
export interface StudyWord {
  /** 복습 기록 키. 레슨 단어 'w:<id|en>', 내 단어 'c:<uuid>' */
  key: string
  en: string
  ko: string
  ex?: Example
  tip?: string
  group: string
  origin: 'lesson' | 'custom'
  chapterId?: string
  lessonId?: string
  lessonTitle?: string
  customId?: string
}

export const wordKey = (w: Word) => `w:${(w.id ?? w.en).toLowerCase()}`

function fromLesson(w: Word, chapterId: string, lessonId: string, lessonTitle: string): StudyWord {
  return {
    key: wordKey(w),
    en: w.en,
    ko: w.ko,
    ex: w.ex,
    tip: w.tip,
    group: w.group ?? '단어',
    origin: 'lesson',
    chapterId,
    lessonId,
    lessonTitle,
  }
}

export function lessonWords(chapterId: string, lessonId: string): StudyWord[] {
  const ch = CHAPTERS.find((c) => c.id === chapterId)
  const l = ch?.lessons.find((x) => x.id === lessonId)
  return l ? l.words.map((w) => fromLesson(w, chapterId, l.id, l.title)) : []
}

/** 모든 레슨 단어 (같은 key 는 처음 것만) */
export const LESSON_WORDS: StudyWord[] = (() => {
  const seen = new Set<string>()
  const out: StudyWord[] = []
  for (const ch of CHAPTERS)
    for (const l of ch.lessons)
      for (const w of l.words) {
        const sw = fromLesson(w, ch.id, l.id, l.title)
        if (!seen.has(sw.key)) {
          seen.add(sw.key)
          out.push(sw)
        }
      }
  return out
})()

export function fromCustom(w: CustomWord): StudyWord {
  return {
    key: `c:${w.id}`,
    en: w.en,
    ko: w.ko,
    ex: w.exEn ? { en: w.exEn, ko: w.exKo ?? '' } : undefined,
    tip: w.tip,
    group: w.deck,
    origin: 'custom',
    customId: w.id,
  }
}

export function customWords(words: Record<string, CustomWord>): StudyWord[] {
  return Object.values(words)
    .filter((w) => !w.deleted)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(fromCustom)
}

export function allWords(words: Record<string, CustomWord>): Map<string, StudyWord> {
  const m = new Map<string, StudyWord>()
  for (const w of LESSON_WORDS) m.set(w.key, w)
  for (const w of customWords(words)) m.set(w.key, w)
  return m
}

export function decks(words: Record<string, CustomWord>): string[] {
  const out: string[] = []
  for (const w of Object.values(words).sort((a, b) => b.createdAt - a.createdAt))
    if (!w.deleted && !out.includes(w.deck)) out.push(w.deck)
  return out
}
