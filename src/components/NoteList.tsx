import { useMemo } from 'react'
import { ChevronRight, CircleHelp, Lightbulb, NotebookPen } from 'lucide-react'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Heading, Text } from '@astryxdesign/core/Text'
import { List, ListItem } from '@astryxdesign/core/List'
import { Icon } from '@astryxdesign/core/Icon'
import { Token } from '@astryxdesign/core/Token'
import { Blockquote } from '@astryxdesign/core/Blockquote'
import type { Lesson } from '../content/types.ts'
import { useStore, type LessonNote } from '../lib/store.ts'
import { CATEGORIES } from '../lib/notes.ts'
import { formatDate } from '../lib/date.ts'
import { type as t } from '../ui/styles.ts'

function statusOf(n: LessonNote): { color: 'green' | 'blue' | 'default'; text: string } {
  if (n.status === 'done') return { color: 'green', text: '레슨에 반영됨' }
  if (n.synced) return { color: 'blue', text: '선생님께 전달됨' }
  return { color: 'default', text: '보내는 중' }
}

const ymd = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 레슨 첫 화면 아래: 이 레슨에 남긴 내 메모 + 새 메모 버튼 */
export function NoteList({ chapterId, lesson, onNew }: { chapterId: string; lesson: Lesson; onNew: () => void }) {
  const all = useStore((s) => s.notes)
  const notes = useMemo(
    () => Object.values(all).filter((n) => n.chapterId === chapterId && n.lessonId === lesson.id).sort((a, b) => b.createdAt - a.createdAt),
    [all, chapterId, lesson.id],
  )

  return (
    <VStack gap={2}>
      <Heading level={3} color="secondary">
        내 메모
      </Heading>
      <List edge="outset" hasDividers header={null}>
        <ListItem
          onClick={onNew}
          startContent={<Icon icon={NotebookPen} color="accent" />}
          label="중요한 점 · 헷갈리는 점 남기기"
          description="선생님이 보고 나만의 레슨을 만들어 줘요"
          endContent={<Icon icon={ChevronRight} color="secondary" />}
        />
        {notes.map((n) => {
          const st = statusOf(n)
          return (
            <ListItem
              key={n.id}
              align="first-line"
              startContent={<Icon icon={n.kind === 'important' ? Lightbulb : CircleHelp} color={n.kind === 'important' ? 'warning' : 'info'} />}
              label={n.kind === 'important' ? '중요한 점' : `헷갈리는 점 · ${CATEGORIES.find((c) => c.id === n.category)?.label ?? ''}`}
              endContent={<Token size="sm" color={st.color} label={st.text} />}
              description={
                <VStack gap={1}>
                  {n.targetLabel && (
                    <Text type="supporting" maxLines={1}>
                      {n.targetLabel}
                    </Text>
                  )}
                  <Text type="body" color="primary" xstyle={t.keepAll}>
                    {n.point}
                  </Text>
                  {n.question && (
                    <Text type="body" color="primary" weight="medium" xstyle={t.keepAll}>
                      {n.question}
                    </Text>
                  )}
                  {n.reply && (
                    <Blockquote cite="선생님">
                      <Text type="body">{n.reply}</Text>
                    </Blockquote>
                  )}
                  <HStack>
                    <Text type="supporting">{formatDate(ymd(n.createdAt))}</Text>
                  </HStack>
                </VStack>
              }
            />
          )
        })}
      </List>
    </VStack>
  )
}
