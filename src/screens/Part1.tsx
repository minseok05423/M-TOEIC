import { useEffect, useState } from 'react'
import { ArrowRight, Camera, Check, Headphones, Volume2, X } from 'lucide-react'
import { PART1, type Part1Item } from '../content/part1.ts'
import { shuffle, stars } from '../lib/game.ts'
import { speakSequence, stopSpeaking, ttsSupported } from '../lib/tts.ts'
import { sfx } from '../lib/sfx.ts'
import { markStudied } from '../lib/store.ts'
import { useImmersive } from '../lib/ui.ts'
import { TopBar } from '../components/TopBar.tsx'
import { RunHead } from '../components/RunHead.tsx'
import { GameDone } from '../components/GameDone.tsx'

/** 한 판 문제 수 */
const ROUND = 6
const LETTERS = ['A', 'B', 'C', 'D']

/** 토익 Part 1 (사진 묘사) 듣기 연습: 장면 설명을 보고 → 네 문장을 듣고 → 맞는 것 고르기 */
export function Part1() {
  const [run, setRun] = useState<{ items: Part1Item[]; n: number } | null>(null)
  const [done, setDone] = useState<{ right: number; total: number } | null>(null)
  const start = () => {
    setDone(null)
    setRun({ items: shuffle(PART1).slice(0, ROUND), n: (run?.n ?? 0) + 1 })
  }

  if (run && !done) return <Round key={run.n} items={run.items} onDone={setDone} />

  if (done)
    return (
      <div className="page">
        <GameDone
          stars={stars(done.right, done.total)}
          title="Part 1 연습 끝!"
          line="틀린 문장은 단어장에서 동사를 한 번 더 봐요."
          stats={[{ label: '맞힘', value: `${done.right}/${done.total}` }]}
        >
          <button type="button" className="btn primary block big" onClick={start}>
            한 판 더
          </button>
          <a className="btn block big" href="#/review">
            복습으로
          </a>
        </GameDone>
      </div>
    )

  return (
    <div className="page">
      <TopBar back="#/review" title="Part 1 사진 묘사" />
      <div className="review-card">
        <p className="rc-label">토익 Part 1 듣기</p>
        <p className="rc-num">
          {ROUND}
          <small>문제</small>
        </p>
        <p className="small">사진 대신 장면 설명을 읽고, 네 문장 (A)~(D) 를 들은 뒤 장면에 맞는 것을 골라요. 문장은 답한 뒤에 보여요.</p>
        {!ttsSupported && <p className="warn small">이 기기는 음성이 안 나와요. 문장을 글로 보여 줄게요.</p>}
        <button type="button" className="btn primary block big" onClick={start}>
          시작 <ArrowRight size={19} />
        </button>
      </div>
      <section className="group">
        <p className="section-label">자주 나오는 함정</p>
        <div className="note small">
          <div>
            · wearing (입고 있음) ↔ putting on (입는 중)
            <br />· 사람이 없는 사진에 "is being -ed" 는 거의 오답, "has been -ed" (그렇게 되어 있음) 가 정답
          </div>
        </div>
      </section>
    </div>
  )
}

function Round({ items, onDone }: { items: Part1Item[]; onDone: (r: { right: number; total: number }) => void }) {
  useImmersive()
  const [pos, setPos] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [right, setRight] = useState(0)
  /** 지금 읽는 보기 (-1 = 안 읽음) */
  const [playing, setPlaying] = useState(-1)
  const q = items[pos]
  const answered = picked !== null
  const ok = picked === q.answer

  const play = () => speakSequence(q.options.map((o, i) => `${LETTERS[i]}. ${o.en}`), setPlaying)

  useEffect(() => {
    play()
    return () => stopSpeaking()
  }, [pos])

  function pick(i: number) {
    if (answered) return
    stopSpeaking()
    setPlaying(-1)
    setPicked(i)
    if (i === q.answer) {
      setRight(right + 1)
      sfx.right()
    } else sfx.wrong()
  }

  function next() {
    if (pos + 1 >= items.length) {
      sfx.done()
      markStudied()
      onDone({ right, total: items.length })
      return
    }
    setPos(pos + 1)
    setPicked(null)
  }

  return (
    <div className="game">
      <RunHead exitHref="#/part1" progress={(pos + (answered ? 1 : 0)) / items.length} count={`${pos + 1}/${items.length}`} />
      <div className="game-body" key={pos}>
        <p className="game-prompt">장면에 맞는 문장은?</p>
        <div className="p1-scene">
          <Camera size={20} />
          <span>{q.scene}</span>
        </div>
        <div className="choices p1-choices">
          {q.options.map((o, i) => {
            const cls = !answered ? '' : i === q.answer ? 'right' : i === picked ? 'wrong' : 'dim'
            return (
              <button key={i} type="button" className={`choice ${cls}`} onClick={() => pick(i)} disabled={answered && i !== q.answer && i !== picked}>
                <span className="choice-n">{LETTERS[i]}</span>
                {answered || !ttsSupported ? (
                  <span className="p1-text">
                    <span className="en-serif">{o.en}</span>
                    {answered && <span className="muted small">{o.ko}</span>}
                  </span>
                ) : playing === i ? (
                  <span className="p1-playing">
                    <Headphones size={16} /> 듣는 중…
                  </span>
                ) : (
                  <span className="muted">잘 듣고 골라요</span>
                )}
                {answered && i === q.answer && <Check className="mark" size={20} strokeWidth={2.6} />}
                {answered && i === picked && i !== q.answer && <X className="mark" size={20} strokeWidth={2.6} />}
              </button>
            )
          })}
        </div>
        {!answered && ttsSupported && (
          <button type="button" className="btn block" onClick={play}>
            <Volume2 size={18} /> {playing >= 0 ? '듣는 중…' : '다시 듣기'}
          </button>
        )}
      </div>
      {answered && (
        <div className={`feedback ${ok ? 'ok' : 'no'}`} role="status">
          <div className="fb-row">
            <span className="fb-stamp">{ok ? <Check size={20} strokeWidth={3} /> : <X size={20} strokeWidth={3} />}</span>
            <div className="fb-text">
              <b>{ok ? '맞았어요' : `정답은 (${LETTERS[q.answer]})`}</b>
              <span>{q.explain}</span>
            </div>
          </div>
          <p className="p1-words">
            {q.words.map((w) => (
              <span key={w} className="en-serif">
                {w}
              </span>
            ))}
          </p>
          <button type="button" className={`btn block big ${ok ? 'good' : 'primary'}`} onClick={next}>
            계속 <ArrowRight size={19} />
          </button>
        </div>
      )}
    </div>
  )
}
