import { useMemo, useState } from 'react'
import { useStore } from '../lib/store.ts'
import { allWords, type StudyWord } from '../lib/words.ts'
import { isDue, MAX_BOX, type SrsCard } from '../lib/srs.ts'
import { addDays, formatDate, today } from '../lib/date.ts'
import { href } from '../lib/router.ts'
import { TopBar } from '../components/TopBar.tsx'
import { CardsDone, Flashcards } from '../components/Flashcards.tsx'

const SESSION = 20

export function dueWords(srs: Record<string, SrsCard>, map: Map<string, StudyWord>): StudyWord[] {
  const d = today()
  return Object.entries(srs)
    .filter(([k, c]) => isDue(c, d) && map.has(k))
    .sort((a, b) => a[1].due.localeCompare(b[1].due) || a[1].box - b[1].box)
    .map(([k]) => map.get(k)!)
}

export function Review() {
  const srs = useStore((s) => s.progress.srs)
  const words = useStore((s) => s.words)
  const map = useMemo(() => allWords(words), [words])
  const due = useMemo(() => dueWords(srs, map), [srs, map])
  const [session, setSession] = useState<StudyWord[] | null>(null)
  const [done, setDone] = useState<{ known: number; again: number } | null>(null)
  const [round, setRound] = useState(0)

  const stats = useMemo(() => {
    const cards = Object.entries(srs).filter(([k]) => map.has(k))
    const tomorrow = addDays(today(), 1)
    const upcoming = cards.filter(([, c]) => c.due > today()).sort((a, b) => a[1].due.localeCompare(b[1].due))
    return {
      total: cards.length,
      mastered: cards.filter(([, c]) => c.box >= MAX_BOX).length,
      tomorrow: cards.filter(([, c]) => c.due === tomorrow).length,
      next: upcoming[0]?.[1].due,
    }
  }, [srs, map])

  const start = () => {
    setSession(due.slice(0, SESSION))
    setDone(null)
    setRound(round + 1)
  }

  if (session && !done)
    return (
      <div className="page">
        <TopBar back="#/review" title="🔁 복습" right={<button type="button" className="link small" onClick={() => setSession(null)}>그만</button>} />
        <Flashcards key={round} words={session} onDone={(known, again) => setDone({ known, again })} />
      </div>
    )

  return (
    <div className="page">
      <TopBar title="🔁 복습" />
      {done && (
        <CardsDone {...done}>
          {due.length > 0 && (
            <button type="button" className="btn primary block" onClick={start}>
              남은 {due.length}개 계속하기
            </button>
          )}
        </CardsDone>
      )}
      {!done &&
        (due.length ? (
          <div className="card quiz-intro">
            <p className="done-emoji">🔁</p>
            <h2>오늘 복습 {due.length}개</h2>
            <p className="muted">
              {due.length > SESSION ? `한 번에 ${SESSION}개씩 해요.` : '금방 끝나요!'}
            </p>
            <button type="button" className="btn primary block big" onClick={start}>
              복습 시작
            </button>
          </div>
        ) : (
          <div className="card quiz-intro">
            <p className="done-emoji">✨</p>
            <h2>오늘 복습할 단어가 없어요</h2>
            <p className="muted">
              {stats.next ? `다음 복습: ${formatDate(stats.next)}` : '레슨 단어나 내 단어를 카드로 외우면 여기에 나와요.'}
            </p>
            <a className="btn block" href={href('words')}>
              📒 단어장 가기
            </a>
          </div>
        ))}
      <div className="stats">
        <div>
          <b>{stats.total}</b>
          <span>외우는 단어</span>
        </div>
        <div>
          <b>{stats.mastered}</b>
          <span>완벽 ⭐</span>
        </div>
        <div>
          <b>{stats.tomorrow}</b>
          <span>내일 복습</span>
        </div>
      </div>
    </div>
  )
}
