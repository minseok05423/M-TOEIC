import { useSyncExternalStore } from 'react'
import { supabase } from './supabase.ts'
import { getState, setLocalChangeHook, setState, startWords, type CustomWord, type Progress } from './store.ts'
import { mergeProgress, mergeWords } from './merge.ts'

/**
 * 로컬 우선 동기화.
 * 앱은 항상 localStorage 로 동작하고, 로그인되어 있으면 Supabase 와
 * "가져오기 → 항목별 최신 것으로 병합 → 바뀐 것만 올리기" 를 합니다.
 */

export interface SyncStatus {
  state: 'off' | 'idle' | 'syncing' | 'error'
  lastSync?: number
  error?: string
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
  created_at: new Date(w.createdAt).toISOString(),
  updated_at: new Date(w.updatedAt).toISOString(),
  deleted: !!w.deleted,
})

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
    const [p, w] = await Promise.all([
      supabase.from('progress').select('data').eq('user_id', userId).maybeSingle(),
      supabase.from('custom_words').select('*').eq('user_id', userId),
    ])
    if (p.error) throw p.error
    if (w.error) throw w.error
    const remoteProgress = (p.data?.data ?? null) as Partial<Progress> | null
    const remoteWords: Record<string, CustomWord> = {}
    for (const r of w.data as WordRow[]) remoteWords[r.id] = toWord(r)

    // 2) 병합 (그 사이 생긴 로컬 변경도 보존)
    setState(
      (s) => ({ ...s, progress: mergeProgress(s.progress, remoteProgress), words: mergeWords(s.words, remoteWords) }),
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
    for (const r of await Promise.all(ups)) if (r.error) throw r.error

    setStatus({ state: 'idle', lastSync: Date.now(), error: undefined })
  } catch (e) {
    const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? String(e)
    setStatus({ state: 'error', error: navigator.onLine ? msg : '오프라인 — 연결되면 자동으로 저장돼요' })
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
