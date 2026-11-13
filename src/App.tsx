import { useEffect, useMemo } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useRoute } from './lib/router.ts'
import { supabase, useSession } from './lib/supabase.ts'
import { startSync } from './lib/sync.ts'
import { useStore } from './lib/store.ts'
import { allWords } from './lib/words.ts'
import { BottomNav } from './components/BottomNav.tsx'
import { Home } from './screens/Home.tsx'
import { Lesson } from './screens/Lesson.tsx'
import { Cards } from './screens/Cards.tsx'
import { Review, dueWords } from './screens/Review.tsx'
import { Words } from './screens/Words.tsx'
import { WordForm } from './screens/WordForm.tsx'
import { BulkAdd } from './screens/BulkAdd.tsx'
import { Settings } from './screens/Settings.tsx'
import { Login } from './screens/Login.tsx'
import { LogoMark } from './components/Logo.tsx'

export function App() {
  const session = useSession()
  const skipLogin = useStore((s) => !!s.settings.skipLogin)
  useEffect(() => {
    if (session) startSync()
  }, [session])

  if (supabase && session === undefined)
    return (
      <div className="splash">
        <LogoMark />
      </div>
    )
  if (supabase && !session && !skipLogin) return <Login />
  return <Main session={session ?? null} />
}

function Main({ session }: { session: Session | null }) {
  const route = useRoute()
  const srs = useStore((s) => s.progress.srs)
  const words = useStore((s) => s.words)
  const userChapters = useStore((s) => s.userChapters)
  const due = useMemo(() => dueWords(srs, allWords(words)).length, [srs, words, userChapters])

  const [a, b, c, d, e] = route
  let screen: React.ReactNode
  if (!a) screen = <Home due={due} />
  else if (a === 'l' && b && c) screen = <Lesson key={`${b}/${c}/${d ?? ''}/${e ?? ''}`} chapterId={b} lessonId={c} stage={d} sub={e} />
  else if (a === 'review') screen = <Review />
  else if (a === 'words' && b === 'new') screen = <WordForm key="new" />
  else if (a === 'words' && b === 'bulk') screen = <BulkAdd />
  else if (a === 'words' && b === 'edit' && c) screen = <WordForm key={c} id={c} />
  else if (a === 'words' && b === 'cards' && c) screen = <Cards key={route.join('/')} deck={c} />
  else if (a === 'words') screen = <Words view={b === 'lesson' ? 'lesson' : 'mine'} />
  else if (a === 'settings') screen = <Settings session={session} />
  else screen = <Home due={due} />

  const active = a === 'review' || a === 'words' || a === 'settings' ? a : a === 'l' ? 'l' : ''
  return (
    <div className="app has-nav">
      <main>{screen}</main>
      <BottomNav active={active} due={due} />
    </div>
  )
}
