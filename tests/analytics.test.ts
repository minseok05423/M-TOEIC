// 선생님 화면의 "제때 하고 있나" (src/lib/analytics.ts). 실행: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyze, mergeChapters, LESSON_GRACE_DAYS, type StudentRaw } from '../src/lib/analytics.ts'
import { CHAPTERS } from '../src/content/chapters/index.ts'
import { addDays } from '../src/lib/date.ts'
import type { Progress } from '../src/lib/store.ts'

const first = [...CHAPTERS].sort((a, b) => a.date.localeCompare(b.date))[0]
const latest = [...CHAPTERS].sort((a, b) => b.date.localeCompare(a.date))[0]

const student = (p: Partial<StudentRaw> & { progress?: Progress | null }): StudentRaw => ({
  id: 'u1',
  email: 's@example.com',
  createdAt: `${first.date}T00:00:00Z`,
  progress: null,
  words: [],
  tests: [],
  notes: [],
  chapters: mergeChapters([]),
  ...p,
})

/** 모든 레슨 4단계를 끝낸 기록 */
function allDone(days: string[]): Progress {
  const lessons: Progress['lessons'] = {}
  const srs: Progress['srs'] = {}
  for (const ch of CHAPTERS)
    for (const l of ch.lessons) {
      lessons[`${ch.id}/${l.id}`] = { read: true, cards: true, sentences: true, quizTotal: 5, quizBest: 5, quizLast: 5, u: 1 }
    }
  return { lessons, srs, days: Object.fromEntries(days.map((d) => [d, 3])) }
}

const testOn = (day: string) => ({ day, score: 28, total: 30, items: [], finished_at: `${day}T12:00:00Z` })
const word = (day: string) => ({ en: 'hold', ko: '들다', deck: '1일차', created_at: `${day}T03:00:00Z`, deleted: false })

test('아무 기록 없으면 "시작 전"', () => {
  const r = analyze(student({}), addDays(latest.date, 10))
  assert.equal(r.status, 'new')
  assert.deepEqual(r.issues, [])
})

test('레슨 다 하고, 어제 공부·테스트 했으면 "제때"', () => {
  const today = addDays(latest.date, 5)
  const r = analyze(student({ progress: allDone([addDays(today, -1)]), tests: [testOn(addDays(today, -1))], words: [word(addDays(today, -1))] }), today)
  assert.equal(r.status, 'ok', r.issues.join(' / '))
  assert.equal(r.lessonsDone, r.lessons.length)
})

test(`수업 ${LESSON_GRACE_DAYS}일 뒤까지 레슨을 안 하면 밀린 레슨`, () => {
  const onTime = analyze(student({ progress: { lessons: {}, srs: {}, days: { [first.date]: 1 } } }), addDays(first.date, LESSON_GRACE_DAYS))
  assert.equal(onTime.lessons.filter((x) => x.chapter.id === first.id && x.overdue).length, 0, '마감 당일은 아직 괜찮음')
  const late = analyze(student({ progress: { lessons: {}, srs: {}, days: { [first.date]: 1 } } }), addDays(first.date, LESSON_GRACE_DAYS + 1))
  assert.equal(late.lessons.filter((x) => x.chapter.id === first.id && x.overdue).length, first.lessons.length)
  assert.ok(late.issues.some((x) => x.startsWith('밀린 레슨')))
})

test('공부 · 테스트를 이틀 쉬면 밀림, 이유가 보여요', () => {
  const today = addDays(latest.date, 5)
  const r = analyze(student({ progress: allDone([addDays(today, -3)]), tests: [testOn(addDays(today, -3))], words: [word(addDays(today, -3))] }), today)
  assert.equal(r.status, 'behind')
  assert.ok(r.issues.includes('마지막 공부 3일 전'))
  assert.ok(r.issues.includes('마지막 단어 테스트 3일 전'))
})

test('복습 날짜 지난 단어가 많으면 밀림', () => {
  const today = addDays(latest.date, 5)
  const p = allDone([today])
  for (let i = 0; i < 31; i++) p.srs[`c:${i}`] = { box: 1, due: addDays(today, -2), reps: 1, lapses: 0, u: 1 }
  const r = analyze(student({ progress: p, tests: [testOn(today)], words: [word(today)] }), today)
  assert.ok(r.issues.includes('복습 날짜 지난 단어 31개'))
})

test('두 번 이상 틀린 단어를 모아요', () => {
  const item = (ok: boolean) => ({ key: 'c:1', en: 'scatter', ko: '흩뿌리다', part: 'new' as const, ok })
  const r = analyze(student({ tests: [{ ...testOn('2026-11-12'), items: [item(false)] }, { ...testOn('2026-11-13'), items: [item(false)] }, { ...testOn('2026-11-14'), items: [item(true)] }] }), '2026-11-15')
  assert.deepEqual(r.missedOften, [{ en: 'scatter', ko: '흩뿌리다', n: 2 }])
})

test('선생님이 정한 마감일이 수업 날 + 2일 규칙보다 먼저', () => {
  const l = latest.lessons[0]
  const key = `${latest.id}/${l.id}`
  const day = addDays(latest.date, LESSON_GRACE_DAYS + 1) // 기본 마감 다음 날
  const progress: Progress = { lessons: {}, srs: {}, days: { [day]: 1 } }
  const before = analyze(student({ progress }), day).lessons.find((x) => x.lesson.id === l.id && x.chapter.id === latest.id)!
  assert.equal(before.dueCustom, false)
  assert.equal(before.overdue, true)

  const later = addDays(day, 5)
  const after = analyze(student({ progress, due: { [key]: later } }), day).lessons.find((x) => x.lesson.id === l.id && x.chapter.id === latest.id)!
  assert.equal(after.dueBy, later)
  assert.equal(after.dueCustom, true)
  assert.equal(after.overdue, false)

  // 앞당기면 바로 밀림
  const sooner = analyze(student({ progress, due: { [key]: addDays(latest.date, -1) } }), latest.date).lessons.find((x) => x.lesson.id === l.id && x.chapter.id === latest.id)!
  assert.equal(sooner.overdue, true)
})

test('메모: 무엇에 대한 것인지 · 답 안 한 것 먼저', async () => {
  const { noteAbout } = await import('../src/lib/analytics.ts')
  assert.equal(noteAbout({ scope: 'general' }), '그냥 메모')
  assert.equal(noteAbout({ scope: 'word', target_label: 'postpone · 연기하다' }), '단어 · postpone · 연기하다')
  assert.equal(noteAbout({ lesson_title: '전치사', target_label: null }), '레슨 · 전치사 · 레슨 전체')
  const n = (id: string, status: 'new' | 'done', created_at: string) => ({ id, status, kind: 'important' as const, lesson_title: null, point: '메모 내용입니다', question: null, level: null, created_at })
  const r = analyze(student({ notes: [n('a', 'done', '2026-11-15T00:00:00Z'), n('b', 'new', '2026-11-13T00:00:00Z'), n('c', 'new', '2026-11-14T00:00:00Z')] }), latest.date)
  assert.deepEqual(r.notes.map((x) => x.id), ['c', 'b', 'a'])
  assert.deepEqual(r.notesNew.map((x) => x.id), ['c', 'b'])
})
