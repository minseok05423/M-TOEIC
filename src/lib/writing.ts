import { useEffect, useSyncExternalStore } from 'react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase.ts'
import { today } from './date.ts'
import { newId } from './store.ts'
import { explainSyncError } from './sync.ts'
import { normalizeReview, type Review } from '../../supabase/functions/review-writing/review.ts'

/**
 * 회화 탭: 매일 작문 → (최종 확인) → AI 검수 → 선생님과 프리토킹.
 * - 쓰는 중인 글(초안)은 이 휴대폰에만 있어요 (localStorage).
 * - 최종본은 Edge Function(review-writing)이 검수해서 writings 표에 저장해요. 학생은 읽기만 해요.
 * - 프리토킹 메모는 선생님이 앱에서 writing_talks 에 남겨요.
 */

export interface Writing {
  id: string
  user_id: string
  day: string
  topic: string | null
  body: string
  review: Review
  model: string
  cost_usd: number
  created_at: string
}

export interface Talk {
  writing_id: string
  user_id: string
  note: string
  talked_at: string
}

export interface Draft {
  /** 처음 쓸 때 정해 둠 → 보냈는데 응답을 못 받아 다시 보내도 서버에 한 번만 저장 */
  id: string
  day: string
  topic: string
  text: string
  updatedAt: number
}

// ───────── 초안 (이 휴대폰) ─────────

const DRAFT_KEY = 'm-toeic-writing-draft'

export function loadDraft(): Draft | null {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') as Draft | null
    return d && typeof d.text === 'string' ? d : null
  } catch {
    return null
  }
}

export function saveDraft(patch: Partial<Pick<Draft, 'topic' | 'text'>>): Draft {
  const prev = loadDraft()
  // 어제 쓰다 만 글을 오늘 이어 쓰면 오늘 글 (날짜 = 마지막으로 고친 날)
  const d: Draft = { id: prev?.id ?? newId(), topic: prev?.topic ?? '', text: prev?.text ?? '', ...patch, day: today(), updatedAt: Date.now() }
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
  } catch {
    /* 저장 공간이 없으면 화면에만 남음 */
  }
  return d
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* 무시 */
  }
}

// ───────── 내 작문 목록 ─────────

const CACHE_KEY = 'm-toeic-writings'

type Mine = { state: 'idle' | 'loading' } | { state: 'error'; error: string; writings: Writing[]; talks: Record<string, Talk> } | {
  state: 'ready'
  writings: Writing[]
  talks: Record<string, Talk>
}

function cached(): Mine {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as { writings: Writing[]; talks: Record<string, Talk> } | null
    if (c?.writings) return { state: 'ready', writings: c.writings.map(fix), talks: c.talks ?? {} }
  } catch {
    /* 무시 */
  }
  return { state: 'idle' }
}

const fix = (w: Writing): Writing => ({ ...w, review: normalizeReview(w.review), cost_usd: Number(w.cost_usd) })

let mine: Mine = { state: 'idle' }
let loaded = false
const listeners = new Set<() => void>()
function set(m: Mine) {
  mine = m
  if (m.state === 'ready')
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ writings: m.writings, talks: m.talks }))
    } catch {
      /* 무시 */
    }
  listeners.forEach((l) => l())
}

const byDate = (a: Writing, b: Writing) => b.created_at.localeCompare(a.created_at)

async function fetchWritings(userId?: string): Promise<{ writings: Writing[]; talks: Record<string, Talk> }> {
  if (!supabase) throw new Error('서버 설정이 없어요')
  let wq = supabase.from('writings').select('id, user_id, day, topic, body, review, model, cost_usd, created_at').order('created_at', { ascending: false })
  let tq = supabase.from('writing_talks').select('writing_id, user_id, note, talked_at')
  if (userId) {
    wq = wq.eq('user_id', userId)
    tq = tq.eq('user_id', userId)
  }
  const [w, t] = await Promise.all([wq, tq])
  if (w.error) throw w.error
  if (t.error) throw t.error
  return {
    writings: ((w.data ?? []) as Writing[]).map(fix),
    talks: Object.fromEntries(((t.data ?? []) as Talk[]).map((x) => [x.writing_id, x])),
  }
}

async function loadMine() {
  if (!supabase) return
  const prev = mine.state === 'ready' || mine.state === 'error' ? mine : null
  if (!prev) set({ state: 'loading' })
  try {
    set({ state: 'ready', ...(await fetchWritings()) })
  } catch (e) {
    set({ state: 'error', error: explainSyncError(e).message, writings: prev?.writings ?? [], talks: prev?.talks ?? {} })
  }
}

/** 내 작문 + 프리토킹 메모. 화면을 열 때마다 뒤에서 새로 받아요 (먼저 저장해 둔 것을 보여 줌) */
export function useMyWritings(): Mine & { reload: () => void } {
  const s = useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => mine,
  )
  useEffect(() => {
    if (!loaded) {
      loaded = true
      if (mine.state === 'idle') {
        const c = cached()
        if (c.state === 'ready') set(c)
      }
    }
    void loadMine()
  }, [])
  return { ...s, reload: () => void loadMine() }
}

/** 오늘 제출한 글이 있는지 (홈의 오늘 할 일) */
export function writtenToday(writings: Writing[]): Writing | undefined {
  return writings.find((w) => w.day === today())
}

// ───────── 제출 → AI 검수 ─────────

export async function submitDraft(d: Draft): Promise<Writing> {
  if (!supabase) throw new Error('AI 검수는 로그인해야 쓸 수 있어요. (설정 → 로그인)')
  const { data, error } = await supabase.functions.invoke('review-writing', {
    body: { id: d.id, day: d.day, topic: d.topic.trim() || null, text: d.text },
  })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null
      throw new Error(body?.error ?? `서버 오류 (${error.context.status})`)
    }
    throw new Error('인터넷 연결을 확인하고 다시 보내 주세요. 글은 휴대폰에 남아 있어요.')
  }
  const w = fix(data as Writing)
  const prev = mine.state === 'ready' || mine.state === 'error' ? mine : { writings: [], talks: {} }
  set({ state: 'ready', writings: [w, ...prev.writings.filter((x) => x.id !== w.id)].sort(byDate), talks: prev.talks })
  clearDraft()
  return w
}

// ───────── 선생님 ─────────

type Theirs = { state: 'loading' } | { state: 'error'; error: string } | { state: 'ready'; writings: Writing[]; talks: Record<string, Talk> }

const theirs = new Map<string, Theirs>()
const tListeners = new Set<() => void>()
function setTheirs(id: string, v: Theirs) {
  theirs.set(id, v)
  tListeners.forEach((l) => l())
}

async function loadTheirs(userId: string) {
  if (!theirs.has(userId)) setTheirs(userId, { state: 'loading' })
  try {
    setTheirs(userId, { state: 'ready', ...(await fetchWritings(userId)) })
  } catch (e) {
    setTheirs(userId, { state: 'error', error: explainSyncError(e).message })
  }
}

const LOADING: Theirs = { state: 'loading' }

/** 선생님: 학생 한 명의 작문 + 프리토킹 메모 */
export function useStudentWritings(userId: string): Theirs & { reload: () => void } {
  const s = useSyncExternalStore(
    (l) => (tListeners.add(l), () => tListeners.delete(l)),
    () => theirs.get(userId) ?? LOADING,
  )
  useEffect(() => {
    void loadTheirs(userId)
  }, [userId])
  return { ...s, reload: () => void loadTheirs(userId) }
}

/** 선생님: 프리토킹 메모 저장 (했다는 표시 겸). DB 가 선생님만 허락해요 */
export async function saveTalk(w: Writing, note: string) {
  if (!supabase) throw new Error('서버 설정이 없어요')
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('writing_talks')
    .upsert({ writing_id: w.id, user_id: w.user_id, note: note.trim(), talked_at: now, updated_at: now }, { onConflict: 'writing_id' })
  if (error) throw new Error(explainSyncError(error).message)
  await loadTheirs(w.user_id)
}

// ───────── 쓰는 화면 도우미 ─────────

/** 주제가 안 떠오를 때 (초보자가 매일 쓸 수 있는 것) */
export const TOPICS = [
  '오늘 있었던 일',
  '어제 한 일',
  '내 하루 일과',
  '이번 주말 계획',
  '내 가족',
  '내 일 (직업)',
  '좋아하는 음식',
  '요즘 하는 운동',
  '가고 싶은 여행지',
  '영어를 공부하는 이유',
]

/** 최종 제출 전에 스스로 점검 (앱에서 배우는 "문장의 뼈대" 와 맞춤) */
export const SELF_CHECK = [
  '문장마다 주어와 동사가 있나요?',
  '지난 일은 과거형으로 썼나요? (go → went)',
  '문장 첫 글자는 대문자, 끝에는 마침표(.)?',
  '모르는 단어는 한국어로 써도 괜찮아요',
]
