import { useMemo, useState } from 'react'
import { BookPlus, ClipboardPaste, Layers, Plus, Search } from 'lucide-react'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { StackItem } from '@astryxdesign/core/Stack'
import { Heading, Text } from '@astryxdesign/core/Text'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { TextInput } from '@astryxdesign/core/TextInput'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { List } from '@astryxdesign/core/List'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { setImportant, useStore } from '../lib/store.ts'
import { customWords, lessonWordList, type StudyWord } from '../lib/words.ts'
import { boxLabel } from '../lib/srs.ts'
import { go, href, replace } from '../lib/router.ts'
import { PageTitle, Screen } from '../components/Screen.tsx'
import { HideKoSwitch, WordRow } from '../components/WordRow.tsx'

function groupBy(ws: StudyWord[], key: (w: StudyWord) => string): [string, StudyWord[]][] {
  const m = new Map<string, StudyWord[]>()
  for (const w of ws) m.set(key(w), [...(m.get(key(w)) ?? []), w])
  return [...m]
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

export function Words({ view }: { view: 'mine' | 'lesson' }) {
  const custom = useStore((s) => s.words)
  const srs = useStore((s) => s.progress.srs)
  const [q, setQ] = useState('')
  const [hideKo, setHideKo] = useState(false)
  const userChapters = useStore((s) => s.userChapters)
  const mine = useMemo(() => customWords(custom), [custom])
  const lessonList = useMemo(() => lessonWordList(), [userChapters])
  const list = view === 'mine' ? mine : lessonList
  const filtered = useMemo(() => {
    const n = norm(q)
    return n ? list.filter((w) => norm(w.en).includes(n) || w.ko.includes(q.trim())) : list
  }, [list, q])
  // 내 단어: 묶음은 최근 것부터, 묶음 안에서는 넣은 순서대로
  const groups = groupBy(filtered, (w) => (view === 'mine' ? w.group : (w.lessonTitle ?? ''))).map(
    ([g, ws]): [string, StudyWord[]] => [g, view === 'mine' ? [...ws].reverse() : ws],
  )

  return (
    <Screen nav>
      <VStack gap={5}>
        <PageTitle>단어장</PageTitle>
        <SegmentedControl label="단어 종류" value={view} onChange={(v) => (v === 'lesson' ? replace('words', 'lesson') : replace('words'))} layout="fill">
          <SegmentedControlItem value="mine" label={`내 단어 ${mine.length}`} />
          <SegmentedControlItem value="lesson" label={`수업 단어 ${lessonList.length}`} />
        </SegmentedControl>

        {view === 'mine' && (
          <HStack gap={2}>
            <StackItem size="fill">
              <Button label="단어 추가" variant="primary" width="100%" icon={<Icon icon={Plus} />} href={href('words', 'new')} />
            </StackItem>
            <StackItem size="fill">
              <Button label="여러 개 붙여넣기" variant="secondary" width="100%" icon={<Icon icon={ClipboardPaste} />} href={href('words', 'bulk')} />
            </StackItem>
          </HStack>
        )}

        {list.length > 0 && (
          <VStack gap={2}>
            <TextInput label="찾기" isLabelHidden type="search" startIcon={Search} placeholder="영어나 뜻으로 찾기" value={q} onChange={setQ} hasClear />
            <HStack hAlign="between" vAlign="center">
              <Text type="supporting">{filtered.length}개</Text>
              <HideKoSwitch value={hideKo} onChange={setHideKo} />
            </HStack>
          </VStack>
        )}

        {view === 'mine' && mine.length === 0 && (
          <EmptyState
            icon={<Icon icon={BookPlus} size="lg" />}
            title="책이나 수업에서 모르는 단어를 추가하세요"
            description='추가한 단어는 자동으로 복습 목록에 들어가요. 단어책 목록은 "여러 개 붙여넣기"로 한 번에 넣을 수 있어요.'
          />
        )}

        {q && filtered.length === 0 && <EmptyState isCompact title={`"${q}" 검색 결과가 없어요`} />}

        {groups.map(([g, ws]) => (
          <List edge="outset"
            key={g}
            hasDividers
            header={
              <HStack hAlign="between" vAlign="center" gap={2}>
                <Heading level={3} maxLines={1}>
                  {g} · {ws.length}
                </Heading>
                {view === 'mine' && !q && <Button label="외우기" size="sm" variant="secondary" icon={<Icon icon={Layers} />} href={href('words', 'cards', g)} />}
                {view === 'lesson' && ws[0]?.chapterId && (
                  <Button label="외우기" size="sm" variant="secondary" icon={<Icon icon={Layers} />} href={href('l', ws[0].chapterId, ws[0].lessonId!, 'words')} />
                )}
              </HStack>
            }
          >
            {ws.map((w) => (
              <WordRow
                key={w.key}
                en={w.en}
                ko={w.ko}
                pos={w.pos}
                tip={w.tip}
                ex={w.ex}
                box={srs[w.key]?.box}
                level={boxLabel(srs[w.key])}
                hideKo={hideKo}
                onEdit={w.customId ? () => go('words', 'edit', w.customId!) : undefined}
                important={w.important}
                onStar={w.customId ? () => setImportant(w.customId!, !w.important) : undefined}
              />
            ))}
          </List>
        ))}
      </VStack>
    </Screen>
  )
}
