import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen } from 'lucide-react'
import { getState, useStore } from '../lib/store.ts'
import { allWords, type StudyWord } from '../lib/words.ts'
import { isDue, MAX_BOX, type SrsCard } from '../lib/srs.ts'
import { addDays, formatDate, today } from '../lib/date.ts'
import { href } from '../lib/router.ts'
import { stars } from '../lib/game.ts'
import { TopBar } from '../components/TopBar.tsx'
import { WordGame, type GameResult } from '../components/WordGame.tsx'
import { GameDone } from '../components/GameDone.tsx'

const SESSION = 15

export function dueWords(srs: Record<string, SrsCard>, map: Map<string, StudyWord>): StudyWord[] {
  const d = today()
  return Object.entries(srs)
    .filter(([k, c]) => isDue(c, d) && map.has(k))
    .sort((a, b) => a[1].due.localeCompare(b[1].due) || a[1].box - b[1].box)
    .map(([k]) => map.get(k)!)
}

/** 상자(box) 별 단어 수: 0 다시 보기 … 6 완벽 */
function Shelf({ cards }: { cards: SrsCard[] }) {
  const counts = Array.from({ length: MAX_BOX + 1 }, (_, b) => cards.filter((c) => c.box === b).length)
  const max = Math.max(1, ...counts)
  return (
    <div className="shelf" aria-label="외운 정도별 단어 수">
      {counts.map((n, b) => (
        <div key={b} className="shelf-col">
          <span className="shelf-n">{n || ''}</span>
          <span className={`shelf-bar b${b} ${n ? '' : 'zero'}`} style={{ height: `${8 + (n / max) * 72}px` }} />
          <span className="shelf-l">{b === 0 ? '새' : b === MAX_BOX ? '완벽' : b}</span>
        </div>
      ))}
    </div>
  )
}

export function Review() {
  const srs = useStore((s) => s.progress.srs)
  const words = useStore((s) => s.words)
  const map = useMemo(() => allWords(words), [words])
  const due = useMemo(() => dueWords(srs, map), [srs, map])
  const [session, setSession] = useState<StudyWord[] | null>(null)
  const [snap, setSnap] = useState(srs)
  const [result, setResult] = useState<GameResult | null>(null)
  const [round, setRound] = useState(0)

  const stats = useMemo(() => {
    const cards = Object.entries(srs).filter(([k]) => map.has(k))
    const tomorrow = addDays(today(), 1)
    const upcoming = cards.filter(([, c]) => c.due > today()).sort((a, b) => a[1].due.localeCompare(b[1].due))
    return {
      cards: cards.map(([, c]) => c),
      total: cards.length,
      mastered: cards.filter(([, c]) => c.box >= MAX_BOX).length,
      tomorrow: cards.filter(([, c]) => c.due === tomorrow).length,
      next: upcoming[0]?.[1].due,
    }
  }, [srs, map])

  const start = () => {
    setSnap(getState().progress.srs)
    setSession(due.slice(0, SESSION))
    setResult(null)
    setRound(round + 1)
  }

  if (session && !result)
    return (
      <WordGame
        key={round}
        words={session}
        pool={[...map.values()]}
        isNew={(w) => !snap[w.key] || snap[w.key].reps === 0}
        exitHref="#/review"
        onDone={setResult}
      />
    )

  if (result)
    return (
      <div className="page">
        <GameDone
          stars={stars(result.right, result.right + result.wrong)}
          title="복습 끝!"
          line="맞힌 단어는 더 나중에, 틀린 단어는 내일 다시 나와요."
          stats={[
            { label: '한 번에 맞힘', value: `${result.right}/${result.total}` },
            { label: '최고 연속', value: result.bestCombo },
          ]}
        >
          {due.length > 0 ? (
            <button type="button" className="btn primary block big" onClick={start}>
              남은 {due.length}개 계속하기
            </button>
          ) : (
            <a className="btn primary block big" href="#/">
              홈으로
            </a>
          )}
          <button type="button" className="btn block big" onClick={() => (setSession(null), setResult(null))}>
            복습 기록 보기
          </button>
        </GameDone>
      </div>
    )

  return (
    <div className="page">
      <TopBar title="복습" />
      {due.length ? (
        <div className="review-card">
          <p className="rc-label">오늘 복습할 단어</p>
          <p className="rc-num">
            {due.length}
            <small>개</small>
          </p>
          <p className="muted small">{due.length > SESSION ? `한 판에 ${SESSION}개씩 해요. 5분이면 끝나요.` : '잊기 직전에 한 번 더 보면 오래가요.'}</p>
          <button type="button" className="btn primary block big" onClick={start}>
            복습 시작 <ArrowRight size={19} />
          </button>
        </div>
      ) : (
        <div className="review-card calm">
          <p className="rc-label">오늘 복습 끝</p>
          <p className="muted">
            {stats.next ? `다음 복습은 ${formatDate(stats.next)}이에요.` : '레슨에서 단어 게임을 하거나 내 단어를 추가하면 여기에 나와요.'}
          </p>
          <a className="btn block" href={href('words')}>
            <BookOpen size={18} /> 단어장 가기
          </a>
        </div>
      )}

      {stats.total > 0 && (
        <section className="card">
          <h3 className="group-title">외운 정도</h3>
          <Shelf cards={stats.cards} />
          <p className="small muted">맞힐 때마다 오른쪽 칸으로 한 칸씩, 틀리면 "새" 칸으로 돌아가요.</p>
        </section>
      )}

      <div className="stats">
        <div>
          <b>{stats.total}</b>
          <span>외우는 단어</span>
        </div>
        <div>
          <b>{stats.mastered}</b>
          <span>완벽히 외움</span>
        </div>
        <div>
          <b>{stats.tomorrow}</b>
          <span>내일 복습</span>
        </div>
      </div>
    </div>
  )
}
