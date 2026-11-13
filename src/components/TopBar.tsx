import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'

/**
 * back 이 있으면 위에 붙는 작은 앱바 (하위 화면),
 * 없으면 큰 제목 (탭 화면).
 */
export function TopBar({
  title,
  back,
  right,
  children,
}: {
  title: ReactNode
  back?: string
  right?: ReactNode
  children?: ReactNode
}) {
  if (!back)
    return (
      <header className="large-title">
        <h1>{title}</h1>
        {right}
      </header>
    )
  return (
    <header className="appbar">
      <div className="appbar-row">
        <a className="back" href={back} aria-label="뒤로">
          <ChevronLeft size={28} strokeWidth={2.2} />
        </a>
        <h1>{title}</h1>
        <div className="appbar-side">{right}</div>
      </div>
      {children}
    </header>
  )
}
