import { useState } from 'react'
import { Lightbulb, Pencil, Star } from 'lucide-react'
import { ListItem } from '@astryxdesign/core/List'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { Icon } from '@astryxdesign/core/Icon'
import { Button } from '@astryxdesign/core/Button'
import { ToggleButton } from '@astryxdesign/core/ToggleButton'
import { ProgressBar } from '@astryxdesign/core/ProgressBar'
import { Switch } from '@astryxdesign/core/Switch'
import { MAX_BOX } from '../lib/srs.ts'
import { layout, type as t } from '../ui/styles.ts'
import { Speak } from './Speak.tsx'
import { Meaning } from './Pos.tsx'

export function HideKoSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return <Switch label="뜻 가리기" size="sm" value={value} onChange={onChange} />
}

/** 외운 정도: 0~6칸 */
function Meter({ box, title }: { box: number; title?: string }) {
  return (
    <ProgressBar
      label={title ?? '외운 정도'}
      isLabelHidden
      value={box}
      max={MAX_BOX}
      variant={box >= MAX_BOX ? 'success' : box === 0 ? 'neutral' : 'accent'}
      xstyle={layout.meter}
    />
  )
}

/** 단어 한 줄. 누르면 예문·메모·수정이 펼쳐짐. List 안에 넣어서 쓰세요 */
export function WordRow({
  en,
  ko,
  pos,
  tip,
  ex,
  level,
  box,
  hideKo,
  onEdit,
  important,
  onStar,
}: {
  en: string
  ko: string
  pos?: string
  tip?: string
  ex?: { en: string; ko: string }
  level?: string
  box?: number
  hideKo?: boolean
  onEdit?: () => void
  important?: boolean
  /** 있으면 ★ 버튼 (중요 표시 켜고 끄기) */
  onStar?: () => void
}) {
  const [open, setOpen] = useState(false)
  const shown = !hideKo || open
  const more = open && (ex || tip || onEdit || level)
  return (
    <ListItem
      align="first-line"
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      startContent={<Speak text={en} />}
      label={
        <Text type="large" weight="semibold" xstyle={t.en}>
          {en}
        </Text>
      }
      description={
        <VStack gap={2}>
          <Text type="body" color={shown ? 'primary' : 'placeholder'} xstyle={t.keepAll}>
            {shown ? <Meaning ko={ko} pos={pos} /> : '탭해서 보기'}
          </Text>
          {more && (
            <VStack gap={2}>
              {ex && (
                <HStack gap={1} vAlign="start">
                  <Speak text={ex.en} size="sm" />
                  <VStack gap={0.5}>
                    <Text type="body" xstyle={t.en}>
                      {ex.en}
                    </Text>
                    <Text type="supporting">{ex.ko}</Text>
                  </VStack>
                </HStack>
              )}
              {tip && (
                <HStack gap={1} vAlign="center">
                  <Icon icon={Lightbulb} size="sm" color="warning" />
                  <Text type="supporting">{tip}</Text>
                </HStack>
              )}
              {level && <Text type="supporting">상태 · {level}</Text>}
              {onEdit && (
                <HStack>
                  <Button
                    label="수정"
                    size="sm"
                    variant="secondary"
                    icon={<Icon icon={Pencil} />}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit()
                    }}
                  />
                </HStack>
              )}
            </VStack>
          )}
        </VStack>
      }
      endContent={
        <HStack gap={2} vAlign="center">
          {box !== undefined && <Meter box={box} title={level} />}
          {onStar && (
            <ToggleButton
              label={important ? '중요 표시 끄기' : '중요 표시'}
              isIconOnly
              size="sm"
              icon={<Icon icon={Star} color={important ? 'warning' : 'secondary'} />}
              isPressed={!!important}
              onPressedChange={() => onStar()}
            />
          )}
        </HStack>
      }
    />
  )
}
