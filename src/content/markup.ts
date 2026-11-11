export interface TagInfo {
  label: string
  color: string
  /** '뼈대' 에 포함되는지 */
  core: boolean
}

const BASE: Record<string, { label: string; color: string; core: boolean }> = {
  s: { label: '주어', color: 'var(--t-s)', core: true },
  v: { label: '동사', color: 'var(--t-v)', core: true },
  o: { label: '목적어', color: 'var(--t-o)', core: true },
  c: { label: '보어', color: 'var(--t-c)', core: true },
  mod: { label: '조동사', color: 'var(--t-mod)', core: true },
  prep: { label: '전치사', color: 'var(--t-prep)', core: false },
  conj: { label: '접속사', color: 'var(--t-conj)', core: false },
  rel: { label: '관계사', color: 'var(--t-rel)', core: false },
  n: { label: '명사', color: 'var(--t-n)', core: false },
  adj: { label: '형용사', color: 'var(--t-adj)', core: false },
  adv: { label: '부사', color: 'var(--t-adv)', core: false },
}

export const TAG_KEYS = Object.keys(BASE)

export function tagInfo(tag: string): TagInfo {
  const key = tag.toLowerCase()
  const b = BASE[key]
  if (!b) return { label: tag, color: 'var(--muted)', core: false }
  const isLower = tag === key && tag !== tag.toUpperCase()
  const inClause = isLower && b.core
  return {
    label: inClause ? `${b.label} (절 안)` : b.label,
    color: b.color,
    core: b.core && !isLower,
  }
}

export interface Token {
  text: string
  tag?: string
  note?: string
}

const RE = /\[([^\[\]|]+)\|([A-Za-z]+)(?:\|([^\[\]]+))?\]/g

export function parseMarkup(src: string): Token[] {
  const out: Token[] = []
  let last = 0
  for (const m of src.matchAll(RE)) {
    const i = m.index ?? 0
    if (i > last) out.push({ text: src.slice(last, i) })
    out.push({ text: m[1], tag: m[2], note: m[3] })
    last = i + m[0].length
  }
  if (last < src.length) out.push({ text: src.slice(last) })
  return out
}

export function plainText(src: string): string {
  return parseMarkup(src)
    .map((t) => t.text)
    .join('')
}

/** 탭 문제: 공백으로 나누되 *...* 는 한 덩어리 */
export function parseTap(src: string): { words: string[]; answer: number } {
  const words: string[] = []
  let answer = -1
  const re = /\*([^*]+)\*(\S*)|(\S+)/g
  for (const m of src.matchAll(re)) {
    if (m[1] !== undefined) {
      answer = words.length
      words.push(m[1] + (m[2] ?? ''))
    } else words.push(m[3])
  }
  return { words, answer }
}

export function tapPlain(src: string): string {
  return src.replace(/\*/g, '')
}
