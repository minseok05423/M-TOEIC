import type { ReactNode } from 'react'
import { BookOpen, ChevronLeft, Flame, House, NotebookPen, RotateCcw, Settings, X, type LucideIcon } from 'lucide-react'
import { Layout, LayoutContent, LayoutFooter, LayoutHeader } from '@astryxdesign/core/Layout'
import { HStack } from '@astryxdesign/core/HStack'
import { StackItem } from '@astryxdesign/core/Stack'
import { Heading, Text } from '@astryxdesign/core/Text'
import { IconButton } from '@astryxdesign/core/IconButton'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { ProgressBar } from '@astryxdesign/core/ProgressBar'
import { TabList, Tab } from '@astryxdesign/core/TabList'
import { Badge } from '@astryxdesign/core/Badge'
import { go, useRoute } from '../lib/router.ts'
import { useDueCount } from '../lib/words.ts'
import { SCROLL_ROOT } from '../lib/ui.ts'
import { layout } from '../ui/styles.ts'

/** 휴대폰 화면에서 본문이 너무 넓어지지 않게 (태블릿·PC 에서는 가운데 정렬) */
const CONTENT_WIDTH = 600

/**
 * 모든 화면의 틀: 위(header) · 본문(스크롤) · 아래(footer) 세 칸.
 * - 탭 화면(홈·복습·단어장·설정)은 nav 를 켜면 아래에 탭바가 붙어요.
 * - 게임 화면은 header 에 RunHead, footer 에 다음 버튼을 넣어요 (둘 다 고정, 본문만 스크롤).
 */
export function Screen({
  header,
  footer,
  nav,
  children,
}: {
  header?: ReactNode
  footer?: ReactNode
  nav?: boolean
  children: ReactNode
}) {
  return (
    <Layout
      height="fill"
      contentWidth={CONTENT_WIDTH}
      header={header}
      content={
        <LayoutContent isScrollable id={SCROLL_ROOT} padding={4}>
          {children}
        </LayoutContent>
      }
      footer={
        footer ? (
          <LayoutFooter hasDivider xstyle={layout.safeBottom}>
            {footer}
          </LayoutFooter>
        ) : nav ? (
          <BottomNav />
        ) : null
      }
    />
  )
}

/** 하위 화면 위쪽: 뒤로 · 제목 · 오른쪽 버튼 */
export function AppBar({ title, back, right }: { title?: ReactNode; back: string; right?: ReactNode }) {
  return (
    <LayoutHeader padding={2}>
      <HStack gap={1} vAlign="center">
        <IconButton label="뒤로" variant="ghost" size="lg" href={back} icon={<Icon icon={ChevronLeft} size="lg" />} />
        <StackItem size="fill">
          {title && (
            <Heading level={3} accessibilityLevel={1} maxLines={1}>
              {title}
            </Heading>
          )}
        </StackItem>
        {right}
      </HStack>
    </LayoutHeader>
  )
}

/** 게임·퀴즈 위쪽: 나가기 · 진행 막대 · 몇 번째/연속 정답 · 메모 */
export function RunHead({
  exitHref,
  progress,
  combo = 0,
  count,
  onNote,
}: {
  exitHref: string
  progress: number
  combo?: number
  count?: string
  /** 있으면 오른쪽에 '메모' 버튼 */
  onNote?: () => void
}) {
  return (
    <LayoutHeader padding={2}>
      <HStack gap={2} vAlign="center">
        <IconButton label="그만하기" variant="ghost" size="lg" href={exitHref} icon={<Icon icon={X} size="lg" />} />
        <StackItem size="fill">
          <ProgressBar label="진행" isLabelHidden value={Math.min(1, progress) * 100} max={100} />
        </StackItem>
        {combo >= 2 ? (
          <Badge key={combo} variant="orange" icon={<Icon icon={Flame} size="xsm" />} label={`${combo}`} />
        ) : (
          count && (
            <Text type="label" color="secondary" hasTabularNumbers>
              {count}
            </Text>
          )
        )}
        {onNote && <NoteButton onClick={onNote} />}
      </HStack>
    </LayoutHeader>
  )
}

/** 게임 중에 메모 남기기 (지금 보고 있는 것이 미리 골라짐) */
export function NoteButton({ onClick }: { onClick: () => void }) {
  return <Button label="메모" variant="secondary" size="sm" icon={<Icon icon={NotebookPen} />} onClick={onClick} />
}

/** 탭 화면의 큰 제목 (본문 맨 위, 같이 스크롤됨) */
export function PageTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <HStack gap={2} vAlign="center" hAlign="between">
      <Heading level={1} type="display-3">
        {children}
      </Heading>
      {right}
    </HStack>
  )
}

const TABS: { id: string; icon: LucideIcon; label: string }[] = [
  { id: 'home', icon: House, label: '홈' },
  { id: 'review', icon: RotateCcw, label: '복습' },
  { id: 'words', icon: BookOpen, label: '단어장' },
  { id: 'settings', icon: Settings, label: '설정' },
]

/** 아래 탭바 */
function BottomNav() {
  const [a] = useRoute()
  const due = useDueCount()
  const active = a === 'test' ? 'review' : a === 'review' || a === 'words' || a === 'settings' ? a : 'home'
  return (
    <LayoutFooter hasDivider padding={0} label="메뉴" xstyle={layout.safeBottom}>
      <TabList value={active} onChange={(v) => (v === 'home' ? go() : go(v))} layout="fill" size="lg">
        {TABS.map(({ id, icon, label }) => (
          <Tab
            key={id}
            value={id}
            label={label}
            icon={<Icon icon={icon} />}
            endContent={id === 'review' && due > 0 ? <Badge variant="error" label={due > 99 ? '99+' : `${due}`} /> : undefined}
          />
        ))}
      </TabList>
    </LayoutFooter>
  )
}
