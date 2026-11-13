import type { ReactNode } from 'react'
import { Star } from 'lucide-react'
import { Confetti } from './Confetti.tsx'

/** 한 판 끝난 화면: 별 + 한 줄 + 숫자 몇 개 + 버튼 */
export function GameDone({
  stars,
  title,
  line,
  stats,
  children,
}: {
  stars: number
  title: string
  line: string
  stats: { label: string; value: ReactNode }[]
  children?: ReactNode
}) {
  return (
    <div className="game-done">
      {stars === 3 && <Confetti />}
      <div className="done-stars" aria-label={`별 ${stars}개`}>
        {[0, 1, 2].map((i) => (
          <Star key={i} className={i < stars ? 'on' : ''} size={i === 1 ? 54 : 42} strokeWidth={1.8} style={{ animationDelay: `${0.15 + i * 0.18}s` }} />
        ))}
      </div>
      <h2>{title}</h2>
      <p className="done-line">{line}</p>
      <dl className="done-stats">
        {stats.map((s) => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
      <div className="done-actions">{children}</div>
    </div>
  )
}
