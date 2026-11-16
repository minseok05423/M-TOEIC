import { useEffect, useState } from 'react'
import { ArrowRight, Camera, Headphones, Volume2 } from 'lucide-react'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Heading, Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Icon } from '@astryxdesign/core/Icon'
import { Banner } from '@astryxdesign/core/Banner'
import { Token } from '@astryxdesign/core/Token'
import { PART1, type Part1Item } from '../content/part1.ts'
import { shuffle, stars } from '../lib/game.ts'
import { speakSequence, stopSpeaking, ttsSupported } from '../lib/tts.ts'
import { sfx } from '../lib/sfx.ts'
import { markStudied } from '../lib/store.ts'
import { AppBar, RunHead, Screen } from '../components/Screen.tsx'
import { Choice, choiceState, Feedback } from '../components/Choice.tsx'
import { GameDone } from '../components/GameDone.tsx'
import { motion, type as t } from '../ui/styles.ts'

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
      <Screen>
        <GameDone
          stars={stars(done.right, done.total)}
          title="Part 1 연습 끝!"
          line="틀린 문장은 단어장에서 동사를 한 번 더 봐요."
          stats={[{ label: '맞힘', value: `${done.right}/${done.total}` }]}
        >
          <Button label="한 판 더" variant="primary" size="lg" width="100%" onClick={start} />
          <Button label="복습으로" variant="secondary" size="lg" width="100%" href="#/review" />
        </GameDone>
      </Screen>
    )

  return (
    <Screen header={<AppBar back="#/review" title="Part 1 사진 묘사" />}>
      <VStack gap={6}>
        <Card padding={6}>
          <VStack gap={4}>
            <VStack gap={1}>
              <Text type="label" color="secondary">
                토익 Part 1 듣기
              </Text>
              <Heading level={2} type="display-1">
                {ROUND}문제
              </Heading>
            </VStack>
            <Text type="body" xstyle={t.keepAll}>
              사진 대신 장면 설명을 읽고, 네 문장 (A)~(D) 를 들은 뒤 장면에 맞는 것을 골라요. 문장은 답한 뒤에 보여요.
            </Text>
            {!ttsSupported && <Banner status="warning" title="이 기기는 음성이 안 나와요" description="문장을 글로 보여 줄게요." />}
            <Button label="시작" variant="primary" size="lg" width="100%" endContent={<Icon icon={ArrowRight} />} onClick={start} />
          </VStack>
        </Card>
        <VStack gap={1}>
          <Text type="label" color="secondary">
            자주 나오는 함정
          </Text>
          <Text type="supporting" xstyle={t.keepAll}>
            · wearing (입고 있음) ↔ putting on (입는 중)
          </Text>
          <Text type="supporting" xstyle={t.keepAll}>
            · 사람이 없는 사진에 "is being -ed" 는 거의 오답, "has been -ed" (그렇게 되어 있음) 가 정답
          </Text>
        </VStack>
      </VStack>
    </Screen>
  )
}

function Round({ items, onDone }: { items: Part1Item[]; onDone: (r: { right: number; total: number }) => void }) {
  const [pos, setPos] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [right, setRight] = useState(0)
  /** 지금 읽는 보기 (-1 = 안 읽음) */
  const [playing, setPlaying] = useState(-1)
  const q = items[pos]
  const answered = picked !== null

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
    <Screen
      header={<RunHead exitHref="#/part1" progress={(pos + (answered ? 1 : 0)) / items.length} count={`${pos + 1}/${items.length}`} />}
      footer={
        answered ? (
          <Feedback ok={picked === q.answer} title={picked === q.answer ? '맞았어요' : `정답은 (${LETTERS[q.answer]})`} onNext={next}>
            <Text type="inherit" xstyle={t.keepAll}>
              {q.explain}
            </Text>
          </Feedback>
        ) : (
          ttsSupported && (
            <Button label={playing >= 0 ? '듣는 중…' : '다시 듣기'} variant="secondary" size="lg" width="100%" icon={<Icon icon={Volume2} />} onClick={play} />
          )
        )
      }
    >
      <VStack gap={5} key={pos} xstyle={motion.rise}>
        <Heading level={2}>장면에 맞는 문장은?</Heading>
        <Card padding={5}>
          <HStack gap={3} vAlign="start">
            <Icon icon={Camera} color="secondary" />
            <Text type="large" weight="medium" xstyle={t.keepAll}>
              {q.scene}
            </Text>
          </HStack>
        </Card>
        <VStack gap={2}>
          {q.options.map((o, i) => (
            <Choice key={i} mark={`(${LETTERS[i]})`} label={`(${LETTERS[i]})`} state={choiceState(answered, i === q.answer, i === picked)} onPick={() => pick(i)}>
              {answered || !ttsSupported ? (
                <VStack gap={0.5}>
                  <Text type="body" weight="medium" xstyle={t.en}>
                    {o.en}
                  </Text>
                  {answered && <Text type="supporting">{o.ko}</Text>}
                </VStack>
              ) : playing === i ? (
                <HStack gap={2} vAlign="center">
                  <Icon icon={Headphones} color="accent" size="sm" />
                  <Text type="body" color="accent">
                    듣는 중…
                  </Text>
                </HStack>
              ) : (
                <Text type="body" color="secondary">
                  잘 듣고 골라요
                </Text>
              )}
            </Choice>
          ))}
        </VStack>
        {answered && (
          <HStack gap={1} wrap="wrap">
            {q.words.map((w) => (
              <Token key={w} size="sm" color="gray" label={w} />
            ))}
          </HStack>
        )}
      </VStack>
    </Screen>
  )
}
