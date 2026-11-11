import type { ReactNode } from 'react'

/** **굵게** 처리 */
export function Inline({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return <>{parts.map((p, i) => (i % 2 ? <strong key={i}>{p}</strong> : p))}</>
}

/** 줄바꿈 = 문단, '- ' = 글머리표 */
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
    if (line.startsWith('- ')) bullets.push(line.slice(2))
    else {
      flush()
      if (line.trim())
        out.push(
          <p key={out.length}>
            <Inline text={line} />
          </p>,
        )
    }
  }
  flush()
  return <div className="rich">{out}</div>
}
