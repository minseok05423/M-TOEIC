import { useMemo, useState } from 'react'
import { ArrowRight, Check, X } from 'lucide-react'
import type { Question } from '../content/types.ts'
import { parseTap, tapPlain } from '../content/markup.ts'
import { useImmersive } from '../lib/ui.ts'
import { sfx } from '../lib/sfx.ts'
import { Inline } from './RichText.tsx'
import { RunHead } from './RunHead.tsx'
import { Speak } from './Speak.tsx'

function QText({ q, filled }: { q: string; filled?: string }) {
  const parts = q.split('____')
  return (
    <p className="q-text en-serif">
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && <span className={`blank ${filled ? 'filled' : ''}`}>{filled ?? ' '}</span>}
        </span>
      ))}
    </p>
  )
}

export function QuizRunner({
  questions,
  exitHref,
  onFinish,
  onNote,
}: {
  questions: Question[]
  exitHref: string
  onFinish: (score: number, wrong: string[], bestCombo: number) => void
  /** 지금 문제의 메모 대상 id. 틀린 뒤라면 '헷갈리는 점' 으로 */
  onNote?: (targetId: string, confusing: boolean) => void
}) {
  useImmersive()
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [wrong, setWrong] = useState<string[]>([])
  const [combo, setCombo] = useState(0)
  const [best, setBest] = useState(0)
  const q = questions[idx]
  const tap = useMemo(() => (q.type === 'tap' ? parseTap(q.text) : null), [q])

  const correctIdx = q.type === 'mc' ? q.answer : (tap?.answer ?? -1)
  const answered = picked !== null
  const ok = picked === correctIdx

  function pick(i: number) {
    if (answered) return
    setPicked(i)
    if (i !== correctIdx) {
      setWrong((w) => [...w, q.id])
      setCombo(0)
      sfx.wrong()
    } else {
      const c = combo + 1
      setCombo(c)
      setBest(Math.max(best, c))
      if (c >= 3 && c % 3 === 0) sfx.combo(c)
      else sfx.right()
    }
  }

  function next() {
    if (idx + 1 >= questions.length) {
      onFinish(questions.length - wrong.length, wrong, best)
      return
    }
    setIdx(idx + 1)
    setPicked(null)
    window.scrollTo(0, 0)
  }

  const cls = (i: number) => (!answered ? '' : i === correctIdx ? 'right' : i === picked ? 'wrong' : 'dim')
  const mark = (i: number) =>
    !answered ? null : i === correctIdx ? <Check className="mark" size={20} strokeWidth={2.6} /> : i === picked ? <X className="mark" size={20} strokeWidth={2.6} /> : null

  return (
    <div className={`quiz ${answered ? 'answered' : ''}`}>
      <RunHead
        exitHref={exitHref}
        progress={(idx + (answered ? 1 : 0)) / questions.length}
        combo={combo}
        count={`${idx + 1}/${questions.length}`}
        onNote={onNote && (() => onNote(`quiz:${q.id}`, answered && !ok))}
      />

      <div className="q-card" key={q.id}>
        {q.type === 'mc' ? (
          <>
            <QText q={q.q} filled={answered ? q.choices[q.answer] : undefined} />
            <div className="choices">
              {q.choices.map((c, i) => (
                <button key={i} type="button" className={`choice ${cls(i)}`} onClick={() => pick(i)}>
                  <span className="choice-n">{'ABCDE'[i]}</span>
                  <span className="en-serif">{c}</span>
                  {mark(i)}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="q-prompt">{q.prompt}</p>
            <div className="tap-words">
              {tap!.words.map((w, i) => (
                <button key={i} type="button" className={`tap-word en-serif ${cls(i)}`} onClick={() => pick(i)}>
                  {w}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {answered && (
        <div className={`feedback ${ok ? 'ok' : 'no'}`} role="status">
          <div className="fb-row">
            <span className="fb-stamp">{ok ? <Check size={20} strokeWidth={3} /> : <X size={20} strokeWidth={3} />}</span>
            <div className="fb-text">
              <b>{ok ? (combo >= 3 ? `${combo}연속 정답!` : '맞았어요') : '아쉬워요'}</b>
            </div>
          </div>
          <p className="fb-explain">
            <Inline text={q.explain} />
          </p>
          {q.ko && (
            <div className="fb-ko">
              {q.type === 'mc' ? (
                <Speak text={q.q.split('\n')[0].replace('____', q.choices[q.answer])} />
              ) : (
                <Speak text={tapPlain(q.text)} />
              )}
              <span>{q.ko}</span>
            </div>
          )}
          {!ok && onNote && (
            <button type="button" className="btn tonal block" onClick={() => onNote(`quiz:${q.id}`, true)}>
              왜 틀렸는지 모르겠다면 · 메모 남기기
            </button>
          )}
          <button type="button" className={`btn block big ${ok ? 'good' : 'primary'}`} onClick={next}>
            {idx + 1 >= questions.length ? '결과 보기' : '다음'}
            <ArrowRight size={19} />
          </button>
        </div>
      )}
    </div>
  )
}
