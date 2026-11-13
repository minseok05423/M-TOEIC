/**
 * 콘텐츠 검사기. `npm run check-content` (빌드할 때 자동 실행)
 * 기본 챕터(src/content/chapters)와 맞춤 챕터 원본(personal/)을 함께 검사합니다. 규칙은 src/content/validate.ts
 */
import { readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { CHAPTERS } from '../src/content/chapters/index.ts'
import { validateChapters } from '../src/content/validate.ts'
import type { Chapter } from '../src/content/types.ts'

function report(label: string, chapters: unknown[]): number {
  const { errors, warnings, counts } = validateChapters(chapters)
  for (const w of warnings) console.log(w)
  for (const e of errors) console.log(e)
  console.log(`${label}: 챕터 ${counts.chapters} · 레슨 ${counts.lessons} · 단어 ${counts.words} · 문장 ${counts.sentences} · 퀴즈 ${counts.quiz}`)
  return errors.length
}

let errors = report('기본 챕터', CHAPTERS)

// 맞춤 챕터는 학생마다 따로라서 기본 챕터와 id 가 겹쳐도 됨 (겹치면 그 학생에게는 덮어쓰기) → 파일마다 따로 검사
const dir = resolve('personal')
if (existsSync(dir))
  for (const f of readdirSync(dir).filter((f) => /\.ts$/.test(f) && !f.startsWith('_')).sort()) {
    const mod = (await import(pathToFileURL(resolve(dir, f)).href)) as { chapter?: Chapter }
    if (!mod.chapter) {
      console.log(`✗ personal/${f}: 'export const chapter' 가 없음`)
      errors++
      continue
    }
    errors += report(`personal/${f}`, [mod.chapter])
  }

if (errors) {
  console.log(`\n콘텐츠 오류 ${errors}개 — 고친 뒤 다시 실행하세요.`)
  process.exit(1)
}
console.log('콘텐츠 OK ✓')
