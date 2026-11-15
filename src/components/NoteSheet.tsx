import { useState } from 'react'
import { CircleCheck, CircleHelp, CloudOff, Lightbulb } from 'lucide-react'
import { BottomSheet } from '@astryxdesign/core/BottomSheet'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { StackItem } from '@astryxdesign/core/Stack'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading, Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { Banner } from '@astryxdesign/core/Banner'
import { SelectableCard } from '@astryxdesign/core/SelectableCard'
import { Selector } from '@astryxdesign/core/Selector'
import { TextArea } from '@astryxdesign/core/TextArea'
import { TextInput } from '@astryxdesign/core/TextInput'
import { ToggleButton } from '@astryxdesign/core/ToggleButton'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { useImperativeAlertDialog } from '@astryxdesign/core/AlertDialog'
import type { Lesson } from '../content/types.ts'
import { addNote, type NoteCategory, type NoteKind } from '../lib/store.ts'
import { CATEGORIES, findTarget, LEVELS, lessonTargets, MIN_CHARS, textLen, WHOLE } from '../lib/notes.ts'
import { supabase, useSession } from '../lib/supabase.ts'
import { sfx } from '../lib/sfx.ts'
import { type as t } from '../ui/styles.ts'

interface Props {
  chapterId: string
  lesson: Lesson
  /** 처음에 골라 둘 곳 (lib/notes.ts 의 NoteTarget id) */
  targetId?: string
  kind?: NoteKind
  isOpen: boolean
  onClose: () => void
}

/** 여러 버튼을 묶는 칸의 제목 (필수) */
function Group({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <VStack gap={2} role="group" aria-label={label}>
      <VStack gap={0.5}>
        <Text type="label">
          {label}{' '}
          <Text type="inherit" color="accent">
            *
          </Text>
        </Text>
        {description && <Text type="supporting">{description}</Text>}
      </VStack>
      {children}
    </VStack>
  )
}

/** 글자 수: 8자 이상이면 체크 */
const counter = (s: string) => {
  const n = textLen(s)
  return n >= MIN_CHARS ? '충분해요' : `${n}/${MIN_CHARS}자`
}
const lenStatus = (s: string) => (textLen(s) >= MIN_CHARS ? ({ type: 'success' } as const) : undefined)

/**
 * 메모 남기기. 자유 글 대신 칸을 정해 두고, 다 채워야 보낼 수 있음
 * (선생님이 Claude Code 로 맞춤 레슨을 만들 때 그대로 읽을 수 있게).
 */
export function NoteSheet({ chapterId, lesson, targetId, kind: kind0, isOpen, onClose }: Props) {
  const session = useSession()
  const confirm = useImperativeAlertDialog()
  const [kind, setKind] = useState<NoteKind | undefined>(kind0)
  const [target, setTarget] = useState(findTarget(lesson, targetId).id)
  const [category, setCategory] = useState<NoteCategory>()
  const [level, setLevel] = useState<1 | 2 | 3>()
  const [point, setPoint] = useState('')
  const [question, setQuestion] = useState('')
  const [example, setExample] = useState('')
  const [sent, setSent] = useState(false)

  const dirty = !!(point || question || example)
  const close = () => {
    if (!sent && dirty)
      confirm.show({
        title: '쓰던 메모를 지울까요?',
        description: '닫으면 지금까지 쓴 내용이 사라져요.',
        actionLabel: '지우고 닫기',
        cancelLabel: '계속 쓰기',
        onAction: () => {
          confirm.hide()
          onClose()
        },
      })
    else onClose()
  }

  const missing: string[] = []
  if (!kind) missing.push('종류 고르기')
  if (kind === 'confusing') {
    if (!category) missing.push('어디서 막혔는지')
    if (textLen(point) < MIN_CHARS) missing.push(`이해한 것 ${MIN_CHARS}자 이상`)
    if (textLen(question) < MIN_CHARS) missing.push(`헷갈리는 부분 ${MIN_CHARS}자 이상`)
    if (!level) missing.push('얼마나 헷갈리는지')
  }
  if (kind === 'important' && textLen(point) < MIN_CHARS) missing.push(`내 말로 정리 ${MIN_CHARS}자 이상`)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (missing.length || !kind) return
    const tg = findTarget(lesson, target)
    addNote({
      chapterId,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      stage: tg.stage,
      targetId: tg.id || undefined,
      targetLabel: tg.id ? tg.label : undefined,
      kind,
      category: kind === 'confusing' ? category : undefined,
      level: kind === 'confusing' ? level : undefined,
      point: point.trim(),
      question: kind === 'confusing' ? question.trim() : undefined,
      example: example.trim() || undefined,
    })
    sfx.done()
    setSent(true)
  }

  const offline = !supabase || !session
  const hint = category ? CATEGORIES.find((c) => c.id === category)!.hint : ''
  const targetOptions = [
    { value: WHOLE.id || 'whole', label: WHOLE.label },
    ...lessonTargets(lesson).map((g) => ({ type: 'section' as const, title: g.title, options: g.items.map((x) => ({ value: x.id, label: x.label })) })),
  ]

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={(o) => !o && close()} label="메모 남기기" height="tall" purpose="form">
      {sent ? (
        <EmptyState
          icon={<Icon icon={CircleCheck} color="success" size="lg" />}
          title="보냈어요"
          description={
            offline ? '이 휴대폰에 저장했어요. 설정에서 로그인하면 선생님께 전달돼요.' : '선생님께 전달돼요. 이 내용으로 나만의 레슨을 만들어 줄 거예요.'
          }
          actions={<Button label="계속 공부하기" variant="primary" size="lg" onClick={onClose} />}
        />
      ) : (
        <form onSubmit={submit}>
          <VStack gap={5}>
            <Heading level={2}>메모 남기기</Heading>
            {offline && (
              <Banner
                status="warning"
                icon={<Icon icon={CloudOff} />}
                title="로그인하지 않아서 이 휴대폰에만 저장돼요"
                description="로그인하면 그때 선생님께 보내져요."
              />
            )}

            <Group label="어떤 메모예요?">
              <Grid columns={2} gap={2}>
                <SelectableCard label="중요한 점" isSelected={kind === 'important'} onChange={() => setKind('important')} padding={3}>
                  <VStack gap={1}>
                    <Icon icon={Lightbulb} color="warning" />
                    <Text type="body" weight="semibold">
                      중요한 점
                    </Text>
                    <Text type="supporting">꼭 기억할 것</Text>
                  </VStack>
                </SelectableCard>
                <SelectableCard label="헷갈리는 점" isSelected={kind === 'confusing'} onChange={() => setKind('confusing')} padding={3}>
                  <VStack gap={1}>
                    <Icon icon={CircleHelp} color="info" />
                    <Text type="body" weight="semibold">
                      헷갈리는 점
                    </Text>
                    <Text type="supporting">잘 모르겠는 것</Text>
                  </VStack>
                </SelectableCard>
              </Grid>
            </Group>

            <Selector
              label="어디에 대한 메모예요?"
              options={targetOptions}
              value={target || 'whole'}
              onChange={(v) => setTarget(v === 'whole' ? '' : (v ?? ''))}
              presentation="adaptive"
              hasSearch
              searchPlaceholder="찾기"
            />

            {kind === 'confusing' && (
              <>
                <Group label="어디서 막혔어요?" description={hint}>
                  <HStack gap={1} wrap="wrap">
                    {CATEGORIES.map((c) => (
                      <ToggleButton key={c.id} label={c.label} size="sm" isPressed={category === c.id} onPressedChange={() => setCategory(c.id)}>
                        {c.label}
                      </ToggleButton>
                    ))}
                  </HStack>
                </Group>
                <TextArea
                  label="지금 내가 이해한 건"
                  isRequired
                  rows={2}
                  htmlMaxLength={600}
                  value={point}
                  onChange={setPoint}
                  description={counter(point)}
                  status={lenStatus(point)}
                  placeholder="예: 동사 뒤에 -ing 가 오면 다 진행형인 줄 알았어요"
                />
                <TextArea
                  label="그런데 이게 헷갈려요"
                  isRequired
                  rows={2}
                  htmlMaxLength={600}
                  value={question}
                  onChange={setQuestion}
                  description={counter(question)}
                  status={lenStatus(question)}
                  placeholder="예: enjoy reading 에서 reading 은 왜 진행형이 아니에요?"
                />
                <Group label="얼마나 헷갈려요?">
                  <HStack gap={1} wrap="wrap">
                    {LEVELS.map((l) => (
                      <ToggleButton key={l.id} label={l.label} size="sm" isPressed={level === l.id} onPressedChange={() => setLevel(l.id)}>
                        {l.label}
                      </ToggleButton>
                    ))}
                  </HStack>
                </Group>
                <TextInput
                  label="헷갈린 문장"
                  isOptional
                  value={example}
                  onChange={(v) => setExample(v.slice(0, 300))}
                  placeholder="I enjoy reading books."
                  controlXstyle={t.en}
                />
              </>
            )}

            {kind === 'important' && (
              <>
                <TextArea
                  label="내 말로 정리하면"
                  isRequired
                  rows={3}
                  htmlMaxLength={600}
                  value={point}
                  onChange={setPoint}
                  description={counter(point)}
                  status={lenStatus(point)}
                  placeholder="예: 문장에서 진짜 동사는 하나! 먼저 동사를 찾고 그 앞이 주어"
                />
                <TextInput
                  label="기억할 예문"
                  isOptional
                  value={example}
                  onChange={(v) => setExample(v.slice(0, 300))}
                  placeholder="The meeting will start at 9."
                  controlXstyle={t.en}
                />
              </>
            )}

            <VStack gap={2}>
              {missing.length > 0 && kind && <Text type="supporting">남은 것: {missing.join(' · ')}</Text>}
              <HStack gap={2}>
                <StackItem size="static">
                  <Button label="닫기" variant="secondary" size="lg" onClick={close} />
                </StackItem>
                <StackItem size="fill">
                  <Button label="보내기" type="submit" variant="primary" size="lg" width="100%" isDisabled={missing.length > 0} />
                </StackItem>
              </HStack>
            </VStack>
          </VStack>
        </form>
      )}
      {confirm.element}
    </BottomSheet>
  )
}

/** 화면에서 메모 창을 열고 닫기 위한 작은 도우미 */
export function useNoteSheet(chapterId: string, lesson: Lesson) {
  const [open, setOpen] = useState<{ targetId?: string; kind?: NoteKind; n: number } | null>(null)
  const [n, setN] = useState(0)
  const sheet = open && (
    <NoteSheet key={open.n} chapterId={chapterId} lesson={lesson} targetId={open.targetId} kind={open.kind} isOpen onClose={() => setOpen(null)} />
  )
  return {
    openNote: (targetId?: string, kind?: NoteKind) => {
      setN(n + 1)
      setOpen({ targetId, kind, n: n + 1 })
    },
    sheet,
  }
}
