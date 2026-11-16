import { useEffect, useSyncExternalStore } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase.ts'
import { explainSyncError } from './sync.ts'
import { analyze, mergeChapters, type Report, type StudentRaw } from './analytics.ts'
import type { Chapter } from '../content/types.ts'
import type { Progress } from './store.ts'

/**
 * 선생님 계정: app_metadata.role = 'teacher' (npm run teacher -- role <이메일> teacher).
 * 서버(supabase/schema.sql 11번)가 이 역할에게만 학생 기록 읽기를 허락해요. 화면은 그걸 보여 줄 뿐.
 */
export const isTeacher = (s: Session | null | undefined) => s?.user.app_metadata?.role === 'teacher'

/** 지금 선생님 계정으로 보고 있는지 (탭바가 읽음). App 이 렌더할 때 정해요 */
export let teacherMode = false
export function setTeacherMode(v: boolean) {
  teacherMode = v
}

export interface StudentView {
  raw: StudentRaw
  report: Report
}

type ClassState = { state: 'idle' | 'loading' } | { state: 'error'; error: string } | { state: 'ready'; students: StudentView[]; at: number }

let current: ClassState = { state: 'idle' }
const listeners = new Set<() => void>()
function set(s: ClassState) {
  current = s
  listeners.forEach((l) => l())
}

/** PostgREST 는 한 번에 1000줄까지라서 나눠 받기 */
async function every<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999)
    if (error) throw error
    out.push(...(data ?? []))
    if (!data || data.length < 1000) return out
  }
}

const by = <T extends { user_id: string }>(rows: T[]) => {
  const m = new Map<string, T[]>()
  for (const r of rows) m.set(r.user_id, [...(m.get(r.user_id) ?? []), r])
  return m
}

async function load() {
  if (!supabase) return set({ state: 'error', error: '서버 설정이 없어요 (.env.local)' })
  const db = supabase
  set({ state: 'loading' })
  try {
    const st = await db.rpc('teacher_students')
    if (st.error) throw st.error
    const [progress, words, tests, notes, chapters] = await Promise.all([
      every((a, b) => db.from('progress').select('user_id, data, updated_at').range(a, b)),
      every((a, b) => db.from('custom_words').select('user_id, en, ko, deck, created_at, deleted').range(a, b)),
      every((a, b) => db.from('word_tests').select('user_id, day, score, total, items, finished_at').range(a, b)),
      every((a, b) => db.from('lesson_notes').select('user_id, id, status, kind, lesson_title, point, question, level, created_at').range(a, b)),
      every((a, b) => db.from('user_chapters').select('user_id, chapter').range(a, b)),
    ])
    const P = by(progress as { user_id: string; data: Progress; updated_at: string }[])
    const W = by(words as (StudentRaw['words'][number] & { user_id: string })[])
    const T = by(tests as (StudentRaw['tests'][number] & { user_id: string })[])
    const N = by(notes as (StudentRaw['notes'][number] & { user_id: string })[])
    const C = by(chapters as { user_id: string; chapter: Chapter }[])
    const students = ((st.data ?? []) as { id: string; email: string; created_at: string; last_sign_in_at: string | null }[]).map((u) => {
      const p = P.get(u.id)?.[0]
      const raw: StudentRaw = {
        id: u.id,
        email: u.email,
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at,
        progress: p?.data ?? null,
        progressAt: p?.updated_at,
        words: W.get(u.id) ?? [],
        tests: T.get(u.id) ?? [],
        notes: N.get(u.id) ?? [],
        chapters: mergeChapters((C.get(u.id) ?? []).map((r) => r.chapter)),
      }
      return { raw, report: analyze(raw) }
    })
    // 밀린 학생 먼저, 그다음 이메일 순
    const rank = { behind: 0, ok: 1, new: 2 }
    students.sort((a, b) => rank[a.report.status] - rank[b.report.status] || a.raw.email.localeCompare(b.raw.email))
    set({ state: 'ready', students, at: Date.now() })
  } catch (e) {
    set({ state: 'error', error: explainSyncError(e).message })
  }
}

/** 반 전체 기록. 처음 한 번 불러오고, reload 로 새로고침 */
export function useClass(): ClassState & { reload: () => void } {
  const s = useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => current,
  )
  useEffect(() => {
    if (current.state === 'idle') void load()
  }, [])
  return { ...s, reload: () => void load() }
}
