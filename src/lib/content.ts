import { CHAPTERS as BASE } from '../content/chapters/index.ts'
import type { Chapter, Lesson } from '../content/types.ts'
import { getState, useStore } from './store.ts'

/** 화면에서 쓰는 챕터: 기본 챕터 + 이 학생의 맞춤 챕터 (id 가 같으면 맞춤 챕터가 기본 챕터를 대신함) */
export type ShownChapter = Chapter & {
  /** 이 학생 맞춤 챕터 */
  personal?: boolean
  /** 맞춤 챕터 중 기본 챕터를 고친 것 (id 가 같음) */
  modified?: boolean
}

let cacheKey: Chapter[] | null = null
let cache: ShownChapter[] = BASE

function merge(user: Chapter[]): ShownChapter[] {
  if (user === cacheKey) return cache
  const mine = new Map(user.map((c) => [c.id, { ...c, personal: true, modified: BASE.some((b) => b.id === c.id) }]))
  cache = [...BASE.filter((c) => !mine.has(c.id)), ...mine.values()].sort((a, b) => b.date.localeCompare(a.date))
  cacheKey = user
  return cache
}

export function getChapters(): ShownChapter[] {
  return merge(getState().userChapters)
}

export function useChapters(): ShownChapter[] {
  return merge(useStore((s) => s.userChapters))
}

export function findLesson(chapterId: string, lessonId: string): { chapter: ShownChapter; lesson: Lesson } | null {
  const chapter = getChapters().find((c) => c.id === chapterId)
  const lesson = chapter?.lessons.find((l) => l.id === lessonId)
  return chapter && lesson ? { chapter, lesson } : null
}
