import { useMemo, useState } from 'react'
import { Trash2, TriangleAlert } from 'lucide-react'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Switch } from '@astryxdesign/core/Switch'
import { Banner } from '@astryxdesign/core/Banner'
import { Collapsible } from '@astryxdesign/core/Collapsible'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { ToggleButton } from '@astryxdesign/core/ToggleButton'
import { useImperativeAlertDialog } from '@astryxdesign/core/AlertDialog'
import { useToast } from '@astryxdesign/core/Toast'
import { deleteWord, getState, newId, saveWord, startWords, useStore } from '../lib/store.ts'
import { decks } from '../lib/words.ts'
import { go, href } from '../lib/router.ts'
import { AppBar, Screen } from '../components/Screen.tsx'
import { POS_LIST } from '../components/Pos.tsx'
import { type as t } from '../ui/styles.ts'

export function WordForm({ id }: { id?: string }) {
  const words = useStore((s) => s.words)
  const existing = id ? words[id] : undefined
  const deckList = useMemo(() => decks(words), [words])
  const confirm = useImperativeAlertDialog()
  const showToast = useToast()
  const blank = () => ({ en: '', ko: '', exEn: '', exKo: '', tip: '', deck: getState().settings.lastDeck, important: false, pos: [] as string[] })
  const [f, setF] = useState(() =>
    existing
      ? {
          en: existing.en,
          ko: existing.ko,
          exEn: existing.exEn ?? '',
          exKo: existing.exKo ?? '',
          tip: existing.tip ?? '',
          deck: existing.deck,
          important: !!existing.important,
          pos: existing.pos ? existing.pos.split(/\s*[/·]\s*/).filter(Boolean) : [],
        }
      : blank(),
  )
  const [round, setRound] = useState(0)

  if (id && !existing)
    return (
      <Screen header={<AppBar back={href('words')} title="단어 수정" />}>
        <EmptyState title="단어를 찾을 수 없어요" actions={<Button label="단어장으로" href={href('words')} />} />
      </Screen>
    )

  const set = (k: 'en' | 'ko' | 'exEn' | 'exKo' | 'tip' | 'deck') => (v: string) => setF({ ...f, [k]: v })
  const valid = !!(f.en.trim() && f.ko.trim())
  const dup =
    !existing && f.en.trim() && Object.values(words).find((w) => !w.deleted && w.en.trim().toLowerCase() === f.en.trim().toLowerCase())

  function save(more: boolean) {
    if (!valid) return
    const wid = existing?.id ?? newId()
    saveWord({
      id: wid,
      en: f.en.trim(),
      ko: f.ko.trim(),
      exEn: f.exEn.trim() || undefined,
      exKo: f.exKo.trim() || undefined,
      tip: f.tip.trim() || undefined,
      deck: f.deck.trim() || '내 단어',
      important: f.important || undefined,
      pos: f.pos.length ? f.pos.join(f.pos.length > 1 && f.ko.includes('/') ? ' / ' : '·') : undefined,
      createdAt: existing?.createdAt,
    })
    if (!existing) startWords([`c:${wid}`])
    if (more) {
      showToast({ body: `"${f.en.trim()}" 저장했어요. 다음 단어!`, uniqueID: 'word-saved' })
      setF({ ...blank(), deck: f.deck.trim() || '내 단어' })
      setRound(round + 1)
    } else go('words')
  }

  return (
    <Screen
      header={<AppBar back={href('words')} title={existing ? '단어 수정' : '단어 추가'} />}
      footer={
        existing ? (
          <VStack gap={2}>
            <Button label="저장" type="submit" form="word-form" variant="primary" size="lg" width="100%" isDisabled={!valid} />
            <Button
              label="삭제"
              variant="destructive"
              width="100%"
              icon={<Icon icon={Trash2} />}
              onClick={() =>
                confirm.show({
                  title: `"${existing.en}" 을(를) 지울까요?`,
                  description: '단어장과 복습 목록에서 사라져요.',
                  actionLabel: '지우기',
                  onAction: () => {
                    confirm.hide()
                    deleteWord(existing.id)
                    go('words')
                  },
                })
              }
            />
          </VStack>
        ) : (
          <VStack gap={2}>
            <Button label="저장하고 하나 더 추가" type="submit" form="word-form" variant="primary" size="lg" width="100%" isDisabled={!valid} />
            <Button label="저장하고 끝내기" variant="secondary" width="100%" isDisabled={!valid} onClick={() => save(false)} />
          </VStack>
        )
      }
    >
      <form
        id="word-form"
        onSubmit={(e) => {
          e.preventDefault()
          save(!existing)
        }}
      >
        <FormLayout key={round} defaultOptionality="optional">
          <TextInput
            label="영어"
            isRequired
            value={f.en}
            onChange={set('en')}
            hasAutoCorrect={false}
            hasSpellCheck={false}
            placeholder="예: postpone"
            hasAutoFocus={!existing}
            controlXstyle={t.en}
          />
          {dup && <Banner status="warning" icon={<Icon icon={TriangleAlert} />} title={`이미 "${dup.deck}"에 있는 단어예요`} description={dup.ko} />}
          <TextInput label="뜻" isRequired value={f.ko} onChange={set('ko')} placeholder="예: 연기하다, 미루다" />
          <VStack gap={2}>
            <Text type="label">품사</Text>
            <HStack gap={1} wrap="wrap" role="group" aria-label="품사">
              {POS_LIST.map((p) => {
                const on = f.pos.includes(p)
                return (
                  <ToggleButton
                    key={p}
                    label={p}
                    size="sm"
                    isPressed={on}
                    onPressedChange={() => setF({ ...f, pos: on ? f.pos.filter((x) => x !== p) : POS_LIST.filter((x) => x === p || f.pos.includes(x)) })}
                  >
                    {p}
                  </ToggleButton>
                )
              })}
            </HStack>
            {f.pos.length > 1 && <Text type="supporting">뜻마다 품사가 다르면 뜻을 / 로 나눠 고른 순서대로 써요. 예: 그늘지게 하다 / 그늘</Text>}
          </VStack>
          <VStack gap={2}>
            <TextInput
              label="묶음"
              value={f.deck}
              onChange={set('deck')}
              placeholder="내 단어"
              description="예: 내 단어, Day 3, 해커스 Part 5 … 같은 묶음끼리 카드로 외울 수 있어요"
            />
            {deckList.length > 0 && (
              <HStack gap={1} wrap="wrap">
                {deckList.slice(0, 8).map((d) => (
                  <ToggleButton key={d} label={d} size="sm" isPressed={f.deck === d} onPressedChange={() => setF({ ...f, deck: d })}>
                    {d}
                  </ToggleButton>
                ))}
              </HStack>
            )}
          </VStack>
          <Switch
            label="★ 중요 단어"
            description="단어 테스트에 더 자주 나와요"
            labelPosition="start" labelSpacing="spread"
            value={f.important}
            onChange={(v) => setF({ ...f, important: v })}
          />
          <Collapsible defaultIsOpen={!!(f.exEn || f.exKo || f.tip)} trigger={<Text type="label">예문 · 메모 (선택)</Text>}>
            <FormLayout defaultOptionality="optional">
              <TextInput label="예문 (영어)" value={f.exEn} onChange={set('exEn')} placeholder="The meeting was postponed." controlXstyle={t.en} />
              <TextInput label="예문 해석" value={f.exKo} onChange={set('exKo')} placeholder="회의가 연기되었다." />
              <TextInput label="메모" value={f.tip} onChange={set('tip')} placeholder="= put off" />
            </FormLayout>
          </Collapsible>
        </FormLayout>
      </form>
      {confirm.element}
    </Screen>
  )
}
