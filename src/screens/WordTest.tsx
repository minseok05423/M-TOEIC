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
import { TextInput } from '@astryxdesign/core/TextInput'
import { newId, reviewWord, saveTest, useStore, type WordTest as Test, type WordTestItem } from '../lib/store.ts'
import { allWords, lessonWordList, type StudyWord } from '../lib/words.ts'
import { planTest, typingKeys, WHY_LABEL, type PlannedItem, type Why } from '../lib/wordtest.ts'
import { checkTyped, distractorPicker, oneSense, shuffle, stars } from '../lib/game.ts'
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
  const typing = useMemo(() => typingKeys(tests), [tests])
  const history = useMemo(() => Object.values(tests).sort((a, b) => b.finishedAt - a.finishedAt), [tests])
  const [run, setRun] = useState<{ items: PlannedItem[]; n: number } | null>(null)
  const [result, setResult] = useState<Test | null>(null)

  if (run && !result)
    return (
      <TestRun
        key={run.n}
        items={run.items}
        pool={pool}
        typing={typing}
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
              <Text type="supporting" xstyle={t.keepAll}>
                뜻을 고르는 4지선다예요. 모르면 찍지 말고 "모르겠어요"를 눌러요.
                {plan.items.some((x) => typing.has(x.w.key)) && ` 두 번 이상 틀린 단어 ${plan.items.filter((x) => typing.has(x.w.key)).length}개는 영어로 직접 써요.`}
              </Text>
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

/** shown = 이 문제에서 묻는 뜻 (뜻이 여럿이면 하나, lib/game.ts oneSense). type = 영어로 직접 쓰기 */
type Q = PlannedItem & { shown: StudyWord; choices: StudyWord[]; type: boolean }

/** 답한 결과. pick = 고른 보기 번호, typed = 쓴 답, typo = 한 글자만 틀려서 정답으로 친 것 */
type Answer = { ok: boolean; skip?: boolean; pick?: number; typed?: string; typo?: boolean }

/** 한 단어에 한 번씩, 다시 풀기 없음. 답할 때마다 복습 기록(SRS)에도 반영 */
function TestRun({ items, pool, typing, onDone }: { items: PlannedItem[]; pool: StudyWord[]; typing: Set<string>; onDone: (x: Test) => void }) {
  const [qs] = useState<Q[]>(() => {
    // 오답 보기는 테스트 전체에서 고르게 돌려 써요 (lib/game.ts)
    const pick = distractorPicker(pool, items.map((it) => it.w))
    return items.map((it) => {
      const shown = oneSense(it.w)
      const type = typing.has(it.w.key)
      return { ...it, shown, type, choices: type ? [] : shuffle([shown, ...pick(shown)]) }
    })
  })
  const [pos, setPos] = useState(0)
  const [res, setRes] = useState<Answer | null>(null)
  const [text, setText] = useState('')
  const results = useRef<WordTestItem[]>([])
  const startedAt = useRef(Date.now())
  const advanced = useRef(-1)
  const q = qs[pos]

  function finish(a: Answer) {
    if (res) return
    setRes(a)
    results.current.push({ key: q.w.key, en: q.w.en, ko: q.w.ko, pos: q.w.pos, part: q.part, why: q.why, ok: a.ok, skip: a.skip || undefined })
    reviewWord(q.w.key, a.ok)
    if (a.ok) {
      sfx.right()
      speak(q.w.en)
    } else sfx.wrong()
  }

  const pickAnswer = (i: number) => finish({ ok: q.choices[i] === q.shown, pick: i })
  const skip = () => finish({ ok: false, skip: true })
  function submitTyped(e?: React.FormEvent) {
    e?.preventDefault()
    if (!text.trim()) return
    const v = checkTyped(text, q.w.en)
    finish({ ok: !!v, typed: text.trim(), typo: v === 'typo' })
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
    setRes(null)
    setText('')
  }

  // 정답이면 잠깐 보여 주고 넘어가기 (철자를 봐야 하는 typo 는 직접 넘기기)
  useEffect(() => {
    if (!res?.ok || res.typo) return
    const tm = setTimeout(next, 800)
    return () => clearTimeout(tm)
  })

  return (
    <Screen
      header={<RunHead exitHref="#/" progress={(pos + (res ? 1 : 0)) / qs.length} count={`${pos + 1}/${qs.length}`} />}
      footer={
        res ? (
          <WordFeedback w={q.w} ok={res.ok} skipped={res.skip} onNext={next} />
        ) : q.type ? (
          <VStack gap={2}>
            <Button label="확인" variant="primary" size="lg" width="100%" isDisabled={!text.trim()} onClick={() => submitTyped()} />
            <Button label="모르겠어요" variant="secondary" size="lg" width="100%" icon={<Icon icon={CircleHelp} />} onClick={skip} />
          </VStack>
        ) : (
          <Button label="모르겠어요" variant="secondary" size="lg" width="100%" icon={<Icon icon={CircleHelp} />} onClick={skip} />
        )
      }
    >
      <VStack gap={5} key={pos} xstyle={motion.rise}>
        <HStack gap={2} vAlign="center" wrap="wrap">
          {q.part === 'review' && <Token color="orange" label="복습" />}
          {q.type && <Token color="purple" label="직접 쓰기" />}
          <Heading level={2}>{q.type ? '영어로 써 보세요' : '이 단어의 뜻은?'}</Heading>
        </HStack>
        {q.type ? (
          <>
            <Center paddingBlock={4}>
              <VStack gap={2} hAlign="center">
                <Heading level={1} type="display-3" justify="center" xstyle={t.keepAll}>
                  {q.shown.ko}
                </Heading>
                <PosTag pos={q.shown.pos} />
              </VStack>
            </Center>
            <form onSubmit={submitTyped}>
              <TextInput
                label="영어"
                isLabelHidden
                placeholder="영어로 쓰기"
                value={text}
                onChange={setText}
                isDisabled={!!res}
                autoComplete="off"
                autoCapitalize="none"
                hasAutoCorrect={false}
                hasSpellCheck={false}
                enterKeyHint="done"
                status={
                  res
                    ? res.ok
                      ? { type: 'success', message: res.typo ? `거의 맞았어요! 철자: ${q.w.en}` : '정답' }
                      : { type: 'error', message: `정답: ${q.w.en}` }
                    : undefined
                }
              />
            </form>
            <Text type="supporting">두 번 이상 틀린 단어라서 직접 써 봐요. 괄호 안은 써도 안 써도 돼요.</Text>
          </>
        ) : (
          <>
            <Center paddingBlock={4}>
              <VStack gap={2} hAlign="center">
                <BigWord en={q.w.en} />
                <PosTag pos={q.shown.pos} />
              </VStack>
            </Center>
            <VStack gap={2}>
              {q.choices.map((c, i) => (
                <Choice key={c.key} mark={`${i + 1}`} label={c.ko} state={choiceState(!!res, c === q.shown, i === res?.pick)} onPick={() => pickAnswer(i)}>
                  <Text type="large" weight="medium" xstyle={t.keepAll}>
                    {c.ko}
                  </Text>
                </Choice>
              ))}
            </VStack>
          </>
        )}
      </VStack>
    </Screen>
  )
}
