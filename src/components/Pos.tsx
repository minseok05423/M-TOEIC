/**
 * 품사 표시. pos 는 '동사', '동사·명사' 처럼 쓰거나,
 * 뜻마다 품사가 다르면 ko 와 같은 순서로 ' / ' 로 나눠 씀:
 *   ko '그늘지게 하다 / 그늘, 블라인드', pos '동사 / 명사' → [동사] 그늘지게 하다  [명사] 그늘, 블라인드
 */
export const POS_LIST = ['동사', '명사', '형용사', '부사', '전치사', '접속사', '숙어'] as const

const split = (s: string) => s.split('/').map((x) => x.trim()).filter(Boolean)

export function PosTag({ pos }: { pos?: string }) {
  if (!pos) return null
  return <span className="pos">{split(pos).join('·')}</span>
}

/** 뜻 + 품사. 품사가 뜻마다 다르면 뜻 조각마다 붙여 줌 */
export function Meaning({ ko, pos }: { ko: string; pos?: string }) {
  if (!pos) return <>{ko}</>
  const ps = split(pos)
  const ks = split(ko)
  if (ps.length > 1 && ps.length === ks.length)
    return (
      <>
        {ks.map((k, i) => (
          <span key={i} className="pos-part">
            <span className="pos">{ps[i]}</span> {k}
          </span>
        ))}
      </>
    )
  return (
    <>
      <span className="pos">{ps.join('·')}</span> {ko}
    </>
  )
}

/** "(동) 들다", "[명사] 그늘", "동: 들다" 처럼 뜻 앞에 붙인 품사 표시를 떼어 냄 (여러 개 붙여넣기용) */
const SHORT: Record<string, string> = { 동: '동사', 명: '명사', 형: '형용사', 부: '부사', 전: '전치사', 접: '접속사', 숙: '숙어' }
export function takePos(ko: string): { ko: string; pos?: string } {
  const parts = ko.split('/').map((x) => x.trim())
  const found: string[] = []
  const rest = parts.map((p) => {
    const m = p.match(/^[([]\s*(동사?|명사?|형(?:용사)?|부사?|전(?:치사)?|접(?:속사)?|숙(?:어)?)\s*[)\]]\s*(.+)$/)
    if (!m) return p
    found.push(SHORT[m[1][0]])
    return m[2].trim()
  })
  if (!found.length) return { ko }
  const pos = found.length === parts.length && new Set(found).size > 1 ? found.join(' / ') : [...new Set(found)].join('·')
  return { ko: rest.join(' / '), pos }
}
