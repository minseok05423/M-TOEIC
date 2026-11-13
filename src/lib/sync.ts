import { useSyncExternalStore } from 'react'
import { supabase } from './supabase.ts'
import { getState, setLocalChangeHook, setState, startWords, type CustomWord, type LessonNote, type Progress, type WordTest } from './store.ts'
import { mergeProgress, mergeWords } from './merge.ts'
import { validateChapters } from '../content/validate.ts'
import type { Chapter } from '../content/types.ts'

/**
 * 로컬 우선 동기화.
 * 앱은 항상 localStorage 로 동작하고, 로그인되어 있으면 Supabase 와
 * "가져오기 → 항목별 최신 것으로 병합 → 바뀐 것만 올리기" 를 합니다.
 */

export interface SyncStatus {
  state: 'off' | 'idle' | 'syncing' | 'error'
  lastSync?: number
  error?: string
  /** 'setup' = 서버 표가 없거나 권한이 없음 (관리자가 schema.sql 실행 필요) */
  kind?: 'offline' | 'setup' | 'auth' | 'other'
}

/** Supabase/PostgREST 오류를 사람이 고칠 수 있는 말로 */
export function explainSyncError(e: unknown): { kind: NonNullable<SyncStatus['kind']>; message: string } {
  const err = (e ?? {}) as { code?: string; message?: string; status?: number }
  const msg = err.message ?? String(e)
  if (!navigator.onLine || /failed to fetch|network|load failed/i.test(msg))
    return { kind: 'offline', message: '오프라인이에요. 연결되면 자동으로 저장돼요' }
  if (err.code === 'PGRST205' || err.code === '42P01' || /schema cache|does not exist/i.test(msg))
    return { kind: 'setup', message: '서버에 저장할 표가 아직 없어요. 선생님께 알려 주세요 (supabase/schema.sql 실행 필요)' }
  if (err.code === '42501' || /permission denied|row-level security/i.test(msg))
    return { kind: 'setup', message: '서버 권한 설정이 필요해요. 선생님께 알려 주세요 (supabase/schema.sql 다시 실행)' }
  if (err.status === 401 || /jwt|token|not authenticated/i.test(msg))
    return { kind: 'auth', message: '로그인이 만료됐어요. 로그아웃 후 다시 로그인해 주세요' }
  return { kind: 'other', message: msg }
}

let status: SyncStatus = { state: supabase ? 'idle' : 'off' }
const listeners = new Set<() => void>()
function setStatus(s: Partial<SyncStatus>) {
  status = { ...status, ...s }
  listeners.forEach((l) => l())
}
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => status,
  )
}

interface WordRow {
  id: string
  en: string
  ko: string
  ex_en: string | null
  ex_ko: string | null
  tip: string | null
  deck: string
  important: boolean | null
  created_at: string
  updated_at: string
  deleted: boolean
}

const toWord = (r: WordRow): CustomWord => ({
  id: r.id,
  en: r.en,
  ko: r.ko,
  exEn: r.ex_en ?? undefined,
  exKo: r.ex_ko ?? undefined,
  tip: r.tip ?? undefined,
  deck: r.deck,
  important: r.important || undefined,
  createdAt: Date.parse(r.created_at),
  updatedAt: Date.parse(r.updated_at),
  deleted: r.deleted || undefined,
})

const toRow = (w: CustomWord, userId: string) => ({
  id: w.id,
  user_id: userId,
  en: w.en,
  ko: w.ko,
  ex_en: w.exEn ?? null,
  ex_ko: w.exKo ?? null,
  tip: w.tip ?? null,
  deck: w.deck,
  important: !!w.important,
  created_at: new Date(w.createdAt).toISOString(),
  updated_at: new Date(w.updatedAt).toISOString(),
  deleted: !!w.deleted,
})

interface NoteRow {
  id: string
  chapter_id: string
  lesson_id: string
  lesson_title: string
  stage: LessonNote['stage']
  target_id: string | null
  target_label: string | null
  kind: LessonNote['kind']
  category: LessonNote['category'] | null
  point: string
  question: string | null
  example: string | null
  level: LessonNote['level'] | null
  status: 'new' | 'done'
  reply: string | null
  created_at: string
}

const noteToRow = (n: LessonNote, userId: string) => ({
  id: n.id,
  user_id: userId,
  chapter_id: n.chapterId,
  lesson_id: n.lessonId,
  lesson_title: n.lessonTitle,
  stage: n.stage,
  target_id: n.targetId ?? null,
  target_label: n.targetLabel ?? null,
  kind: n.kind,
  category: n.category ?? null,
  point: n.point,
  question: n.question ?? null,
  example: n.example ?? null,
  level: n.level ?? null,
  created_at: new Date(n.createdAt).toISOString(),
})

const rowToNote = (r: NoteRow): LessonNote => ({
  id: r.id,
  chapterId: r.chapter_id,
  lessonId: r.lesson_id,
  lessonTitle: r.lesson_title,
  stage: r.stage,
  targetId: r.target_id ?? undefined,
  targetLabel: r.target_label ?? undefined,
  kind: r.kind,
  category: r.category ?? undefined,
  point: r.point,
  question: r.question ?? undefined,
  example: r.example ?? undefined,
  level: r.level ?? undefined,
  createdAt: Date.parse(r.created_at),
  synced: true,
  status: r.status,
  reply: r.reply ?? undefined,
})

/** 서버 메모(선생님이 반영 표시·답장) 를 로컬에 합침. 로컬에만 있는 건 그대로 (아직 안 올라감) */
function mergeNotes(local: Record<string, LessonNote>, remote: NoteRow[]): Record<string, LessonNote> {
  const out = { ...local }
  for (const r of remote) {
    const n = rowToNote(r)
    const l = out[r.id]
    out[r.id] = l ? { ...l, synced: true, status: n.status, reply: n.reply } : n
  }
  return out
}

interface TestRow {
  id: string
  day: string
  items: WordTest['items']
  score: number
  total: number
  started_at: string
  finished_at: string
}

const testToRow = (t: WordTest, userId: string) => ({
  id: t.id,
  user_id: userId,
  day: t.day,
  items: t.items,
  score: t.score,
  total: t.total,
  started_at: new Date(t.startedAt).toISOString(),
  finished_at: new Date(t.finishedAt).toISOString(),
})

/** 서버에만 있는 테스트(다른 기기에서 본 것)를 가져오고, 서버에 있는 건 올라간 것으로 표시 */
function mergeTests(local: Record<string, WordTest>, remote: TestRow[]): Record<string, WordTest> {
  const out = { ...local }
  for (const r of remote)
    out[r.id] = out[r.id]
      ? { ...out[r.id], synced: true }
      : {
          id: r.id,
          day: r.day,
          items: r.items,
          score: r.score,
          total: r.total,
          startedAt: Date.parse(r.started_at),
          finishedAt: Date.parse(r.finished_at),
          synced: true,
        }
  return out
}

/** 맞춤 챕터는 검사를 통과한 것만 보여 줌 (깨진 챕터 하나 때문에 앱이 멈추지 않게) */
function usableChapters(rows: { chapter: unknown }[]): Chapter[] {
  return rows
    .map((r) => r.chapter)
    .filter((c) => {
      const { errors } = validateChapters([c])
      if (errors.length) console.warn('맞춤 챕터 건너뜀', errors)
      return !errors.length
    }) as Chapter[]
}

let running = false
let again = false

export async function syncNow(): Promise<void> {
  if (!supabase) return
  if (running) {
    again = true
    return
  }
  const { data: auth } = await supabase.auth.getSession()
  const userId = auth.session?.user.id
  if (!userId) return
  running = true
  setStatus({ state: 'syncing' })
  try {
    // 1) 가져오기
    const [p, w, n, c, t] = await Promise.all([
      supabase.from('progress').select('data').eq('user_id', userId).maybeSingle(),
      supabase.from('custom_words').select('*').eq('user_id', userId),
      supabase.from('lesson_notes').select('*').eq('user_id', userId),
      supabase.from('user_chapters').select('chapter').eq('user_id', userId),
      supabase.from('word_tests').select('id, day, items, score, total, started_at, finished_at').eq('user_id', userId),
    ])
    if (p.error) throw p.error
    if (w.error) throw w.error
    if (n.error) throw n.error
    if (c.error) throw c.error
    if (t.error) throw t.error
    const remoteProgress = (p.data?.data ?? null) as Partial<Progress> | null
    const remoteWords: Record<string, CustomWord> = {}
    for (const r of w.data as WordRow[]) remoteWords[r.id] = toWord(r)

    // 2) 병합 (그 사이 생긴 로컬 변경도 보존)
    const chapters = usableChapters(c.data)
    setState(
      (s) => ({
        ...s,
        progress: mergeProgress(s.progress, remoteProgress),
        words: mergeWords(s.words, remoteWords),
        notes: mergeNotes(s.notes, n.data as NoteRow[]),
        tests: mergeTests(s.tests, t.data as TestRow[]),
        userChapters: JSON.stringify(chapters) === JSON.stringify(s.userChapters) ? s.userChapters : chapters,
      }),
      { fromSync: true },
    )

    // 선생님이 대시보드에서 넣은 단어도 복습 목록에 넣기
    const st = getState()
    startWords(Object.values(st.words).filter((x) => !x.deleted && !st.progress.srs[`c:${x.id}`]).map((x) => `c:${x.id}`))

    // 3) 바뀐 것만 올리기
    const local = getState()
    const ups: PromiseLike<{ error: unknown }>[] = []
    if (JSON.stringify(local.progress) !== JSON.stringify(remoteProgress))
      ups.push(
        supabase
          .from('progress')
          .upsert({ user_id: userId, data: local.progress, updated_at: new Date().toISOString() }),
      )
    const changed = Object.values(local.words).filter(
      (x) => !remoteWords[x.id] || x.updatedAt > remoteWords[x.id].updatedAt,
    )
    if (changed.length) ups.push(supabase.from('custom_words').upsert(changed.map((x) => toRow(x, userId))))
    // 메모는 보내기만 함 (학생은 고치거나 지울 수 없음). 이미 올라간 id 는 무시
    const unsent = Object.values(local.notes).filter((x) => !x.synced)
    if (unsent.length)
      ups.push(supabase.from('lesson_notes').upsert(unsent.map((x) => noteToRow(x, userId)), { onConflict: 'id', ignoreDuplicates: true }))
    // 테스트 결과도 보내기만 함
    const unsentTests = Object.values(local.tests).filter((x) => !x.synced)
    if (unsentTests.length)
      ups.push(supabase.from('word_tests').upsert(unsentTests.map((x) => testToRow(x, userId)), { onConflict: 'id', ignoreDuplicates: true }))
    for (const r of await Promise.all(ups)) if (r.error) throw r.error
    if (unsent.length || unsentTests.length) {
      const sent = new Set(unsent.map((x) => x.id))
      const sentTests = new Set(unsentTests.map((x) => x.id))
      setState(
        (s) => ({
          ...s,
          notes: Object.fromEntries(Object.entries(s.notes).map(([k, v]) => [k, sent.has(k) ? { ...v, synced: true, status: v.status ?? 'new' } : v])),
          tests: Object.fromEntries(Object.entries(s.tests).map(([k, v]) => [k, sentTests.has(k) ? { ...v, synced: true } : v])),
        }),
        { fromSync: true },
      )
    }

    setStatus({ state: 'idle', lastSync: Date.now(), error: undefined, kind: undefined })
  } catch (e) {
    const { kind, message } = explainSyncError(e)
    setStatus({ state: 'error', error: message, kind })
  } finally {
    running = false
    if (again) {
      again = false
      void syncNow()
    }
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
function schedule(ms = 2500) {
  clearTimeout(timer)
  timer = setTimeout(() => void syncNow(), ms)
}

let started = false
/** 로그인 직후 한 번 호출 */
export function startSync() {
  if (!supabase || started) return
  started = true
  setLocalChangeHook(() => schedule())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') schedule(300)
    else void syncNow() // 앱을 내릴 때 바로 저장
  })
  window.addEventListener('online', () => schedule(300))
  void syncNow()
}
