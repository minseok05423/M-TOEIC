import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Ear, Lightbulb, Volume2 } from 'lucide-react'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading, Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Token } from '@astryxdesign/core/Token'
import { Icon } from '@astryxdesign/core/Icon'
import { Center } from '@astryxdesign/core/Center'
import type { StudyWord } from '../lib/words.ts'
import { getState, reviewWord } from '../lib/store.ts'
import { speak, ttsSupported } from '../lib/tts.ts'
import { sfx } from '../lib/sfx.ts'
import { distractors, shuffle } from '../lib/game.ts'
import { answer as ans, layout, motion, type as t } from '../ui/styles.ts'
import { RunHead, Screen } from './Screen.tsx'
import { Speak } from './Speak.tsx'
import { Meaning } from './Pos.tsx'
import { Choice, choiceState, Feedback } from './Choice.tsx'

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
  const ok = step.t === 'q' && picked !== null && step.choices[picked] === step.w

  return (
    <Screen
      header={
        <RunHead
          exitHref={exitHref}
          progress={progress}
          combo={combo}
          onNote={onNote && (() => onNote(step.t === 'match' ? undefined : `words:${step.w.key}`, step.t === 'q' && picked !== null && !ok))}
        />
      }
      footer={
        step.t === 'intro' ? (
          <Button label="기억했어요" variant="primary" size="lg" width="100%" endContent={<Icon icon={ArrowRight} />} onClick={next} />
        ) : step.t === 'q' && picked !== null ? (
          <WordFeedback w={step.w} ok={ok} onNext={next} />
        ) : null
      }
    >
      <VStack gap={5} key={pos} xstyle={motion.rise}>
        {step.t === 'intro' && <Intro w={step.w} />}
        {step.t === 'q' && <Question step={step} picked={picked} onPick={answer} />}
        {step.t === 'match' && <Match ws={step.ws} onDone={next} />}
      </VStack>
    </Screen>
  )
}

/** 큰 영어 단어 + 발음 */
export function BigWord({ en }: { en: string }) {
  return (
    <HStack gap={2} vAlign="center" hAlign="center" wrap="wrap">
      <Text type="inherit" xstyle={[t.enBig, t.center]}>
        {en}
      </Text>
      <Speak text={en} size="lg" />
    </HStack>
  )
}

function Intro({ w }: { w: StudyWord }) {
  return (
    <>
      <HStack>
        <Token color="blue" label="새 단어" />
      </HStack>
      <Card padding={6}>
        <VStack gap={4} hAlign="center">
          <Token label={w.group} size="sm" />
          <BigWord en={w.en} />
          <Text type="large" weight="semibold" justify="center" xstyle={[layout.highlight, t.keepAll]}>
            <Meaning ko={w.ko} pos={w.pos} />
          </Text>
          {w.ex && (
            <HStack gap={1} vAlign="start">
              <Speak text={w.ex.en} size="sm" />
              <VStack gap={0.5}>
                <Text type="body" xstyle={t.en}>
                  {w.ex.en}
                </Text>
                <Text type="supporting">{w.ex.ko}</Text>
              </VStack>
            </HStack>
          )}
          {w.tip && (
            <HStack gap={1} vAlign="center">
              <Icon icon={Lightbulb} size="sm" color="warning" />
              <Text type="supporting">{w.tip}</Text>
            </HStack>
          )}
        </VStack>
      </Card>
    </>
  )
}

function Question({ step, picked, onPick }: { step: Extract<Step, { t: 'q' }>; picked: number | null; onPick: (i: number) => void }) {
  const { w, kind, choices } = step
  const answered = picked !== null
  return (
    <>
      <HStack gap={2} vAlign="center">
        {step.retry && <Token color="orange" label="한 번 더" />}
        <Heading level={2}>{kind === 'en2ko' ? '이 단어의 뜻은?' : kind === 'ko2en' ? '영어로 하면?' : '들리는 단어를 고르세요'}</Heading>
      </HStack>
      <Center paddingBlock={4}>
        {kind === 'en2ko' && <BigWord en={w.en} />}
        {kind === 'ko2en' && (
          <Heading level={1} type="display-3" justify="center" xstyle={t.keepAll}>
            {w.ko}
          </Heading>
        )}
        {kind === 'listen' && (
          <VStack gap={2} hAlign="center">
            <Button label="다시 듣기" variant="secondary" size="lg" icon={<Icon icon={Volume2} size="lg" />} onClick={() => speak(w.en)} />
            <HStack gap={1} vAlign="center">
              <Icon icon={Ear} size="sm" color="secondary" />
              <Text type="supporting">잘 듣고 골라요</Text>
            </HStack>
          </VStack>
        )}
      </Center>
      <VStack gap={2}>
        {choices.map((c, i) => (
          <Choice key={c.key} mark={`${i + 1}`} label={kind === 'en2ko' ? c.ko : c.en} state={choiceState(answered, c === w, i === picked)} onPick={() => onPick(i)}>
            <Text type="large" weight="medium" xstyle={kind === 'en2ko' ? t.keepAll : t.en}>
              {kind === 'en2ko' ? c.ko : c.en}
            </Text>
          </Choice>
        ))}
      </VStack>
    </>
  )
}

/** 단어 문제 답한 뒤: 정답 · 예문 */
export function WordFeedback({ w, ok, skipped, onNext }: { w: StudyWord; ok: boolean; skipped?: boolean; onNext: () => void }) {
  return (
    <Feedback
      ok={ok}
      title={ok ? '맞았어요' : skipped ? '괜찮아요, 정답은' : '정답은'}
      onNext={onNext}
    >
      {!ok && (
        <VStack gap={1}>
          <HStack gap={2} vAlign="center" wrap="wrap">
            <Text type="large" weight="semibold" xstyle={t.en}>
              {w.en}
            </Text>
            <Speak text={w.en} size="sm" />
            <Meaning ko={w.ko} pos={w.pos} />
          </HStack>
          {w.ex && (
            <VStack gap={0.5}>
              <Text type="body" xstyle={t.en}>
                {w.ex.en}
              </Text>
              <Text type="supporting">{w.ex.ko}</Text>
            </VStack>
          )}
        </VStack>
      )}
    </Feedback>
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

  const tile = (w: StudyWord, side: 0 | 1) => {
    const done = (side ? doneR : doneL).has(w.key)
    const sel = (side ? r : l) === w
    const shake = bad?.[side] === w.key
    return (
      <Button
        key={w.key}
        label={side ? w.ko : w.en}
        variant="secondary"
        size="lg"
        width="100%"
        isDisabled={done}
        onClick={() => {
          if (!side) speak(w.en)
          if (side) setR(r === w ? null : w)
          else setL(l === w ? null : w)
        }}
        xstyle={[!side && t.en, sel && ans.selected, shake && [ans.wrong, motion.shake], done && ans.gone]}
      />
    )
  }

  return (
    <>
      <Heading level={2}>짝을 맞춰 보세요</Heading>
      <Grid columns={2} gap={2}>
        <VStack gap={2}>{left.map((w) => tile(w, 0))}</VStack>
        <VStack gap={2}>{right.map((w) => tile(w, 1))}</VStack>
      </Grid>
    </>
  )
}
