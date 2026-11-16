import { CHAPTERS } from '../content/chapters/index.ts'
import type { Chapter, Lesson } from '../content/types.ts'
import type { Progress, WordTestItem } from './store.ts'
import { stageList } from './stages.ts'
import { wordKey } from './words.ts'
import { addDays, today as todayOf } from './date.ts'

/**
 * 선생님 화면의 "학생이 제때 하고 있나" 판단. 화면·DB 와 상관없는 순수 계산이라 tests/ 에서 시험해요.
 * 기준은 아래 숫자 몇 개뿐이고, 화면에도 그대로 보여 줘요 (RULES).
 */
/** 수업 날짜 + 이 날수까지 그 챕터 레슨을 다 하면 제때 (레슨 4단계 모두) */
export const LESSON_GRACE_DAYS = 2
/** 이 날수 동안 공부(앱에서 무엇이든)를 안 하면 밀림 */
export const STUDY_GAP_DAYS = 2
/** 이 날수 동안 단어 테스트를 안 보면 밀림 (단어를 넣은 학생만) */
export const TEST_GAP_DAYS = 2
/** 복습 날짜가 지난 단어가 이만큼 넘으면 밀림 */
export const REVIEW_OVERDUE_MAX = 30
/** 최근 며칠을 보여 줄지 */
export const CALENDAR_DAYS = 14

export const RULES = [
  `레슨: 마감일까지 4단계 모두 (선생님이 안 정했으면 수업 ${LESSON_GRACE_DAYS}일 뒤)`,
  `공부: ${STUDY_GAP_DAYS}일 넘게 쉬지 않기`,
  `단어 테스트: ${TEST_GAP_DAYS}일 넘게 거르지 않기`,
  `복습: 날짜 지난 단어 ${REVIEW_OVERDUE_MAX}개 이하`,
]

export interface StudentRaw {
  id: string
  email: string
  createdAt: string
  lastSignIn?: string | null
  progress: Progress | null
  progressAt?: string
  words: { en: string; ko: string; deck: string; created_at: string; deleted: boolean }[]
  tests: { day: string; score: number; total: number; items: WordTestItem[]; finished_at: string }[]
  notes: NoteRaw[]
  chapters: Chapter[]
  /** 선생님이 정한 마감일 (key: 'chapterId/lessonId' → 'YYYY-MM-DD'). 모든 학생 공통 */
  due?: Record<string, string>
}

/** DB 표 lesson_notes 한 줄 (선생님 화면에서 쓰는 칸만) */
export interface NoteRaw {
  id: string
  status: 'new' | 'done'
  kind: 'important' | 'confusing'
  /** 무엇에 대한 메모: 레슨 · 단어 · 그냥 메모 (예전 메모는 없음 = 레슨) */
  scope?: 'lesson' | 'word' | 'general' | null
  /** 어느 화면에서 썼는지 (예: '실전 퀴즈', '단어장') */
  place?: string | null
  lesson_title: string | null
  target_label?: string | null
  category?: string | null
  point: string
  question: string | null
  example?: string | null
  level: number | null
  reply?: string | null
  created_at: string
}

/** 메모가 무엇에 대한 것인지 한 줄로: "레슨 · 문장의 5형식 · 퀴즈 3번" / "단어 · postpone · 연기하다" / "그냥 메모" */
export function noteAbout(n: { scope?: string | null; lesson_title?: string | null; target_label?: string | null }): string {
  if (n.scope === 'general') return '그냥 메모'
  if (n.scope === 'word') return `단어 · ${n.target_label ?? ''}`
  return `레슨 · ${n.lesson_title ?? ''} · ${n.target_label ?? '레슨 전체'}`
}

export const dueKey = (chapterId: string, lessonId: string) => `${chapterId}/${lessonId}`

/** 레슨 마감일: 선생님이 정한 날, 없으면 수업 날 + LESSON_GRACE_DAYS */
export function lessonDue(due: Record<string, string> | undefined, chapter: Pick<Chapter, 'id' | 'date'>, lessonId: string): { day: string; custom: boolean } {
  const set = due?.[dueKey(chapter.id, lessonId)]
  return set ? { day: set, custom: true } : { day: addDays(chapter.date, LESSON_GRACE_DAYS), custom: false }
}

export interface LessonRow {
  chapter: Chapter
  lesson: Lesson
  done: number
  total: number
  stages: { title: string; done: boolean }[]
  quiz?: { best: number; total: number }
  /** 이날까지 끝내야 함 */
  dueBy: string
  /** 선생님이 정한 마감일인지 (아니면 수업 날 + LESSON_GRACE_DAYS) */
  dueCustom: boolean
  overdue: boolean
}

export interface DayRow {
  day: string
  studied: number
  test?: { score: number; total: number }
  words: number
}

export type Status = 'ok' | 'behind' | 'new'

export interface Report {
  status: Status
  /** 밀린 이유 (한국어 한 줄씩) */
  issues: string[]
  lastStudied?: string
  streak: number
  studied7: number
  calendar: DayRow[]
  lessons: LessonRow[]
  lessonsDone: number
  lessonsOverdue: number
  review: { tracked: number; due: number; overdue: number; mastered: number }
  tests: { count7: number; avg7?: number; last?: StudentRaw['tests'][number]; recent: StudentRaw['tests'] }
  /** 두 번 이상 틀리거나 "모르겠어요" 한 단어 */
  missedOften: { en: string; ko: string; n: number }[]
  wordsTotal: number
  words7: number
  notesNew: NoteRaw[]
  /** 모든 메모: 답 안 한 것 먼저, 그다음 최근 것부터 */
  notes: NoteRaw[]
}

/** 기본 챕터 + 이 학생의 맞춤 챕터 (id 가 같으면 맞춤이 대신함). 앱의 lib/content.ts 와 같은 규칙 */
export function mergeChapters(personal: Chapter[]): Chapter[] {
  const mine = new Map(personal.map((c) => [c.id, c]))
  return [...CHAPTERS.filter((c) => !mine.has(c.id)), ...mine.values()].sort((a, b) => b.date.localeCompare(a.date))
}

const dayOf = (iso: string) => todayOf(new Date(iso))
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400e3)

export function analyze(s: StudentRaw, today = todayOf()): Report {
  const pr = s.progress ?? { lessons: {}, srs: {}, days: {} }
  const studiedDays = Object.keys(pr.days ?? {}).filter((d) => pr.days[d] > 0).sort()
  const words = s.words.filter((w) => !w.deleted)
  const tests = [...s.tests].sort((a, b) => a.finished_at.localeCompare(b.finished_at))

  // 날마다: 공부 · 테스트 · 넣은 단어
  const wordsByDay = new Map<string, number>()
  for (const w of words) wordsByDay.set(dayOf(w.created_at), (wordsByDay.get(dayOf(w.created_at)) ?? 0) + 1)
  const testByDay = new Map<string, { score: number; total: number }>()
  for (const t of tests) testByDay.set(t.day, { score: t.score, total: t.total })
  const calendar: DayRow[] = Array.from({ length: CALENDAR_DAYS }, (_, i) => {
    const day = addDays(today, -i)
    return { day, studied: pr.days?.[day] ?? 0, test: testByDay.get(day), words: wordsByDay.get(day) ?? 0 }
  })

  let streak = 0
  for (let d = pr.days?.[today] ? today : addDays(today, -1); pr.days?.[d]; d = addDays(d, -1)) streak++
  const week = new Set(Array.from({ length: 7 }, (_, i) => addDays(today, -i)))
  const studied7 = studiedDays.filter((d) => week.has(d)).length

  // 레슨: 마감일 (선생님이 정한 날, 없으면 수업 날짜 + LESSON_GRACE_DAYS) 까지 4단계
  const lessons: LessonRow[] = []
  for (const ch of s.chapters)
    for (const l of ch.lessons) {
      const lp = pr.lessons?.[`${ch.id}/${l.id}`]
      const started = l.words.filter((w) => pr.srs?.[wordKey(w)]).length
      const st = stageList(l, lp, started)
      const done = st.filter((x) => x.done).length
      const { day: dueBy, custom: dueCustom } = lessonDue(s.due, ch, l.id)
      lessons.push({
        chapter: ch,
        lesson: l,
        done,
        total: st.length,
        stages: st.map((x) => ({ title: x.title, done: x.done })),
        quiz: lp?.quizTotal ? { best: lp.quizBest ?? 0, total: lp.quizTotal } : undefined,
        dueBy,
        dueCustom,
        overdue: done < st.length && dueBy < today,
      })
    }
  const lessonsDone = lessons.filter((x) => x.done === x.total).length
  const overdueLessons = lessons.filter((x) => x.overdue)

  // 복습
  const cards = Object.values(pr.srs ?? {})
  const review = {
    tracked: cards.length,
    due: cards.filter((c) => c.due <= today).length,
    overdue: cards.filter((c) => c.due < today).length,
    mastered: cards.filter((c) => c.box >= 6).length,
  }

  // 단어 테스트
  const recent7 = tests.filter((t) => week.has(t.day))
  const avg7 = recent7.length ? Math.round((100 * recent7.reduce((a, t) => a + t.score / t.total, 0)) / recent7.length) : undefined
  const missed = new Map<string, { en: string; ko: string; n: number }>()
  for (const t of tests)
    for (const it of t.items)
      if (!it.ok) {
        const m = missed.get(it.en.toLowerCase()) ?? { en: it.en, ko: it.ko, n: 0 }
        m.n++
        missed.set(it.en.toLowerCase(), m)
      }
  const missedOften = [...missed.values()].filter((m) => m.n >= 2).sort((a, b) => b.n - a.n || a.en.localeCompare(b.en))

  // 밀린 것
  const lastStudied = studiedDays.at(-1)
  const lastTest = tests.at(-1)
  const issues: string[] = []
  const neverStarted = !lastStudied && !tests.length && !words.length
  if (!neverStarted) {
    if (!lastStudied) issues.push('아직 공부 기록이 없어요')
    else if (daysBetween(lastStudied, today) >= STUDY_GAP_DAYS) issues.push(`마지막 공부 ${daysBetween(lastStudied, today)}일 전`)
    if (overdueLessons.length) {
      const oldest = overdueLessons.reduce((a, b) => (a.dueBy < b.dueBy ? a : b))
      issues.push(`밀린 레슨 ${overdueLessons.length}개 (가장 오래된 것: ${oldest.lesson.title})`)
    }
    if (words.length) {
      if (!lastTest) issues.push('단어 테스트를 아직 안 봤어요')
      else if (daysBetween(lastTest.day, today) >= TEST_GAP_DAYS) issues.push(`마지막 단어 테스트 ${daysBetween(lastTest.day, today)}일 전`)
    }
    if (review.overdue > REVIEW_OVERDUE_MAX) issues.push(`복습 날짜 지난 단어 ${review.overdue}개`)
  }

  return {
    status: neverStarted ? 'new' : issues.length ? 'behind' : 'ok',
    issues,
    lastStudied,
    streak,
    studied7,
    calendar,
    lessons,
    lessonsDone,
    lessonsOverdue: overdueLessons.length,
    review,
    tests: { count7: recent7.length, avg7, last: lastTest, recent: [...tests].reverse().slice(0, 10) },
    missedOften,
    wordsTotal: words.length,
    words7: words.filter((w) => week.has(dayOf(w.created_at))).length,
    notesNew: s.notes.filter((n) => n.status === 'new').sort((a, b) => b.created_at.localeCompare(a.created_at)),
    notes: [...s.notes].sort((a, b) => (a.status === b.status ? b.created_at.localeCompare(a.created_at) : a.status === 'new' ? -1 : 1)),
  }
}
