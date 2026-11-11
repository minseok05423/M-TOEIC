import { useMemo, useState } from 'react'
import type { Question } from '../content/types.ts'
import { parseTap, tapPlain } from '../content/markup.ts'
import { Inline } from './RichText.tsx'
import { Speak } from './Speak.tsx'

function QText({ q, filled }: { q: string; filled?: string }) {
  const parts = q.split('____')
  return (
    <p className="q-text">
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && <span className={`blank ${filled ? 'filled' : ''}`}>{filled ?? ' '}</span>}
        </span>
      ))}
    </p>
  )
}

export function QuizRunner({
  questions,
  onFinish,
}: {
  questions: Question[]
  onFinish: (score: number, wrong: string[]) => void
}) {
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [wrong, setWrong] = useState<string[]>([])
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
      navigator.vibrate?.(80)
    }
  }

  function next() {
    if (idx + 1 >= questions.length) {
      onFinish(questions.length - wrong.length, wrong)
      return
    }
    setIdx(idx + 1)
    setPicked(null)
  }

  const cls = (i: number) => (!answered ? '' : i === correctIdx ? 'right' : i === picked ? 'wrong' : 'dim')

  return (
    <div className="quiz">
      <div className="progress-bar">
        <div style={{ width: `${(idx / questions.length) * 100}%` }} />
      </div>
      <p className="quiz-count">
        {idx + 1} / {questions.length}
      </p>

      <div className="card q-card">
        {q.type === 'mc' ? (
          <>
            <QText q={q.q} filled={answered ? q.choices[q.answer] : undefined} />
            <div className="choices">
              {q.choices.map((c, i) => (
                <button key={i} type="button" className={`choice ${cls(i)}`} onClick={() => pick(i)}>
                  <span className="choice-n">{'ABCDE'[i]}</span> {c}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="q-prompt">{q.prompt}</p>
            <div className="tap-words">
              {tap!.words.map((w, i) => (
                <button key={i} type="button" className={`tap-word ${cls(i)}`} onClick={() => pick(i)}>
                  {w}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {answered && (
        <div className={`feedback ${ok ? 'ok' : 'no'}`}>
          <p className="fb-title">{ok ? '✅ 정답!' : '❌ 아쉬워요'}</p>
          <p>
            <Inline text={q.explain} />
          </p>
          {q.ko && (
            <p className="ko">
              {q.type === 'mc' ? (
                <Speak text={q.q.split('\n')[0].replace('____', q.choices[q.answer])} />
              ) : (
                <Speak text={tapPlain(q.text)} />
              )}{' '}
              {q.ko}
            </p>
          )}
          <button type="button" className="btn primary block" onClick={next}>
            {idx + 1 >= questions.length ? '결과 보기' : '다음 →'}
          </button>
        </div>
      )}
    </div>
  )
}
