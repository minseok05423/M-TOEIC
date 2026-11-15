import { useMemo, useState } from 'react'
import { ArrowRight, Languages } from 'lucide-react'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { StackItem } from '@astryxdesign/core/Stack'
import { Heading, Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import { ToggleButton } from '@astryxdesign/core/ToggleButton'
import { Card } from '@astryxdesign/core/Card'
import { Icon } from '@astryxdesign/core/Icon'
import { Token } from '@astryxdesign/core/Token'
import type { AnalyzedSentence } from '../content/types.ts'
import { parseMarkup, plainText, tagInfo } from '../content/markup.ts'
import { sfx } from '../lib/sfx.ts'
import { scrollToTop } from '../lib/ui.ts'
import { answer as ans, hueFill, hueText, motion, type as t } from '../ui/styles.ts'
import { RunHead, Screen } from './Screen.tsx'
import { SentenceView } from './SentenceView.tsx'
import { Speak } from './Speak.tsx'

interface Chip {
  text: string
  tag?: string
  /** 구두점처럼 누를 필요 없는 조각 */
  punct?: boolean
}

function chips(src: string): Chip[] {
  const out: Chip[] = []
  for (const t of parseMarkup(src)) {
    if (t.tag) out.push({ text: t.text, tag: t.tag })
    else
      for (const w of t.text.split(/\s+/).filter(Boolean))
        out.push(/[A-Za-z0-9]/.test(w) ? { text: w } : { text: w, punct: true })
  }
  return out
}

type Want = 'V' | 'S'

/** 틀린 조각을 눌렀을 때: 왜 아닌지 한 줄로 */
function why(c: Chip, want: Want): string {
  const t = c.tag
  if (!t) return '여기는 아니에요. 색이 없는 부분은 뼈대가 아니에요.'
  const lower = t !== t.toUpperCase()
  const k = t.toUpperCase()
  if (lower && k === 'V') return '그 동사는 덩어리 안에 있어요. 덩어리 밖의 진짜 동사를 찾아요.'
  if (lower && k === 'S') return '덩어리 안의 주어예요. 문장 전체의 주어를 찾아요.'
  if (lower) return `덩어리 안의 ${tagInfo(k).label}예요.`
  if (k === 'MOD') return want === 'V' ? '조동사예요! 바로 뒤에 오는 동사원형을 눌러요.' : '조동사예요. 주어는 그 앞에 있어요.'
  if (k === 'S') return '그건 주어예요. 주어 뒤에 오는 동사를 찾아요.'
  if (k === 'V') return '그건 동사예요. 동사 앞에서 "누가 / 무엇이"를 찾아요.'
  if (k === 'PREP') return '전치사예요. 전치사 + 명사는 꾸밈 덩어리라 뼈대가 아니에요.'
  if (k === 'CONJ') return '접속사예요. 주어+동사 덩어리를 여는 신호예요.'
  if (k === 'REL') return '관계사예요. 앞 명사를 꾸미는 덩어리를 열어요.'
  if (k === 'O') return '목적어예요 ("~을/를"). 동사 뒤에 와요.'
  if (k === 'C') return '보어예요. be동사 뒤에서 주어를 설명해요.'
  return `${tagInfo(k).label}예요.`
}

/** 한 문장: 동사 → 주어 차례로 찾기. 다 찾으면 분석 카드 + 아래 '다음' 버튼 */
function useOne(s: AnalyzedSentence) {
  const cs = useMemo(() => chips(s.text), [s.text])
  const wants = useMemo<Want[]>(() => (cs.some((c) => c.tag === 'S') ? ['V', 'S'] : ['V']), [cs])
  const [wi, setWi] = useState(0)
  const [found, setFound] = useState<Set<number>>(new Set())
  const [miss, setMiss] = useState<{ i: number; msg: string } | null>(null)
  const [misses, setMisses] = useState(0)
  const [stepMisses, setStepMisses] = useState(0)
  const revealed = wi >= wants.length
  const want = wants[wi]
  const targets = cs.map((c, i) => (c.tag === want ? i : -1)).filter((i) => i >= 0)

  function tap(i: number) {
    if (revealed || found.has(i)) return
    const c = cs[i]
    if (c.tag === want) {
      const f = new Set(found).add(i)
      setFound(f)
      setMiss(null)
      if (targets.every((x) => f.has(x))) {
        sfx.right()
        setWi(wi + 1)
        setStepMisses(0)
      } else sfx.pop()
    } else {
      sfx.wrong()
      setMiss({ i, msg: why(c, want) })
      setMisses(misses + 1)
      setStepMisses(stepMisses + 1)
    }
  }
  return { cs, wants, wi, found, miss, misses, stepMisses, revealed, want, targets, tap }
}

function Puzzle({ s, game }: { s: AnalyzedSentence; game: ReturnType<typeof useOne> }) {
  const { cs, wants, wi, found, miss, misses, stepMisses, want, targets, tap } = game
  const [ko, setKo] = useState(false)
  const left = targets.filter((i) => !found.has(i)).length
  const prompt =
    want === 'V'
      ? targets.length > 1
        ? `진짜 동사 ${targets.length}개를 찾아 누르세요`
        : '진짜 동사를 찾아 누르세요'
      : targets.length > 1
        ? `주어 ${targets.length}개를 찾아 누르세요`
        : '이 동사의 주어는?'

  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center" wrap="wrap">
        <Token color={want === 'V' ? 'red' : 'blue'} label={want} />
        <Heading level={2} xstyle={t.keepAll}>
          {prompt}
        </Heading>
        {targets.length > 1 && left < targets.length && <Text type="supporting">{left}개 남음</Text>}
      </HStack>
      <Card>
        <VStack gap={3}>
          <HStack gap={2} vAlign="center">
            <StackItem size="fill">
              <Speak text={plainText(s.text)} />
            </StackItem>
            <ToggleButton label="해석 힌트" size="sm" icon={<Icon icon={Languages} />} isPressed={ko} onPressedChange={setKo}>
              해석 힌트
            </ToggleButton>
          </HStack>
          <HStack as="p" gap={1.5} wrap="wrap" vAlign="center">
            {cs.map((c, i) => {
              if (c.punct)
                return (
                  <Text key={i} type="large" xstyle={t.enLarge}>
                    {c.text}
                  </Text>
                )
              const doneStep = c.tag && wants.indexOf(c.tag as Want) > -1 && wants.indexOf(c.tag as Want) < wi
              const isFound = found.has(i) || !!doneStep
              const hue = c.tag ? tagInfo(c.tag).hue : 'gray'
              const hint = stepMisses >= 2 && targets.includes(i) && !found.has(i)
              return (
                <Button
                  key={miss?.i === i ? `${i}-${misses}` : i}
                  label={c.text}
                  variant="secondary"
                  onClick={() => tap(i)}
                  xstyle={[t.en, isFound && [hueFill[hue], hueText[hue]], miss?.i === i && [ans.wrong, motion.shake], hint && ans.hint]}
                  endContent={isFound ? <Token size="sm" color={hue} label={c.tag!} /> : undefined}
                />
              )
            })}
          </HStack>
          {ko && <Text type="supporting">{s.ko}</Text>}
        </VStack>
      </Card>
      <Text key={misses} type="body" color={miss ? 'primary' : 'secondary'} xstyle={[t.keepAll, miss && motion.rise]}>
        {miss ? miss.msg : want === 'V' ? '시제가 붙은 동사 · 덩어리(절) 밖에 있어요' : '동사 앞의 "누가 / 무엇이"'}
      </Text>
    </VStack>
  )
}

/** 뼈대 찾기: 문장마다 진짜 동사 → 주어를 직접 눌러서 찾고, 다 찾으면 전체 분석을 보여줌 */
export function SentenceGame({
  sentences,
  exitHref,
  onDone,
  onNote,
}: {
  sentences: AnalyzedSentence[]
  exitHref: string
  onDone: (clean: number, total: number) => void
  onNote?: (targetId: string) => void
}) {
  const [i, setI] = useState(0)
  const [clean, setClean] = useState(0)
  const [combo, setCombo] = useState(0)
  const s = sentences[i]
  if (!s) return null
  return (
    <Round
      key={s.id}
      s={s}
      head={
        <RunHead
          exitHref={exitHref}
          progress={i / sentences.length}
          combo={combo}
          count={`${i + 1}/${sentences.length}`}
          onNote={onNote && (() => onNote(`sentences:${s.id}`))}
        />
      }
      onSolved={(ok) => {
        const c = clean + (ok ? 1 : 0)
        setClean(c)
        setCombo(ok ? combo + 1 : 0)
        if (i + 1 >= sentences.length) {
          sfx.done()
          onDone(c, sentences.length)
        } else {
          setI(i + 1)
          scrollToTop()
        }
      }}
    />
  )
}

function Round({ s, head, onSolved }: { s: AnalyzedSentence; head: React.ReactNode; onSolved: (clean: boolean) => void }) {
  const game = useOne(s)
  return (
    <Screen
      header={head}
      footer={
        game.revealed && (
          <Button
            label="다음"
            variant="primary"
            size="lg"
            width="100%"
            endContent={<Icon icon={ArrowRight} />}
            onClick={() => onSolved(game.misses === 0)}
          />
        )
      }
    >
      {game.revealed ? (
        <VStack gap={4} xstyle={motion.rise}>
          <Heading level={2}>{game.misses === 0 ? '한 번에 찾았어요!' : '뼈대를 찾았어요'}</Heading>
          <SentenceView s={s} opts={{ skeleton: false, ko: true, slash: true }} index={-1} />
        </VStack>
      ) : (
        <Puzzle s={s} game={game} />
      )}
    </Screen>
  )
}
