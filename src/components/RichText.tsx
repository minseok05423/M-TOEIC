import type { ReactNode } from 'react'
import { Lightbulb, TriangleAlert } from 'lucide-react'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { List, ListItem } from '@astryxdesign/core/List'
import { Banner } from '@astryxdesign/core/Banner'
import { Icon } from '@astryxdesign/core/Icon'

/** **굵게** 처리 */
export function Inline({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <Text key={i} type="inherit" weight="bold">
            {p}
          </Text>
        ) : (
          p
        ),
      )}
    </>
  )
}

/** 콘텐츠에서 줄 앞에 쓰는 💡 / ⚠️ 표시 → 아이콘이 있는 배너로 */
const CALLOUT = /^\s*(💡|⚠️?)\s*/u

/** 줄바꿈 = 문단, '- ' = 글머리표, '💡 …' = 팁, '⚠️ …' = 주의 */
export function RichText({ text }: { text: string }) {
  const out: ReactNode[] = []
  let bullets: string[] = []
  const flush = () => {
    if (bullets.length)
      out.push(
        <List edge="outset" key={out.length} listStyle="disc" density="compact">
          {bullets.map((b, i) => (
            <ListItem key={i} label={<Inline text={b} />} />
          ))}
        </List>,
      )
    bullets = []
  }
  for (const line of text.split('\n')) {
    if (line.startsWith('- ')) {
      bullets.push(line.slice(2))
      continue
    }
    flush()
    if (!line.trim()) continue
    const m = line.match(CALLOUT)
    if (m) {
      const warn = m[1] !== '💡'
      out.push(
        <Banner
          key={out.length}
          status={warn ? 'warning' : 'info'}
          icon={<Icon icon={warn ? TriangleAlert : Lightbulb} />}
          title={<Inline text={line.slice(m[0].length)} />}
        />,
      )
    } else
      out.push(
        <Text key={out.length} type="body" as="p">
          <Inline text={line} />
        </Text>,
      )
  }
  flush()
  return <VStack gap={3}>{out}</VStack>
}
