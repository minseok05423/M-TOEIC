import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CircleHelp, ClipboardPaste, Plus } from 'lucide-react'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Center } from '@astryxdesign/core/Center'
import { Heading, Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Icon } from '@astryxdesign/core/Icon'
import { Token } from '@astryxdesign/core/Token'
import { Badge } from '@astryxdesign/core/Badge'
import { Banner } from '@astryxdesign/core/Banner'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { List, ListItem } from '@astryxdesign/core/List'
import { Collapsible } from '@astryxdesign/core/Collapsible'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { newId, reviewWord, saveTest, useStore, type WordTest as Test, type WordTestItem } from '../lib/store.ts'
import { allWords, lessonWordList, type StudyWord } from '../lib/words.ts'
import { planTest, WHY_LABEL, type PlannedItem, type Why } from '../lib/wordtest.ts'
import { distractors, shuffle, stars } from '../lib/game.ts'
import { formatDate, today } from '../lib/date.ts'
import { href } from '../lib/router.ts'
import { speak } from '../lib/tts.ts'
import { sfx } from '../lib/sfx.ts'
import { AppBar, RunHead, Screen } from '../components/Screen.tsx'
import { GameDone } from '../components/GameDone.tsx'
import { WordRow } from '../components/WordRow.tsx'
import { PosTag } from '../components/Pos.tsx'
import { Choice, choiceState } from '../components/Choice.tsx'
import { BigWord, WordFeedback } from '../components/WordGame.tsx'
import { motion, type as t } from '../ui/styles.ts'

const partScore = (x: Test, part: WordTestItem['part']) => {
  const xs = x.items.filter((i) => i.part === part)
  return `${xs.filter((i) => i.ok).length}/${xs.length}`
}

export function WordTest() {
  const words = useStore((s) => s.words)
  const srs = useStore((s) => s.progress.srs)
  const tests = useStore((s) => s.tests)
  const userChapters = useStore((s) => s.userChapters)
  const plan = useMemo(() => planTest(words, srs, tests, lessonWordList()), [words, srs, tests, userChapters])
  const pool = useMemo(() => [...allWords(words).values()], [words, userChapters])
  const history = useMemo(() => Object.values(tests).sort((a, b) => b.finishedAt - a.finishedAt), [tests])
  const [run, setRun] = useState<{ items: PlannedItem[]; n: number } | null>(null)
  const [result, setResult] = useState<Test | null>(null)

  if (run && !result)
    return (
      <TestRun
        key={run.n}
        items={run.items}
        pool={pool}
        onDone={(x) => {
          saveTest(x)
          setResult(x)
        }}
      />
    )

  if (result) {
    const wrong = result.items.filter((x) => !x.ok)
    return (
      <Screen>
        <VStack gap={6}>
          <GameDone
            stars={stars(result.score, result.total)}
            title="단어 테스트 끝!"
            line={`${result.total}문제 중 ${result.score}개 맞혔어요. ${wrong.length ? '틀린 단어는 다음 테스트에 다시 나와요.' : '완벽해요!'}`}
            stats={[
              { label: '새 단어', value: partScore(result, 'new') },
              { label: '복습', value: partScore(result, 'review') },
            ]}
          >
            <Button label="홈으로" variant="primary" size="lg" width="100%" href="#/" />
            <Button label="테스트 기록 보기" variant="secondary" size="lg" width="100%" onClick={() => (setRun(null), setResult(null))} />
          </GameDone>
          {wrong.length > 0 && (
            <List edge="outset" hasDividers header={<Heading level={3}>다시 볼 단어 · {wrong.length}</Heading>}>
              {wrong.map((x) => (
                <WordRow key={x.key} en={x.en} ko={x.ko} pos={x.pos} level={x.skip ? '모르겠어요' : '틀림'} />
              ))}
            </List>
          )}
        </VStack>
      </Screen>
    )
  }

  const todays = history.filter((x) => x.day === today())
  const notToday = plan.latestDay !== today()
  const reasons = (Object.keys(plan.why) as Why[]).filter((k) => plan.why[k])

  return (
    <Screen header={<AppBar back="#/" title="단어 테스트" />}>
      <VStack gap={6}>
        {plan.items.length ? (
          <Card padding={6}>
            <VStack gap={4}>
              <VStack gap={1}>
                <Text type="label" color="secondary">
                  {todays.length ? `오늘 ${todays.length}번 봤어요 · 한 번 더?` : '오늘의 단어 테스트'}
                </Text>
                <Heading level={2} type="display-1">
                  {plan.items.length}문제
                </Heading>
              </VStack>
              <MetadataList columns="single" label={{ position: 'start', width: 88 }}>
                {plan.newCount > 0 && (
                  <MetadataListItem label={`새 단어 ${plan.newCount}`}>
                    <Text type="body" xstyle={t.keepAll}>
                      {plan.latestDay && `${formatDate(plan.latestDay)}에 넣은 단어${plan.latestCount < plan.newCount ? ` ${plan.latestCount}개` : ''}`}
                      {plan.latestCount < plan.newCount && ` + 아직 시험 안 본 단어 ${plan.newCount - plan.latestCount}개`}
                    </Text>
                  </MetadataListItem>
                )}
                {plan.reviewCount > 0 && (
                  <MetadataListItem label={`복습 ${plan.reviewCount}`}>
                    <Text type="body" xstyle={t.keepAll}>
                      {reasons.map((k) => `${WHY_LABEL[k]} ${plan.why[k]}`).join(' · ')}
                    </Text>
                  </MetadataListItem>
                )}
              </MetadataList>
              {notToday && plan.newCount > 0 && (
                <Banner
                  status="warning"
                  title="오늘 외운 단어를 아직 안 넣었어요"
                  description="먼저 넣으면 오늘 단어로 시험 봐요."
                  endContent={
                    <HStack gap={1} wrap="wrap">
                      <Button label="여러 개 붙여넣기" size="sm" variant="secondary" icon={<Icon icon={ClipboardPaste} />} href={href('words', 'bulk')} />
                      <Button label="하나씩" size="sm" variant="secondary" icon={<Icon icon={Plus} />} href={href('words', 'new')} />
                    </HStack>
                  }
                />
              )}
              <Button
                label="시작"
                variant="primary"
                size="lg"
                width="100%"
                endContent={<Icon icon={ArrowRight} />}
                onClick={() => setRun({ items: shuffle(plan.items), n: (run?.n ?? 0) + 1 })}
              />
              <Text type="supporting">뜻을 고르는 4지선다예요. 모르면 찍지 말고 "모르겠어요"를 눌러요.</Text>
            </VStack>
          </Card>
        ) : (
          <EmptyState
            title="아직 시험 볼 단어가 없어요"
            description="오늘 외운 단어를 단어장에 넣으면 여기서 시험 봐요."
            actions={<Button label="단어 넣기" variant="primary" icon={<Icon icon={ClipboardPaste} />} href={href('words', 'bulk')} />}
          />
        )}

        {history.length > 0 && (
          <List edge="outset" hasDividers header={<Heading level={3}>지난 테스트</Heading>}>
            {history.slice(0, 14).map((x) => {
              const wrong = x.items.filter((i) => !i.ok)
              const row = (
                <HStack gap={3} vAlign="center">
                  <Text type="body">{formatDate(x.day)}</Text>
                  <Text type="body" weight="bold" hasTabularNumbers color={x.score === x.total ? 'accent' : 'primary'}>
                    {x.score}/{x.total}
                  </Text>
                  {wrong.length ? <Badge variant="warning" label={`틀림 ${wrong.length}`} /> : <Token size="sm" color="green" label="만점" />}
                </HStack>
              )
              return (
                <ListItem
                  key={x.id}
                  label={
                    wrong.length ? (
                      <Collapsible trigger={row}>
                        <VStack gap={1}>
                          {wrong.map((i) => (
                            <Text key={i.key} type="supporting">
                              <Text type="inherit" weight="semibold" xstyle={t.en}>
                                {i.en}
                              </Text>{' '}
                              {i.ko}
                            </Text>
                          ))}
                        </VStack>
                      </Collapsible>
                    ) : (
                      row
                    )
                  }
                />
              )
            })}
          </List>
        )}
      </VStack>
    </Screen>
  )
}

type Q = PlannedItem & { choices: StudyWord[] }

/** 한 단어에 한 번씩, 다시 풀기 없음. 답할 때마다 복습 기록(SRS)에도 반영 */
function TestRun({ items, pool, onDone }: { items: PlannedItem[]; pool: StudyWord[]; onDone: (x: Test) => void }) {
  const [qs] = useState<Q[]>(() => items.map((it) => ({ ...it, choices: shuffle([it.w, ...distractors(it.w, pool)]) })))
  const [pos, setPos] = useState(0)
  /** 고른 보기 번호, -1 = 모르겠어요 */
  const [picked, setPicked] = useState<number | null>(null)
  const results = useRef<WordTestItem[]>([])
  const startedAt = useRef(Date.now())
  const advanced = useRef(-1)
  const q = qs[pos]
  const ok = picked !== null && picked >= 0 && q.choices[picked] === q.w

  function answer(i: number) {
    if (picked !== null) return
    setPicked(i)
    const right = i >= 0 && q.choices[i] === q.w
    results.current.push({ key: q.w.key, en: q.w.en, ko: q.w.ko, pos: q.w.pos, part: q.part, why: q.why, ok: right, skip: i < 0 || undefined })
    reviewWord(q.w.key, right)
    if (right) {
      sfx.right()
      speak(q.w.en)
    } else sfx.wrong()
  }

  function next() {
    if (advanced.current === pos) return
    advanced.current = pos
    if (pos + 1 >= qs.length) {
      sfx.done()
      const r = results.current
      onDone({ id: newId(), day: today(), startedAt: startedAt.current, finishedAt: Date.now(), items: r, score: r.filter((x) => x.ok).length, total: r.length })
      return
    }
    setPos(pos + 1)
    setPicked(null)
  }

  useEffect(() => {
    if (!ok) return
    const tm = setTimeout(next, 800)
    return () => clearTimeout(tm)
  })

  const answered = picked !== null
  return (
    <Screen
      header={<RunHead exitHref="#/" progress={(pos + (answered ? 1 : 0)) / qs.length} count={`${pos + 1}/${qs.length}`} />}
      footer={
        answered ? (
          <WordFeedback w={q.w} ok={ok} skipped={picked! < 0} onNext={next} />
        ) : (
          <Button label="모르겠어요" variant="secondary" size="lg" width="100%" icon={<Icon icon={CircleHelp} />} onClick={() => answer(-1)} />
        )
      }
    >
      <VStack gap={5} key={pos} xstyle={motion.rise}>
        <HStack gap={2} vAlign="center">
          {q.part === 'review' && <Token color="orange" label="복습" />}
          <Heading level={2}>이 단어의 뜻은?</Heading>
        </HStack>
        <Center paddingBlock={4}>
          <VStack gap={2} hAlign="center">
            <BigWord en={q.w.en} />
            <PosTag pos={q.w.pos} />
          </VStack>
        </Center>
        <VStack gap={2}>
          {q.choices.map((c, i) => (
            <Choice key={c.key} mark={`${i + 1}`} label={c.ko} state={choiceState(answered, c === q.w, i === picked)} onPick={() => answer(i)}>
              <Text type="large" weight="medium" xstyle={t.keepAll}>
                {c.ko}
              </Text>
            </Choice>
          ))}
        </VStack>
      </VStack>
    </Screen>
  )
}
