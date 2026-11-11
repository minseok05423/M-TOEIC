import { href } from '../lib/router.ts'

export function BottomNav({ active, due }: { active: string; due: number }) {
  const items = [
    { id: '', icon: '🏠', label: '홈' },
    { id: 'review', icon: '🔁', label: '복습', badge: due },
    { id: 'words', icon: '📒', label: '단어장' },
    { id: 'settings', icon: '⚙️', label: '설정' },
  ]
  return (
    <nav className="bottomnav">
      {items.map((it) => (
        <a key={it.id} href={it.id ? href(it.id) : '#/'} className={active === it.id ? 'on' : ''}>
          <span className="ico">
            {it.icon}
            {!!it.badge && <span className="badge">{it.badge > 99 ? '99+' : it.badge}</span>}
          </span>
          <span>{it.label}</span>
        </a>
      ))}
    </nav>
  )
}
