import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, Ear, Lightbulb, Volume2, X } from 'lucide-react'
import type { StudyWord } from '../lib/words.ts'
import { getState, reviewWord } from '../lib/store.ts'
import { speak, ttsSupported } from '../lib/tts.ts'
import { sfx } from '../lib/sfx.ts'
import { distractors, shuffle } from '../lib/game.ts'
import { useImmersive } from '../lib/ui.ts'
import { RunHead } from './RunHead.tsx'
import { Speak } from './Speak.tsx'
import { Meaning } from './Pos.tsx'

type Kind = 'en2ko' | 'ko2en' | 'listen'
type Step =
  | { t: 'intro'; w: StudyWord; batch: number }
  | { t: 'q'; w: StudyWord; kind: Kind; choices: StudyWord[]; batch: number; retry?: boolean }
  | { t: 'match'; ws: StudyWord[]; batch: number }

export interface GameResult {
  right: number
  wrong: number
  bestCombo: number
  total: number
}

const BATCH = 5

function question(w: StudyWord, kind: Kind, pool: readonly StudyWord[], batch: number, retry?: boolean): Step {
  return { t: 'q', w, kind, batch, retry, choices: shuffle([w, ...distractors(w, pool)]) }
}

function kinds(): Kind[] {
  return ttsSupported ? ['en2ko', 'ko2en', 'listen'] : ['en2ko', 'ko2en']
}

function build(words: StudyWord[], pool: readonly StudyWord[], isNew: (w: StudyWord) => boolean): Step[] {
  const steps: Step[] = []
  for (let b = 0; b * BATCH < words.length; b++) {
    const batch = words.slice(b * BATCH, b * BATCH + BATCH)
    for (const w of batch) if (isNew(w)) steps.push({ t: 'intro', w, batch: b })
    const ks = kinds()
    shuffle(batch).forEach((w, i) => {
      // 방금 처음 본 단어는 제일 쉬운 "뜻 고르기"부터
      const kind = isNew(w) ? 'en2ko' : ks[(i + b) % ks.length]
      steps.push(question(w, kind, pool, b))
    })
    if (batch.length >= 3) steps.push({ t: 'match', ws: batch, batch: b })
  }
  return steps
}

/**
 * 단어 게임. 새 단어는 소개 카드 → 문제, 아는 단어는 바로 문제.
 * 5개마다 짝 맞추기. 처음 푼 결과만 복습 기록(SRS)에 반영하고, 틀린 단어는 같은 판 안에서 한 번 더 나와요.
 */
export function WordGame({
  words,
  pool,
  isNew,
  exitHref,
  onDone,
  onNote,
}: {
  words: StudyWord[]
  pool: readonly StudyWord[]
  isNew: (w: StudyWord) => boolean
  exitHref: string
  onDone: (r: GameResult) => void
  /** 지금 단어의 메모 대상 id ('words:<key>', 짝 맞추기 중이면 undefined). 틀린 뒤면 confusing */
  onNote?: (targetId: string | undefined, confusing: boolean) => void
}) {
  useImmersive()
  const [steps, setSteps] = useState(() => build(words, pool, isNew))
  const [pos, setPos] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [combo, setCombo] = useState(0)
  const stats = useRef({ right: 0, wrong: 0, bestCombo: 0, seen: new Set<string>() })
  /** 자동 넘김과 "계속" 버튼이 겹쳐도 한 번만 넘어가도록 */
  const advanced = useRef(-1)
  const step = steps[pos]

  useEffect(() => {
    if (!step) return
    if (step.t === 'intro' && getState().settings.autoSpeak) speak(step.w.en)
    if (step.t === 'q' && step.kind === 'listen') speak(step.w.en)
  }, [step])

  function next() {
    if (advanced.current === pos) return
    advanced.current = pos
    if (pos + 1 >= steps.length) {
      sfx.done()
      const s = stats.current
      onDone({ right: s.right, wrong: s.wrong, bestCombo: s.bestCombo, total: s.seen.size })
      return
    }
    setPos(pos + 1)
    setPicked(null)
  }

  // 정답이면 잠깐 보여 주고 자동으로 넘어가기
  useEffect(() => {
    if (picked === null || step?.t !== 'q' || step.choices[picked] !== step.w) return
    const t = setTimeout(next, 900)
    return () => clearTimeout(t)
  })

  function answer(i: number) {
    if (picked !== null || step?.t !== 'q') return
    setPicked(i)
    const ok = step.choices[i] === step.w
    const s = stats.current
    if (!step.retry && !s.seen.has(step.w.key)) {
      s.seen.add(step.w.key)
      reviewWord(step.w.key, ok)
      if (ok) s.right++
      else s.wrong++
    }
    if (ok) {
      const c = combo + 1
      setCombo(c)
      s.bestCombo = Math.max(s.bestCombo, c)
      if (c >= 3 && c % 3 === 0) sfx.combo(c)
      else sfx.right()
      if (step.kind !== 'listen') speak(step.w.en)
    } else {
      setCombo(0)
      sfx.wrong()
      // 같은 판이 끝나기 전에 다른 방식으로 한 번 더
      const ks = kinds().filter((k) => k !== step.kind)
      const retry = question(step.w, ks[Math.floor(Math.random() * ks.length)], pool, step.batch, true)
      let j = pos + 1
      while (j < steps.length && steps[j].batch === step.batch && steps[j].t === 'q') j++
      setSteps([...steps.slice(0, j), retry, ...steps.slice(j)])
    }
  }

  if (!step) return null
  const progress = (pos + (picked !== null ? 1 : 0)) / steps.length

  return (
    <div className="game">
      <RunHead
        exitHref={exitHref}
        progress={progress}
        combo={combo}
        onNote={
          onNote &&
          (() => onNote(step.t === 'match' ? undefined : `words:${step.w.key}`, step.t === 'q' && picked !== null && step.choices[picked] !== step.w))
        }
      />
      <div className="game-body" key={pos}>
        {step.t === 'intro' && <Intro w={step.w} onNext={next} />}
        {step.t === 'q' && <Question step={step} picked={picked} onPick={answer} />}
        {step.t === 'match' && <Match ws={step.ws} onDone={next} />}
      </div>
      {step.t === 'q' && picked !== null && <Feedback step={step} ok={step.choices[picked] === step.w} onNext={next} />}
    </div>
  )
}

function Intro({ w, onNext }: { w: StudyWord; onNext: () => void }) {
  return (
    <>
      <p className="game-prompt">
        <span className="tag-new">새 단어</span>
      </p>
      <div className="intro-card">
        <span className="ic-group">{w.group}</span>
        <div className="ic-word">
          <span className="en-serif">{w.en}</span>
          <Speak text={w.en} />
        </div>
        <p className="ic-ko">
          <mark>
            <Meaning ko={w.ko} pos={w.pos} />
          </mark>
        </p>
        {w.ex && (
          <div className="ic-ex">
            <Speak text={w.ex.en} />
            <p>
              <span className="en-serif">{w.ex.en}</span>
              <span className="muted">{w.ex.ko}</span>
            </p>
          </div>
        )}
        {w.tip && (
          <p className="ic-tip">
            <Lightbulb size={15} /> {w.tip}
          </p>
        )}
      </div>
      <div className="game-foot">
        <button type="button" className="btn primary block big" onClick={onNext}>
          기억했어요 <ArrowRight size={19} />
        </button>
      </div>
    </>
  )
}

function Question({ step, picked, onPick }: { step: Extract<Step, { t: 'q' }>; picked: number | null; onPick: (i: number) => void }) {
  const { w, kind, choices } = step
  const answered = picked !== null
  return (
    <>
      <p className="game-prompt">
        {step.retry && <span className="tag-retry">한 번 더</span>}
        {kind === 'en2ko' ? '이 단어의 뜻은?' : kind === 'ko2en' ? '영어로 하면?' : '들리는 단어를 고르세요'}
      </p>
      <div className="q-stage">
        {kind === 'en2ko' && (
          <div className="q-word">
            <span className="en-serif">{w.en}</span>
            <Speak text={w.en} />
          </div>
        )}
        {kind === 'ko2en' && <div className="q-word ko">{w.ko}</div>}
        {kind === 'listen' && (
          <button type="button" className="listen-btn" onClick={() => speak(w.en)} aria-label="다시 듣기">
            <Volume2 size={40} strokeWidth={1.8} />
            <span>
              <Ear size={14} /> 한 번 더 듣기
            </span>
          </button>
        )}
      </div>
      <div className={`choices ${kind === 'en2ko' ? 'ko' : 'en'}`}>
        {choices.map((c, i) => {
          const cls = !answered ? '' : c === w ? 'right' : i === picked ? 'wrong' : 'dim'
          return (
            <button key={c.key} type="button" className={`choice ${cls}`} onClick={() => onPick(i)} disabled={answered && c !== w && i !== picked}>
              <span className="choice-n">{i + 1}</span>
              <span className={kind === 'en2ko' ? '' : 'en-serif'}>{kind === 'en2ko' ? c.ko : c.en}</span>
              {answered && c === w && <Check className="mark" size={20} strokeWidth={2.6} />}
              {answered && i === picked && c !== w && <X className="mark" size={20} strokeWidth={2.6} />}
            </button>
          )
        })}
      </div>
    </>
  )
}

function Feedback({ step, ok, onNext }: { step: Extract<Step, { t: 'q' }>; ok: boolean; onNext: () => void }) {
  const { w } = step
  return (
    <div className={`feedback ${ok ? 'ok' : 'no'}`} role="status">
      <div className="fb-row">
        <span className="fb-stamp">{ok ? <Check size={20} strokeWidth={3} /> : <X size={20} strokeWidth={3} />}</span>
        <div className="fb-text">
          <b>{ok ? '맞았어요' : '정답은'}</b>
          {!ok && (
            <span>
              <span className="en-serif">{w.en}</span> = <Meaning ko={w.ko} pos={w.pos} />
            </span>
          )}
        </div>
        {!ok && <Speak text={w.en} />}
      </div>
      {!ok && w.ex && (
        <p className="fb-ex">
          <span className="en-serif">{w.ex.en}</span>
          <span>{w.ex.ko}</span>
        </p>
      )}
      <button type="button" className={`btn block big ${ok ? 'good' : 'primary'}`} onClick={onNext}>
        계속 <ArrowRight size={19} />
      </button>
    </div>
  )
}

/** 짝 맞추기: 왼쪽 영어, 오른쪽 뜻. 뜻이 같은 단어끼리는 어느 쪽을 골라도 정답 */
function Match({ ws, onDone }: { ws: StudyWord[]; onDone: () => void }) {
  const left = useMemo(() => shuffle(ws), [ws])
  const right = useMemo(() => shuffle(ws), [ws])
  const [l, setL] = useState<StudyWord | null>(null)
  const [r, setR] = useState<StudyWord | null>(null)
  const [doneL, setDoneL] = useState<Set<string>>(new Set())
  const [doneR, setDoneR] = useState<Set<string>>(new Set())
  const [bad, setBad] = useState<[string, string] | null>(null)

  useEffect(() => {
    if (!l || !r) return
    if (l.ko.trim() === r.ko.trim()) {
      sfx.pop()
      const dl = new Set(doneL).add(l.key)
      setDoneL(dl)
      setDoneR(new Set(doneR).add(r.key))
      if (dl.size === ws.length) setTimeout(onDone, 450)
    } else {
      sfx.wrong()
      setBad([l.key, r.key])
      setTimeout(() => setBad(null), 450)
    }
    setL(null)
    setR(null)
  }, [l, r])

  const cls = (w: StudyWord, side: 0 | 1) =>
    (side ? doneR : doneL).has(w.key) ? 'gone' : (side ? r : l) === w ? 'sel' : bad?.[side] === w.key ? 'shake' : ''

  return (
    <>
      <p className="game-prompt">짝을 맞춰 보세요</p>
      <div className="match">
        <div className="match-col">
          {left.map((w) => (
            <button
              key={w.key}
              type="button"
              className={`tile en-serif ${cls(w, 0)}`}
              disabled={doneL.has(w.key)}
              onClick={() => {
                speak(w.en)
                setL(l === w ? null : w)
              }}
            >
              {w.en}
            </button>
          ))}
        </div>
        <div className="match-col">
          {right.map((w) => (
            <button key={w.key} type="button" className={`tile ${cls(w, 1)}`} disabled={doneR.has(w.key)} onClick={() => setR(r === w ? null : w)}>
              {w.ko}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
