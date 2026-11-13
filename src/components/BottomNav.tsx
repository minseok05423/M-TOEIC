import { BookOpen, House, RotateCcw, Settings, type LucideIcon } from 'lucide-react'
import { href } from '../lib/router.ts'

const ITEMS: { id: string; icon: LucideIcon; label: string }[] = [
  { id: '', icon: House, label: '홈' },
  { id: 'review', icon: RotateCcw, label: '복습' },
  { id: 'words', icon: BookOpen, label: '단어장' },
  { id: 'settings', icon: Settings, label: '설정' },
]

export function BottomNav({ active, due }: { active: string; due: number }) {
  return (
    <nav className="bottomnav">
      {ITEMS.map(({ id, icon: Icon, label }) => {
        const on = active === id
        return (
          <a key={id} href={id ? href(id) : '#/'} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>
            <span className="nav-ico">
              <Icon size={24} strokeWidth={on ? 2.3 : 1.8} />
              {id === 'review' && due > 0 && <span className="badge">{due > 99 ? '99+' : due}</span>}
            </span>
            <span>{label}</span>
          </a>
        )
      })}
    </nav>
  )
}
