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
import { WordTest } from './screens/WordTest.tsx'
import { Part1 } from './screens/Part1.tsx'
import { Notes } from './screens/Notes.tsx'
import { StudentPage, TeacherHome } from './screens/Teacher.tsx'
import { isTeacher } from './lib/teacher.ts'
import { Settings } from './screens/Settings.tsx'
import { Login, SignUp } from './screens/Login.tsx'
import { LogoMark } from './components/Logo.tsx'

export function App() {
  const session = useSession()
  const skipLogin = useStore((s) => !!s.settings.skipLogin)
  const [page] = useRoute()
  const teacher = isTeacher(session)
  useEffect(() => {
    // 선생님 계정은 자기 학습 기록이 없으니 동기화하지 않음
    if (session && !teacher) startSync()
  }, [session, teacher])

  if (supabase && session === undefined)
    return (
      <div className="splash">
        <LogoMark />
      </div>
    )
  if (supabase && !session && !skipLogin) return page === 'signup' ? <SignUp /> : <Login />
  if (teacher) return <TeacherMain session={session ?? null} />
  return <Main session={session ?? null} />
}

/** 선생님: 학생 현황 · 학생 한 명 · 설정. 레슨 화면도 열어 볼 수 있어요 (미리 보기) */
function TeacherMain({ session }: { session: Session | null }) {
  const [a, b, c, d, e] = useRoute()
  let screen: React.ReactNode
  if (a === 't' && b) screen = <StudentPage key={b} id={b} />
  else if (a === 'settings') screen = <Settings session={session} />
  else if (a === 'l' && b && c) screen = <Lesson key={`${b}/${c}/${d ?? ''}/${e ?? ''}`} chapterId={b} lessonId={c} stage={d} sub={e} />
  else screen = <TeacherHome />
  return (
    <div className="app has-nav">
      <main>{screen}</main>
      <BottomNav active={a === 'settings' ? 'settings' : ''} due={0} teacher />
    </div>
  )
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
  else if (a === 'test') screen = <WordTest />
  else if (a === 'part1') screen = <Part1 />
  else if (a === 'notes') screen = <Notes />
  else if (a === 'words' && b === 'new') screen = <WordForm key="new" />
  else if (a === 'words' && b === 'bulk') screen = <BulkAdd />
  else if (a === 'words' && b === 'edit' && c) screen = <WordForm key={c} id={c} />
  else if (a === 'words' && b === 'cards' && c) screen = <Cards key={route.join('/')} deck={c} />
  else if (a === 'words') screen = <Words view={b === 'lesson' ? 'lesson' : 'mine'} />
  else if (a === 'settings') screen = <Settings session={session} />
  else screen = <Home due={due} />

  const active = a === 'test' || a === 'part1' ? 'review' : a === 'review' || a === 'words' || a === 'settings' ? a : a === 'l' ? 'l' : ''
  return (
    <div className="app has-nav">
      <main>{screen}</main>
      <BottomNav active={active} due={due} />
    </div>
  )
}
