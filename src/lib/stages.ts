import { useMemo } from 'react'
import type { Lesson } from '../content/types.ts'
import { lessonKey, useStore, type LessonProgress } from './store.ts'
import { lessonWords } from './words.ts'
import { stars } from './game.ts'

/** 레슨 하나의 4단계 (개념 → 단어 → 뼈대 → 퀴즈) 와 진행 상태 */
export interface StageInfo {
  id: string
  title: string
  desc: string
  meta: string
  done: boolean
  stars?: number
}

export function stageList(lesson: Lesson, lp: LessonProgress | undefined, started: number): StageInfo[] {
  const out: StageInfo[] = [
    { id: 'learn', title: '개념 익히기', desc: '한 장씩 넘기며 읽어요', meta: `${lesson.sections.length}장`, done: !!lp?.read },
  ]
  if (lesson.words.length)
    out.push({
      id: 'words',
      title: '단어 게임',
      desc: '뜻 고르기 · 듣기 · 짝 맞추기',
      meta: `${started}/${lesson.words.length}단어`,
      done: !!lp?.cards || started === lesson.words.length,
    })
  out.push(
    { id: 'sentences', title: '뼈대 찾기', desc: '진짜 동사와 주어를 직접 찾아요', meta: `${lesson.sentences.length}문장`, done: !!lp?.sentences },
    {
      id: 'quiz',
      title: '실전 퀴즈',
      desc: '토익처럼 빈칸 채우기',
      meta: lp?.quizTotal ? `최고 ${lp.quizBest}/${lp.quizTotal}` : `${lesson.quiz.length}문제`,
      done: !!lp?.quizTotal,
      stars: lp?.quizTotal ? stars(lp.quizBest ?? 0, lp.quizTotal) : undefined,
    },
  )
  return out
}

export function useLessonStages(chapterId: string, lesson: Lesson) {
  const lp = useStore((s) => s.progress.lessons[lessonKey(chapterId, lesson.id)])
  const srs = useStore((s) => s.progress.srs)
  const words = useMemo(() => lessonWords(chapterId, lesson.id), [chapterId, lesson.id])
  const started = words.filter((w) => srs[w.key]).length
  const list = stageList(lesson, lp, started)
  const next = list.find((s) => !s.done)
  return { list, next, lp }
}

