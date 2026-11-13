/**
 * 선생님용 도구 (Claude Code 세션에서 씀). `npm run teacher -- <명령>`
 *
 *   notes [--all] [--user 이메일]     학생 메모 보기 (기본: 아직 반영 안 한 것). 메모가 가리키는 레슨 내용도 같이 출력
 *   push personal/<파일>.ts           맞춤 챕터를 검사한 뒤 그 학생에게 올리고, meta.notes 의 메모를 '반영됨' 으로
 *   done <메모id> [...] [--reply 말]  레슨 없이 메모만 반영 표시 (답장만 할 때)
 *   chapters [--user 이메일]          올라가 있는 맞춤 챕터 목록
 *   pull <챕터id> [--user 이메일]     서버의 맞춤 챕터를 personal/<챕터id>.ts 로 내려받기 (파일을 잃어버렸을 때)
 *   rm <챕터id> [--user 이메일]       맞춤 챕터 내리기 (학생 화면에서 사라짐. 학습 기록은 남음)
 *   users                             학생 계정과 메모 수
 *
 * .env.local 에 SUPABASE_SECRET_KEY (대시보드 → Project Settings → API Keys → Secret key) 가 있어야 해요.
 * 이 키는 RLS 를 건너뛰는 관리자 키라서 VITE_ 를 붙이면 안 되고(앱에 들어감), 화면에도 출력하지 않아요.
 */
import { existsSync, writeFileSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createClient, type User } from '@supabase/supabase-js'
import { CHAPTERS } from '../src/content/chapters/index.ts'
import { validateChapters } from '../src/content/validate.ts'
import { plainText, tapPlain } from '../src/content/markup.ts'
import type { Chapter, Lesson, PersonalMeta } from '../src/content/types.ts'

for (const f of ['.env.local', '.env']) if (existsSync(f)) process.loadEnvFile(f)
const url = process.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

function die(msg: string): never {
  console.error(`✗ ${msg}`)
  process.exit(1)
}
if (!url) die('.env.local 에 VITE_SUPABASE_URL 이 없어요')
if (!secret) die('.env.local 에 SUPABASE_SECRET_KEY 가 없어요 (대시보드 → Project Settings → API Keys → Secret key 를 복사해서 넣으세요)')
if (/^sb_publishable_/.test(secret)) die('SUPABASE_SECRET_KEY 에 publishable 키가 들어 있어요. Secret key(sb_secret_…) 를 넣으세요')

const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })

// ───────── 인자 ─────────
const [cmd, ...rest] = process.argv.slice(2)
const flags = new Map<string, string | true>()
const args: string[] = []
for (let i = 0; i < rest.length; i++) {
  const a = rest[i]
  if (a.startsWith('--')) {
    const v = rest[i + 1]
    if (v !== undefined && !v.startsWith('--')) {
      flags.set(a.slice(2), v)
      i++
    } else flags.set(a.slice(2), true)
  } else args.push(a)
}
const flag = (k: string) => (typeof flags.get(k) === 'string' ? (flags.get(k) as string) : undefined)

// ───────── 학생 ─────────
async function allUsers(): Promise<User[]> {
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 })
  if (error) die(`학생 목록을 못 가져옴: ${error.message}`)
  return data.users
}

/** --user 가 없고 학생이 한 명뿐이면 그 학생 */
async function pickUser(email = flag('user')): Promise<User> {
  const users = await allUsers()
  if (email) {
    const u = users.find((x) => x.email?.toLowerCase() === email.toLowerCase())
    if (!u) die(`학생 "${email}" 이 없어요. 있는 계정: ${users.map((x) => x.email).join(', ') || '(없음)'}`)
    return u
  }
  if (users.length === 1) return users[0]
  if (!users.length) die('학생 계정이 없어요 (Authentication → Users → Add user)')
  die(`학생이 여러 명이에요. --user 이메일 을 붙이세요: ${users.map((x) => x.email).join(', ')}`)
}

// ───────── 레슨 내용 찾기 (메모가 가리키는 곳을 같이 보여 주려고) ─────────
async function chaptersFor(userId: string): Promise<Chapter[]> {
  const { data, error } = await db.from('user_chapters').select('chapter').eq('user_id', userId)
  if (error) die(error.message)
  const mine = (data ?? []).map((r) => r.chapter as Chapter)
  return [...CHAPTERS.filter((c) => !mine.some((m) => m.id === c.id)), ...mine]
}

function describeTarget(lesson: Lesson, targetId: string | null): string[] {
  if (!targetId) return [`레슨 요약: ${lesson.summary}`, `설명 제목: ${lesson.sections.map((s) => s.heading).join(' / ')}`]
  const [stage, ...idParts] = targetId.split(':')
  const id = idParts.join(':')
  if (stage === 'learn') {
    const s = lesson.sections[Number(id.slice(1))]
    return s ? [`설명 "${s.heading}":`, ...s.body.split('\n').map((l) => `  ${l}`), ...(s.examples ?? []).map((e) => `  예) ${e.en} = ${e.ko}`)] : []
  }
  if (stage === 'words') {
    const w = lesson.words.find((x) => `w:${(x.id ?? x.en).toLowerCase()}` === id)
    return w ? [`단어 ${w.en} = ${w.ko}${w.tip ? ` (팁: ${w.tip})` : ''}${w.ex ? ` · 예) ${w.ex.en} = ${w.ex.ko}` : ''}`] : []
  }
  if (stage === 'sentences') {
    const s = lesson.sentences.find((x) => x.id === id)
    return s ? [`문장 ${s.id}: ${plainText(s.text)}`, `  마크업: ${s.text}`, `  해석: ${s.ko}`, ...(s.note ? [`  노트: ${s.note}`] : [])] : []
  }
  if (stage === 'quiz') {
    const q = lesson.quiz.find((x) => x.id === id)
    if (!q) return []
    if (q.type === 'mc')
      return [`퀴즈 ${q.id}: ${q.q.replace(/\n/g, ' / ')}`, `  보기: ${q.choices.map((c, i) => `${'ABCDE'[i]}) ${c}${i === q.answer ? ' ✓' : ''}`).join('  ')}`, `  해설: ${q.explain}`]
    return [`퀴즈 ${q.id} (탭): ${q.prompt}`, `  문장: ${tapPlain(q.text)} (정답: ${q.text.match(/\*([^*]+)\*/)?.[1]})`, `  해설: ${q.explain}`]
  }
  return []
}

const CAT: Record<string, string> = { meaning: '뜻', structure: '문장 구조', grammar: '문법 규칙', answer: '왜 정답?', other: '기타' }
const LEVEL: Record<number, string> = { 1: '조금', 2: '꽤', 3: '전혀 모르겠음' }

// ───────── 명령 ─────────
async function notes() {
  const users = await allUsers()
  const only = flag('user') ? [await pickUser()] : users
  let q = db.from('lesson_notes').select('*').order('created_at')
  if (!flags.has('all')) q = q.eq('status', 'new')
  if (flag('user')) q = q.eq('user_id', only[0].id)
  const { data, error } = await q
  if (error) die(error.message)
  if (!data.length) return console.log(flags.has('all') ? '메모가 없어요.' : '새 메모가 없어요. (반영한 것까지 보려면 --all)')

  for (const u of only) {
    const mine = data.filter((n) => n.user_id === u.id)
    if (!mine.length) continue
    const chapters = await chaptersFor(u.id)
    console.log(`\n# 학생 ${u.email} — 메모 ${mine.length}개\n`)
    for (const n of mine) {
      const ch = chapters.find((c) => c.id === n.chapter_id)
      const lesson = ch?.lessons.find((l) => l.id === n.lesson_id)
      console.log(`## [${n.kind === 'important' ? '중요한 점' : '헷갈리는 점'}] ${n.lesson_title} (${n.chapter_id}/${n.lesson_id})`)
      console.log(`- id: ${n.id}`)
      console.log(`- 날짜: ${n.created_at.slice(0, 16).replace('T', ' ')} · 상태: ${n.status}${n.reply ? ` · 답장: ${n.reply}` : ''}`)
      console.log(`- 위치: ${n.stage}${n.target_id ? ` · ${n.target_id} (${n.target_label})` : ' · 레슨 전체'}`)
      if (n.kind === 'confusing') {
        console.log(`- 막힌 곳: ${CAT[n.category] ?? n.category} · 정도: ${LEVEL[n.level] ?? n.level}`)
        console.log(`- 학생이 이해한 것: ${n.point}`)
        console.log(`- 헷갈리는 것: ${n.question}`)
      } else console.log(`- 학생 정리: ${n.point}`)
      if (n.example) console.log(`- 학생이 적은 문장: ${n.example}`)
      if (lesson) {
        console.log('- 지금 레슨 내용:')
        for (const l of describeTarget(lesson, n.target_id)) console.log(`    ${l}`)
      } else console.log('- (이 레슨을 지금 콘텐츠에서 찾을 수 없음: 지워졌거나 id 가 바뀜)')
      console.log()
    }
  }
}

async function push() {
  const file = args[0] ?? die('올릴 파일을 주세요: npm run teacher -- push personal/<파일>.ts')
  const path = resolve(file)
  if (!existsSync(path)) die(`파일 없음: ${file}`)
  const mod = (await import(pathToFileURL(path).href)) as { chapter?: Chapter; meta?: PersonalMeta }
  if (!mod.chapter) die(`${file} 에 'export const chapter' 가 없어요`)
  if (!mod.meta?.user) die(`${file} 에 'export const meta = { user: "학생 이메일", notes: {...} }' 가 없어요`)

  const chapter = JSON.parse(JSON.stringify(mod.chapter)) as Chapter
  const { errors, warnings, counts } = validateChapters([chapter])
  for (const w of warnings) console.log(w)
  if (errors.length) {
    for (const e of errors) console.log(e)
    die(`검사 실패 ${errors.length}개 — 고친 뒤 다시 올리세요 (아무것도 안 올라감)`)
  }

  const user = await pickUser(mod.meta.user)
  const noteIds = Object.keys(mod.meta.notes ?? {})
  if (noteIds.length) {
    const { data, error } = await db.from('lesson_notes').select('id').eq('user_id', user.id).in('id', noteIds)
    if (error) die(error.message)
    const missing = noteIds.filter((id) => !data.some((r) => r.id === id))
    if (missing.length) die(`이 학생의 메모가 아닌 id: ${missing.join(', ')}`)
  }

  const prev = await db.from('user_chapters').select('note_ids').eq('user_id', user.id).eq('id', chapter.id).maybeSingle()
  if (prev.error) die(prev.error.message)
  const allNotes = [...new Set([...((prev.data?.note_ids as string[] | undefined) ?? []), ...noteIds])]
  const { error } = await db
    .from('user_chapters')
    .upsert({ user_id: user.id, id: chapter.id, chapter, note_ids: allNotes, updated_at: new Date().toISOString() })
  if (error) die(error.message)

  await markDone(user.id, mod.meta.notes ?? {})
  const overrides = CHAPTERS.some((c) => c.id === chapter.id)
  console.log(
    `✓ ${user.email} 에게 "${chapter.title}" ${prev.data ? '업데이트' : '올림'} (레슨 ${counts.lessons} · 단어 ${counts.words} · 문장 ${counts.sentences} · 퀴즈 ${counts.quiz})` +
      (overrides ? `\n  이 학생에게는 기본 챕터 ${chapter.id} 대신 이 챕터가 보여요` : '') +
      (noteIds.length ? `\n  메모 ${noteIds.length}개 반영 표시` : '') +
      '\n  학생 앱은 다음에 열 때(또는 설정 → 지금 동기화) 받아요.',
  )
}

async function markDone(userId: string, replies: Record<string, string>) {
  for (const [id, reply] of Object.entries(replies)) {
    const { error } = await db
      .from('lesson_notes')
      .update({ status: 'done', reply: reply.trim() || null, handled_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('id', id)
    if (error) die(`메모 ${id}: ${error.message}`)
  }
}

async function done() {
  if (!args.length) die('반영 표시할 메모 id 를 주세요')
  const { data, error } = await db.from('lesson_notes').select('id, user_id').in('id', args)
  if (error) die(error.message)
  const missing = args.filter((id) => !data.some((r) => r.id === id))
  if (missing.length) die(`없는 메모 id: ${missing.join(', ')}`)
  for (const r of data) await markDone(r.user_id, { [r.id]: flag('reply') ?? '' })
  console.log(`✓ 메모 ${data.length}개 반영 표시${flag('reply') ? ' (답장 포함)' : ''}`)
}

async function chapters() {
  const user = await pickUser()
  const { data, error } = await db.from('user_chapters').select('id, chapter, note_ids, updated_at').eq('user_id', user.id).order('id')
  if (error) die(error.message)
  if (!data.length) return console.log(`${user.email} 에게 올린 맞춤 챕터가 없어요.`)
  console.log(`${user.email} 의 맞춤 챕터:`)
  for (const r of data) {
    const c = r.chapter as Chapter
    const local = existsSync(resolve('personal', `${r.id}.ts`)) ? '' : '  (personal/ 에 원본 파일 없음 → pull 로 받기)'
    const over = CHAPTERS.some((b) => b.id === r.id) ? ' [기본 챕터 덮어씀]' : ''
    console.log(`- ${r.id}${over}: ${c.title} · 레슨 ${c.lessons.length} · 메모 ${(r.note_ids as string[]).length} · ${String(r.updated_at).slice(0, 16)}${local}`)
  }
}

async function pull() {
  const id = args[0] ?? die('챕터 id 를 주세요')
  const user = await pickUser()
  const { data, error } = await db.from('user_chapters').select('chapter, note_ids').eq('user_id', user.id).eq('id', id).maybeSingle()
  if (error) die(error.message)
  if (!data) die(`${user.email} 에게 ${id} 챕터가 없어요`)
  const out = resolve('personal', `${id}.ts`)
  if (existsSync(out) && !flags.has('force')) die(`${basename(out)} 이 이미 있어요. 덮어쓰려면 --force`)
  const meta: PersonalMeta = { user: user.email!, notes: {} }
  writeFileSync(
    out,
    `// 서버에서 내려받은 맞춤 챕터 (${new Date().toISOString().slice(0, 10)}). 이미 반영한 메모: ${(data.note_ids as string[]).join(', ') || '없음'}\n` +
      `import type { Chapter, PersonalMeta } from '../src/content/types.ts'\n\n` +
      `export const meta: PersonalMeta = ${JSON.stringify(meta, null, 2)}\n\n` +
      `export const chapter: Chapter = ${JSON.stringify(data.chapter, null, 2)}\n`,
  )
  console.log(`✓ personal/${basename(out)} 에 저장`)
}

async function rm() {
  const id = args[0] ?? die('챕터 id 를 주세요')
  const user = await pickUser()
  const { data, error } = await db.from('user_chapters').delete().eq('user_id', user.id).eq('id', id).select('id')
  if (error) die(error.message)
  console.log(data.length ? `✓ ${user.email} 에게서 ${id} 를 내렸어요` : `${id} 는 원래 없었어요`)
}

async function users() {
  const list = await allUsers()
  const { data, error } = await db.from('lesson_notes').select('user_id, status')
  if (error) die(error.message)
  if (!list.length) return console.log('학생 계정이 없어요 (Authentication → Users → Add user)')
  for (const u of list) {
    const mine = data.filter((n) => n.user_id === u.id)
    console.log(`- ${u.email}: 새 메모 ${mine.filter((n) => n.status === 'new').length} · 반영 ${mine.filter((n) => n.status === 'done').length} · 마지막 로그인 ${u.last_sign_in_at?.slice(0, 10) ?? '없음'}`)
  }
}

const commands: Record<string, () => Promise<void>> = { notes, push, done, chapters, pull, rm, users }
const run = commands[cmd ?? ''] ?? (() => die(`명령: ${Object.keys(commands).join(' | ')}  (자세한 건 scripts/teacher.ts 맨 위)`))
await run()
