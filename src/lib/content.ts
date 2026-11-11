import { CHAPTERS } from '../content/chapters/index.ts'
import type { Chapter, Lesson } from '../content/types.ts'

export { CHAPTERS }

export function findLesson(chapterId: string, lessonId: string): { chapter: Chapter; lesson: Lesson } | null {
  const chapter = CHAPTERS.find((c) => c.id === chapterId)
  const lesson = chapter?.lessons.find((l) => l.id === lessonId)
  return chapter && lesson ? { chapter, lesson } : null
}
