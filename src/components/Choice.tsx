import type { ReactNode } from 'react'
import { ArrowRight, Check, CircleCheck, CircleX, X } from 'lucide-react'
import { ClickableCard } from '@astryxdesign/core/ClickableCard'
import { HStack } from '@astryxdesign/core/HStack'
import { VStack } from '@astryxdesign/core/VStack'
import { StackItem } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { Icon } from '@astryxdesign/core/Icon'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { answer, motion } from '../ui/styles.ts'

export type ChoiceState = 'idle' | 'right' | 'wrong' | 'dim'

/** 보기 하나 (4지선다, 짝 맞추기). 답한 뒤에는 정답 초록 · 고른 오답 빨강 · 나머지 흐리게 */
export function Choice({
  mark,
  label,
  children,
  state = 'idle',
  onPick,
}: {
  /** 왼쪽 번호 (A, 1 …) */
  mark?: string
  /** 화면 읽기용 이름 */
  label: string
  children: ReactNode
  state?: ChoiceState
  onPick: () => void
}) {
  return (
    <ClickableCard
      label={label}
      padding={3}
      variant={state === 'right' ? 'green' : state === 'wrong' ? 'red' : 'default'}
      isDisabled={state === 'dim'}
      onClick={onPick}
      xstyle={[state === 'dim' && answer.dim, state === 'wrong' && motion.shake]}
    >
      <HStack gap={3} vAlign="center">
        {mark && (
          <Text type="label" color="secondary" hasTabularNumbers>
            {mark}
          </Text>
        )}
        <StackItem size="fill">{children}</StackItem>
        {state === 'right' && <Icon icon={Check} color="success" />}
        {state === 'wrong' && <Icon icon={X} color="error" />}
      </HStack>
    </ClickableCard>
  )
}

export const choiceState = (answered: boolean, isAnswer: boolean, isPicked: boolean): ChoiceState =>
  !answered ? 'idle' : isAnswer ? 'right' : isPicked ? 'wrong' : 'dim'

/** 답한 뒤 아래에 고정되는 칸: 맞았어요/아쉬워요 + 설명 + 다음 버튼 */
export function Feedback({
  ok,
  title,
  children,
  extra,
  nextLabel = '계속',
  onNext,
}: {
  ok: boolean
  title: ReactNode
  children?: ReactNode
  extra?: ReactNode
  nextLabel?: string
  onNext: () => void
}) {
  return (
    <VStack gap={3} role="status" xstyle={motion.rise}>
      <Banner
        status={ok ? 'success' : 'error'}
        icon={<Icon icon={ok ? CircleCheck : CircleX} />}
        title={title}
        description={children}
      />
      {extra}
      <Button label={nextLabel} variant="primary" size="lg" width="100%" endContent={<Icon icon={ArrowRight} />} onClick={onNext} />
    </VStack>
  )
}
