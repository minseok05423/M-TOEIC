import { useState } from 'react'
import type { StudyWord } from '../lib/words.ts'
import { getState, reviewWord } from '../lib/store.ts'
import { speak } from '../lib/tts.ts'
import { Speak } from './Speak.tsx'

/**
 * 카드 한 장씩: 영어 → (탭) 뜻 → 알아요 / 몰라요.
 * 몰라요 한 카드는 세션 끝에 한 번 더 나옴.
 */
export function Flashcards({ words, onDone }: { words: StudyWord[]; onDone: (known: number, again: number) => void }) {
  const [queue, setQueue] = useState(words)
  const [pos, setPos] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [retried, setRetried] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState({ known: 0, again: 0 })

  const w = queue[pos]
  if (!w) return null

  function answer(known: boolean) {
    reviewWord(w.key, known)
    const firstTime = !retried.has(w.key)
    let q = queue
    if (!known && firstTime) {
      q = [...queue, w]
      setQueue(q)
      setRetried(new Set(retried).add(w.key))
    }
    const s = firstTime ? { known: stats.known + (known ? 1 : 0), again: stats.again + (known ? 0 : 1) } : stats
    setStats(s)
    const nextW = q[pos + 1]
    if (!nextW) {
      onDone(s.known, s.again)
      return
    }
    setPos(pos + 1)
    setFlipped(false)
    if (getState().settings.autoSpeak) speak(nextW.en)
  }

  return (
    <div className="cards">
      <div className="progress-bar">
        <div style={{ width: `${(pos / queue.length) * 100}%` }} />
      </div>
      <p className="quiz-count">
        {pos + 1} / {queue.length}
        {retried.has(w.key) && pos >= words.length && <span className="again-tag"> 다시 한 번!</span>}
      </p>

      <button type="button" className={`flashcard ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(true)}>
        <span className="fc-group">{w.group}</span>
        <span className="fc-en">{w.en}</span>
        {!flipped ? (
          <span className="fc-hint">눌러서 뜻 보기 👆</span>
        ) : (
          <span className="fc-back">
            <span className="fc-ko">{w.ko}</span>
            {w.ex && (
              <span className="fc-ex">
                {w.ex.en}
                <br />
                <span className="muted">{w.ex.ko}</span>
              </span>
            )}
            {w.tip && <span className="fc-tip">💡 {w.tip}</span>}
          </span>
        )}
      </button>

      <div className="fc-speak">
        <Speak text={w.en} />
        {w.ex && <Speak text={w.ex.en} label="예문 듣기" />}
      </div>

      {flipped ? (
        <div className="fc-actions">
          <button type="button" className="btn again" onClick={() => answer(false)}>
            😅 몰라요
          </button>
          <button type="button" className="btn know" onClick={() => answer(true)}>
            👍 알아요
          </button>
        </div>
      ) : (
        <div className="fc-actions">
          <button type="button" className="btn block" onClick={() => setFlipped(true)}>
            뜻 보기
          </button>
        </div>
      )}
    </div>
  )
}

export function CardsDone({
  known,
  again,
  children,
}: {
  known: number
  again: number
  children?: React.ReactNode
}) {
  const total = known + again
  const emoji = again === 0 ? '🏆' : known >= again ? '💪' : '🌱'
  return (
    <div className="done">
      <div className="done-emoji">{emoji}</div>
      <h2>{total}개 끝!</h2>
      <p>
        한 번에 맞힘 <b className="good">{known}</b> · 다시 본 단어 <b className="bad">{again}</b>
      </p>
      <p className="muted">틀린 단어는 내일 다시 나와요. 맞힌 단어는 점점 더 나중에 나와요.</p>
      <div className="done-actions">{children}</div>
    </div>
  )
}
