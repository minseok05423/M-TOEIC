import { useMemo, useState } from 'react'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Heading, Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import type { Question } from '../content/types.ts'
import { parseTap, tapPlain } from '../content/markup.ts'
import { scrollToTop } from '../lib/ui.ts'
import { sfx } from '../lib/sfx.ts'
import { answer as ans, layout, motion, type as t } from '../ui/styles.ts'
import { Inline } from './RichText.tsx'
import { RunHead, Screen } from './Screen.tsx'
import { Speak } from './Speak.tsx'
import { Choice, choiceState, Feedback } from './Choice.tsx'

function QText({ q, filled }: { q: string; filled?: string }) {
  const parts = q.split('____')
  return (
    <Heading level={2} xstyle={t.en}>
      {parts.map((p, i) => (
        <Text key={i} type="inherit">
          {p}
          {i < parts.length - 1 && (
            <Text type="inherit" xstyle={[layout.blank, !!filled && layout.blankFilled]}>
              {filled ?? ' '}
            </Text>
          )}
        </Text>
      ))}
    </Heading>
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
    scrollToTop()
  }

  const state = (i: number) => choiceState(answered, i === correctIdx, i === picked)
  const sentence = q.type === 'mc' ? q.q.split('\n')[0].replace('____', q.choices[q.answer]) : tapPlain(q.text)

  return (
    <Screen
      header={
        <RunHead
          exitHref={exitHref}
          progress={(idx + (answered ? 1 : 0)) / questions.length}
          combo={combo}
          count={`${idx + 1}/${questions.length}`}
          onNote={onNote && (() => onNote(`quiz:${q.id}`, answered && !ok))}
        />
      }
      footer={
        answered && (
          <Feedback
            ok={ok}
            title={ok ? (combo >= 3 ? `${combo}연속 정답!` : '맞았어요') : '아쉬워요'}
            nextLabel={idx + 1 >= questions.length ? '결과 보기' : '다음'}
            onNext={next}
            extra={
              !ok &&
              onNote && <Button label="왜 틀렸는지 모르겠다면 · 메모 남기기" variant="secondary" width="100%" onClick={() => onNote(`quiz:${q.id}`, true)} />
            }
          >
            <VStack gap={2}>
              <Text type="body" xstyle={t.keepAll}>
                <Inline text={q.explain} />
              </Text>
              {q.ko && (
                <HStack gap={1} vAlign="center">
                  <Speak text={sentence} size="sm" />
                  <Text type="supporting">{q.ko}</Text>
                </HStack>
              )}
            </VStack>
          </Feedback>
        )
      }
    >
      <VStack gap={5} key={q.id} xstyle={motion.rise}>
        {q.type === 'mc' ? (
          <>
            <QText q={q.q} filled={answered ? q.choices[q.answer] : undefined} />
            <VStack gap={2}>
              {q.choices.map((c, i) => (
                <Choice key={i} mark={'ABCDE'[i]} label={c} state={state(i)} onPick={() => pick(i)}>
                  <Text type="large" weight="medium" xstyle={t.en}>
                    {c}
                  </Text>
                </Choice>
              ))}
            </VStack>
          </>
        ) : (
          <>
            <Heading level={2} xstyle={t.keepAll}>
              {q.prompt}
            </Heading>
            <HStack gap={2} wrap="wrap">
              {tap!.words.map((w, i) => {
                const st = state(i)
                return (
                  <Button
                    key={i}
                    label={w}
                    variant="secondary"
                    size="lg"
                    onClick={() => pick(i)}
                    xstyle={[t.en, st === 'right' && ans.right, st === 'wrong' && [ans.wrong, motion.shake], st === 'dim' && ans.dim]}
                  />
                )
              })}
            </HStack>
          </>
        )}
      </VStack>
    </Screen>
  )
}
