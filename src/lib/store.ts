import { useSyncExternalStore } from 'react'
import type { SrsCard } from './srs.ts'
import { review } from './srs.ts'
import { today } from './date.ts'
import type { Chapter } from '../content/types.ts'

export interface LessonProgress {
  read?: boolean
  sentences?: boolean
  cards?: boolean
  quizBest?: number
  quizLast?: number
  quizTotal?: number
  /** 마지막으로 푼 퀴즈에서 틀린 문제 id */
  wrong?: string[]
  u: number
}

export interface Progress {
  /** key: `${chapterId}/${lessonId}` */
  lessons: Record<string, LessonProgress>
  /** key: 단어 key (lib/words.ts) */
  srs: Record<string, SrsCard>
  /** 'YYYY-MM-DD' → 그날 공부한 횟수 (연속 학습일 계산용) */
  days: Record<string, number>
}

/** 학생이 직접 추가한 단어 */
export interface CustomWord {
  id: string
  en: string
  ko: string
  exEn?: string
  exKo?: string
  tip?: string
  /** 묶음 이름 (예: '내 단어', 'Day 1') */
  deck: string
  createdAt: number
  updatedAt: number
  /** 삭제 표시 (동기화를 위해 바로 지우지 않음) */
  deleted?: boolean
}

/** 학생이 레슨에서 남긴 메모. 형식은 NoteSheet 가 강제 (DB 표 lesson_notes 와 1:1) */
export type NoteKind = 'important' | 'confusing'
export type NoteCategory = 'meaning' | 'structure' | 'grammar' | 'answer' | 'other'
export type NoteStage = 'lesson' | 'learn' | 'words' | 'sentences' | 'quiz'

export interface LessonNote {
  id: string
  chapterId: string
  lessonId: string
  lessonTitle: string
  stage: NoteStage
  /** 'learn:s2' · 'words:w:agenda' · 'sentences:s1' · 'quiz:q3'. 없으면 레슨 전체 */
  targetId?: string
  targetLabel?: string
  kind: NoteKind
  /** 헷갈리는 점: 어디서 막혔는지 */
  category?: NoteCategory
  /** 중요한 점: 내 말로 정리 / 헷갈리는 점: 지금 내가 이해한 것 */
  point: string
  /** 헷갈리는 점: 무엇이 헷갈리는지 */
  question?: string
  example?: string
  /** 헷갈리는 점: 1 조금 · 2 꽤 · 3 전혀 모르겠음 */
  level?: 1 | 2 | 3
  createdAt: number
  /** 서버에 올라갔는지 */
  synced?: boolean
  /** 서버에서 받은 것: 선생님이 반영했는지 + 한마디 */
  status?: 'new' | 'done'
  reply?: string
}

export interface Settings {
  /** 발음 속도 */
  rate: number
  /** 카드 넘길 때 자동으로 발음 */
  autoSpeak: boolean
  /** 정답·오답 효과음 */
  sfx: boolean
  lastDeck: string
  /** Supabase 가 설정돼 있어도 로그인 없이 이 기기에서만 쓰기 */
  skipLogin?: boolean
}

export interface State {
  progress: Progress
  words: Record<string, CustomWord>
  notes: Record<string, LessonNote>
  /** 이 학생에게만 보이는 맞춤 챕터 (서버 user_chapters 의 사본. 오프라인에서도 보이게 저장) */
  userChapters: Chapter[]
  settings: Settings
}

const KEY = 'mtoeic:v1'

export const emptyProgress = (): Progress => ({ lessons: {}, srs: {}, days: {} })
const defaultSettings: Settings = { rate: 0.9, autoSpeak: true, sfx: true, lastDeck: '내 단어' }

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as Partial<State>
      return {
        progress: { ...emptyProgress(), ...s.progress },
        words: s.words ?? {},
        notes: s.notes ?? {},
        userChapters: s.userChapters ?? [],
        settings: { ...defaultSettings, ...s.settings },
      }
    }
  } catch {
    /* 손상된 저장 데이터는 무시 */
  }
  return { progress: emptyProgress(), words: {}, notes: {}, userChapters: [], settings: defaultSettings }
}

let state: State = load()
const listeners = new Set<() => void>()
let onLocalChange: (() => void) | null = null

export function getState(): State {
  return state
}

export function setState(update: (s: State) => State, opts: { fromSync?: boolean } = {}) {
  const next = update(state)
  if (next === state) return
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* 저장 공간 부족 등 */
  }
  listeners.forEach((l) => l())
  if (!opts.fromSync) onLocalChange?.()
}

/** 동기화 모듈이 로컬 변경을 감지할 때 사용 */
export function setLocalChangeHook(fn: (() => void) | null) {
  onLocalChange = fn
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** selector 는 state 의 일부를 그대로 돌려줘야 함 (새 객체를 만들면 무한 렌더) */
export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state))
}

// ───────── actions ─────────

export const lessonKey = (chapterId: string, lessonId: string) => `${chapterId}/${lessonId}`

function bumpDay(p: Progress): Progress['days'] {
  const d = today()
  return { ...p.days, [d]: (p.days[d] ?? 0) + 1 }
}

export function markLesson(chapterId: string, lessonId: string, patch: Partial<Omit<LessonProgress, 'u'>>) {
  const key = lessonKey(chapterId, lessonId)
  setState((s) => {
    const prev = s.progress.lessons[key]
    if (prev && Object.entries(patch).every(([k, v]) => prev[k as keyof LessonProgress] === v)) return s
    return {
      ...s,
      progress: {
        ...s.progress,
        lessons: { ...s.progress.lessons, [key]: { ...prev, ...patch, u: Date.now() } },
      },
    }
  })
}

export function recordQuiz(chapterId: string, lessonId: string, score: number, total: number, wrong: string[], full: boolean) {
  const key = lessonKey(chapterId, lessonId)
  setState((s) => {
    const prev = s.progress.lessons[key]
    const lp: LessonProgress = { ...prev, u: Date.now() }
    if (full) {
      lp.quizLast = score
      lp.quizTotal = total
      lp.quizBest = Math.max(prev?.quizBest ?? 0, score)
      lp.wrong = wrong
    } else {
      // 틀린 문제만 다시 풀기: 이번에도 틀린 것만 남김
      lp.wrong = wrong
    }
    return {
      ...s,
      progress: { ...s.progress, lessons: { ...s.progress.lessons, [key]: lp }, days: bumpDay(s.progress) },
    }
  })
}

export function reviewWord(key: string, known: boolean) {
  setState((s) => ({
    ...s,
    progress: {
      ...s.progress,
      srs: { ...s.progress.srs, [key]: review(s.progress.srs[key], known) },
      days: bumpDay(s.progress),
    },
  }))
}

export function newId(): string {
  return crypto.randomUUID()
}

export function saveWord(w: Omit<CustomWord, 'createdAt' | 'updatedAt'> & { createdAt?: number }) {
  const now = Date.now()
  setState((s) => ({
    ...s,
    words: { ...s.words, [w.id]: { ...w, createdAt: w.createdAt ?? now, updatedAt: now } },
    settings: { ...s.settings, lastDeck: w.deck },
  }))
}

export function saveWords(list: Omit<CustomWord, 'createdAt' | 'updatedAt'>[]) {
  const now = Date.now()
  setState((s) => {
    const words = { ...s.words }
    list.forEach((w, i) => (words[w.id] = { ...w, createdAt: now + i, updatedAt: now + i }))
    return { ...s, words, settings: { ...s.settings, lastDeck: list[0]?.deck ?? s.settings.lastDeck } }
  })
}

export function deleteWord(id: string) {
  setState((s) => {
    const w = s.words[id]
    if (!w) return s
    return { ...s, words: { ...s.words, [id]: { ...w, deleted: true, updatedAt: Date.now() } } }
  })
}

/** 새로 추가한 단어를 오늘 복습 목록에 넣기 */
export function startWords(keys: string[]) {
  setState((s) => {
    const srs = { ...s.progress.srs }
    let changed = false
    for (const k of keys)
      if (!srs[k]) {
        srs[k] = { box: 0, due: today(), reps: 0, lapses: 0, u: Date.now() }
        changed = true
      }
    return changed ? { ...s, progress: { ...s.progress, srs } } : s
  })
}

export function setSettings(patch: Partial<Settings>) {
  setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }), { fromSync: true })
}

export function resetProgress() {
  setState((s) => ({ ...s, progress: emptyProgress() }))
}

export function addNote(n: Omit<LessonNote, 'id' | 'createdAt'>): LessonNote {
  const note: LessonNote = { ...n, id: newId(), createdAt: Date.now() }
  setState((s) => ({ ...s, notes: { ...s.notes, [note.id]: note } }))
  return note
}
