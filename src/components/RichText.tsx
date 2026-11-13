import type { ReactNode } from 'react'
import { Lightbulb, TriangleAlert } from 'lucide-react'

/** **굵게** 처리 */
export function Inline({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return <>{parts.map((p, i) => (i % 2 ? <strong key={i}>{p}</strong> : p))}</>
}

/** 콘텐츠에서 줄 앞에 쓰는 💡 / ⚠️ 표시 → 아이콘이 있는 박스로 */
const CALLOUT = /^\s*(💡|⚠️?)\s*/u

/** 줄바꿈 = 문단, '- ' = 글머리표, '💡 …' = 팁, '⚠️ …' = 주의 */
export function RichText({ text }: { text: string }) {
  const out: ReactNode[] = []
  let bullets: string[] = []
  const flush = () => {
    if (bullets.length)
      out.push(
        <ul key={out.length}>
          {bullets.map((b, i) => (
            <li key={i}>
              <Inline text={b} />
            </li>
          ))}
        </ul>,
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
        <div key={out.length} className={`callout ${warn ? 'warn' : ''}`}>
          {warn ? <TriangleAlert size={16} /> : <Lightbulb size={16} />}
          <span>
            <Inline text={line.slice(m[0].length)} />
          </span>
        </div>,
      )
    } else
      out.push(
        <p key={out.length}>
          <Inline text={line} />
        </p>,
      )
  }
  flush()
  return <div className="rich">{out}</div>
}
