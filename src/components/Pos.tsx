import { Token } from '@astryxdesign/core/Token'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
/**
 * 품사 표시. pos 는 '동사', '동사·명사' 처럼 쓰거나,
 * 뜻마다 품사가 다르면 ko 와 같은 순서로 ' / ' 로 나눠 씀:
 *   ko '그늘지게 하다 / 그늘, 블라인드', pos '동사 / 명사' → [동사] 그늘지게 하다  [명사] 그늘, 블라인드
 */
export const POS_LIST = ['동사', '명사', '형용사', '부사', '전치사', '접속사', '숙어'] as const

const split = (s: string) => s.split('/').map((x) => x.trim()).filter(Boolean)

/** 품사 꼬리표 */
export function PosTag({ pos }: { pos?: string }) {
  if (!pos) return null
  return <Token label={split(pos).join('·')} size="sm" color="gray" />
}

/** 뜻 + 품사. 품사가 뜻마다 다르면 뜻 조각마다 붙여 줌 */
export function Meaning({ ko, pos }: { ko: string; pos?: string }) {
  if (!pos) return <>{ko}</>
  const ps = split(pos)
  const ks = split(ko)
  const parts = ps.length > 1 && ps.length === ks.length ? ks.map((k, i) => [ps[i], k] as const) : [[ps.join('·'), ko] as const]
  return (
    <HStack as="span" gap={1} vAlign="center" wrap="wrap">
      {parts.map(([p, k], i) => (
        <HStack as="span" key={i} gap={1} vAlign="center">
          <Token label={p} size="sm" color="gray" />
          <Text type="inherit">{k}</Text>
        </HStack>
      ))}
    </HStack>
  )
}
