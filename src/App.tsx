import { useEffect, useMemo } from 'react'
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

export function App() {
  const session = useSession()
  useEffect(() => {
    if (session) startSync()
  }, [session])

  if (supabase && session === undefined) return <div className="splash">M-TOEIC</div>
  if (supabase && !session) return <Login />
  return <Main session={session ?? null} />
}

function Main({ session }: { session: import('@supabase/supabase-js').Session | null }) {
  const route = useRoute()
  const srs = useStore((s) => s.progress.srs)
  const words = useStore((s) => s.words)
  const due = useMemo(() => dueWords(srs, allWords(words)).length, [srs, words])

  const [a, b, c, d] = route
  let screen: React.ReactNode
  let nav = true
  if (!a) screen = <Home due={due} />
  else if (a === 'l' && b && c && d === 'cards') {
    screen = <Cards key={route.join('/')} chapterId={b} lessonId={c} />
    nav = false
  } else if (a === 'l' && b && c) screen = <Lesson chapterId={b} lessonId={c} tab={d} />
  else if (a === 'review') screen = <Review />
  else if (a === 'words' && b === 'new') screen = <WordForm key="new" />
  else if (a === 'words' && b === 'bulk') screen = <BulkAdd />
  else if (a === 'words' && b === 'edit' && c) screen = <WordForm key={c} id={c} />
  else if (a === 'words' && b === 'cards' && c) {
    screen = <Cards key={route.join('/')} deck={c} />
    nav = false
  } else if (a === 'words') screen = <Words view={b === 'lesson' ? 'lesson' : 'mine'} />
  else if (a === 'settings') screen = <Settings session={session} />
  else screen = <Home due={due} />

  const active = a === 'l' ? '' : a === 'review' || a === 'words' || a === 'settings' ? a : ''
  return (
    <div className={`app ${nav ? 'has-nav' : ''}`}>
      <main>{screen}</main>
      {nav && <BottomNav active={active} due={due} />}
    </div>
  )
}
