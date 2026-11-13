/**
 * Supabase 설정 점검. `npm run check-supabase`
 * .env.local (또는 .env) 의 URL·키로 서버에 접속해서, 앱이 동기화에 쓰는 것들이 준비됐는지 확인합니다.
 * 키는 화면에 출력하지 않아요.
 */
import { existsSync } from 'node:fs'

for (const f of ['.env.local', '.env']) if (existsSync(f)) process.loadEnvFile(f)

const url = process.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

let problems = 0
const ok = (m: string) => console.log(`✓ ${m}`)
const bad = (m: string, fix: string) => {
  problems++
  console.log(`✗ ${m}\n    → ${fix}`)
}
const note = (m: string, fix: string) => console.log(`△ ${m}\n    → ${fix}`)

if (!url || !key) {
  console.log('Supabase 가 설정되지 않았어요 (.env.local 에 VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY).')
  console.log('이 상태에서도 앱은 "이 기기에만 저장" 모드로 동작해요.')
  process.exit(0)
}
if (/service_role|sb_secret_/.test(key)) bad('비밀(secret/service_role) 키를 쓰고 있어요', 'publishable(sb_publishable_…) 또는 anon 키로 바꾸세요. 비밀 키는 앱에 넣으면 안 돼요.')

const headers = { apikey: key, Authorization: `Bearer ${key}` }

try {
  const r = await fetch(`${url}/auth/v1/settings`, { headers })
  if (!r.ok) bad(`인증 서버 응답 ${r.status}`, 'URL 과 키가 같은 프로젝트의 것인지 확인하세요 (Connect → App Frameworks).')
  else {
    ok('URL · 키로 접속됨')
    const s = (await r.json()) as { disable_signup?: boolean; external?: { email?: boolean } }
    if (!s.external?.email) bad('이메일 로그인이 꺼져 있어요', 'Authentication → Sign In / Providers → Email 을 켜세요.')
    if (!s.disable_signup)
      note('누구나 회원가입할 수 있는 상태예요 (데이터는 RLS 로 보호되지만)', 'Authentication → Sign In / Providers → "Allow new users to sign up" 을 끄세요.')
    else ok('회원가입 막힘 (만든 계정만 로그인 가능)')
  }
} catch (e) {
  bad(`접속 실패: ${(e as Error).message}`, 'VITE_SUPABASE_URL 이 맞는지, 인터넷이 되는지 확인하세요.')
}

for (const table of ['progress', 'custom_words', 'lesson_notes', 'user_chapters', 'word_tests']) {
  try {
    const r = await fetch(`${url}/rest/v1/${table}?select=*&limit=0`, { headers })
    const body = (await r.json().catch(() => ({}))) as { code?: string; message?: string }
    // 이 점검은 로그인 없이(anon) 요청하므로, schema.sql 대로라면 "권한 없음(42501)" 이 정상이에요.
    if (body.code === '42501') ok(`표 public.${table} 있음 (로그인 전에는 막혀 있음)`)
    else if (r.ok)
      note(`표 public.${table} 있음, 그런데 로그인 없이도 접근돼요 (RLS 로 내용은 안 보이지만)`, 'supabase/schema.sql 을 다시 Run 하세요 (anon 권한 회수 부분).')
    else if (body.code === 'PGRST205' || body.code === '42P01')
      bad(`표 public.${table} 이 없어요 (${body.code})`, 'Supabase → SQL Editor 에 supabase/schema.sql 전체를 붙여넣고 Run 하세요.')
    else bad(`표 public.${table} 확인 실패 ${r.status}: ${body.message ?? ''}`, 'Supabase 대시보드에서 프로젝트 상태를 확인하세요.')
  } catch (e) {
    bad(`표 public.${table} 확인 실패: ${(e as Error).message}`, '인터넷 연결을 확인하세요.')
  }
}

console.log(problems ? `\n고칠 것 ${problems}개` : '\n모두 준비됐어요. 학생 계정은 Authentication → Users 에서 만드세요.')
process.exit(problems ? 1 : 0)
