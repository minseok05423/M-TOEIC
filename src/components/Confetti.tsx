import type { CSSProperties } from 'react'

const COLORS = ['var(--hl)', 'var(--red)', 'var(--green)', 'var(--blue)', 'var(--ink)']

export function Confetti() {
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 34 }, (_, i) => (
        <i
          key={i}
          style={
            {
              left: `${(i * 29) % 100}%`,
              background: COLORS[i % COLORS.length],
              animationDelay: `${(i % 9) * 0.07}s`,
              transform: `rotate(${i * 47}deg)`,
              width: i % 3 ? 9 : 6,
              height: i % 2 ? 4 : 10,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
