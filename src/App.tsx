import { lazy, Suspense, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Theme } from '@astryxdesign/core/theme'
import { InternationalizationProvider } from '@astryxdesign/core/i18n'
import koKR from '@astryxdesign/core/locales/ko-KR.generated.js'
import { AppShell } from '@astryxdesign/core/AppShell'
import { Center } from '@astryxdesign/core/Center'
import { Spinner } from '@astryxdesign/core/Spinner'
import { themes, defaultThemeSlug } from './astryx-themes.ts'
import { useRoute } from './lib/router.ts'
import { supabase, useSession } from './lib/supabase.ts'
import { startSync } from './lib/sync.ts'
import { useStore } from './lib/store.ts'
import { isTeacher, setTeacherMode } from './lib/teacher.ts'
import { Home } from './screens/Home.tsx'

// 홈 말고 다른 화면은 열 때 불러와요 (첫 화면을 빨리 띄우려고). 서비스 워커가 한 번 받은 뒤로는 오프라인에서도 열려요
const Lesson = lazy(() => import('./screens/Lesson.tsx').then((m) => ({ default: m.Lesson })))
const Cards = lazy(() => import('./screens/Cards.tsx').then((m) => ({ default: m.Cards })))
const Review = lazy(() => import('./screens/Review.tsx').then((m) => ({ default: m.Review })))
const Words = lazy(() => import('./screens/Words.tsx').then((m) => ({ default: m.Words })))
const WordForm = lazy(() => import('./screens/WordForm.tsx').then((m) => ({ default: m.WordForm })))
const BulkAdd = lazy(() => import('./screens/BulkAdd.tsx').then((m) => ({ default: m.BulkAdd })))
const WordTest = lazy(() => import('./screens/WordTest.tsx').then((m) => ({ default: m.WordTest })))
const Part1 = lazy(() => import('./screens/Part1.tsx').then((m) => ({ default: m.Part1 })))
const Settings = lazy(() => import('./screens/Settings.tsx').then((m) => ({ default: m.Settings })))
const Login = lazy(() => import('./screens/Login.tsx').then((m) => ({ default: m.Login })))
const TeacherHome = lazy(() => import('./screens/Teacher.tsx').then((m) => ({ default: m.TeacherHome })))
const StudentPage = lazy(() => import('./screens/Teacher.tsx').then((m) => ({ default: m.StudentPage })))
const SignUp = lazy(() => import('./screens/Login.tsx').then((m) => ({ default: m.SignUp })))

function Loading() {
  return (
    <Center height="100%">
      <Spinner size="xl" />
    </Center>
  )
}

/** 테마(themes/notebook) + 한국어 + 앱 틀. 밝은/어두운 모드는 휴대폰 설정을 따라가요 */
export function Root() {
  return (
    <InternationalizationProvider locale="ko-KR" messages={{ 'ko-KR': koKR }}>
      <Theme theme={themes[defaultThemeSlug]} mode="system">
        <AppShell height="fill" variant="wash" contentPadding={0}>
          <Suspense fallback={<Loading />}>
            <App />
          </Suspense>
        </AppShell>
      </Theme>
    </InternationalizationProvider>
  )
}

function App() {
  const session = useSession()
  const skipLogin = useStore((s) => !!s.settings.skipLogin)
  const [page] = useRoute()
  const teacher = isTeacher(session)
  // 탭바가 선생님 탭을 보여 주도록 (Screen.tsx). 렌더 중에 정해야 첫 화면부터 맞음
  setTeacherMode(teacher)
  useEffect(() => {
    // 선생님 계정은 자기 학습 기록이 없으니 동기화하지 않음
    if (session && !teacher) startSync()
  }, [session, teacher])

  if (supabase && session === undefined) return <Loading />
  if (supabase && !session && !skipLogin) return page === 'signup' ? <SignUp /> : <Login />
  if (teacher) return <TeacherMain session={session ?? null} />
  return <Main session={session ?? null} />
}

/** 선생님: 학생 현황 · 학생 한 명 · 설정. 레슨 화면도 열어 볼 수 있어요 (미리 보기) */
function TeacherMain({ session }: { session: Session | null }) {
  const [a, b, c, d, e] = useRoute()
  if (a === 't' && b) return <StudentPage key={b} id={b} />
  if (a === 'settings') return <Settings session={session} />
  if (a === 'l' && b && c) return <Lesson key={`${b}/${c}/${d ?? ''}/${e ?? ''}`} chapterId={b} lessonId={c} stage={d} sub={e} />
  return <TeacherHome />
}

function Main({ session }: { session: Session | null }) {
  const [a, b, c, d, e] = useRoute()
  if (!a) return <Home />
  if (a === 'l' && b && c) return <Lesson key={`${b}/${c}/${d ?? ''}/${e ?? ''}`} chapterId={b} lessonId={c} stage={d} sub={e} />
  if (a === 'review') return <Review />
  if (a === 'test') return <WordTest />
  if (a === 'part1') return <Part1 />
  if (a === 'words' && b === 'new') return <WordForm key="new" />
  if (a === 'words' && b === 'bulk') return <BulkAdd />
  if (a === 'words' && b === 'edit' && c) return <WordForm key={c} id={c} />
  if (a === 'words' && b === 'cards' && c) return <Cards key={c} deck={c} />
  if (a === 'words') return <Words view={b === 'lesson' ? 'lesson' : 'mine'} />
  if (a === 'settings') return <Settings session={session} />
  return <Home />
}
