import { test } from 'node:test'
import assert from 'node:assert/strict'
import { charCount, checkInput, costUsd, LIMITS, normalizeReview, REVIEW_SCHEMA, textStats, userPrompt } from '../supabase/functions/review-writing/review.ts'
import { markParts } from '../src/lib/marks.ts'

test('checkInput: 길이 · 영어 · 주제', () => {
  assert.match(checkInput('I go.', null)!, /조금 더/)
  assert.equal(checkInput('Yesterday I went to the base early.', null), null)
  assert.equal(checkInput('Yesterday I went to 은행 with my wife.', '어제 일'), null)
  assert.match(checkInput('어제는 부대에 일찍 갔다. 너무 피곤했다. 점심은 김치찌개.', null)!, /영어/)
  assert.match(checkInput('a'.repeat(LIMITS.maxChars + 1), null)!, /너무 길어요/)
  assert.match(checkInput('Yesterday I went to the base early.', 'x'.repeat(101))!, /주제/)
  assert.equal(checkInput(undefined, null), '글이 비어 있어요.')
})

test('charCount 는 공백을 빼고 셈', () => {
  assert.equal(charCount(' a b\nc '), 3)
})

test('textStats: 문장 · 단어 수', () => {
  assert.deepEqual(textStats(''), { sentences: 0, words: 0 })
  assert.deepEqual(textStats("I'm tired. I slept 4 hours!\nMy soldiers is good"), { sentences: 3, words: 9 })
  assert.equal(textStats('I went to 은행.').words, 3)
})

test('costUsd: Opus 5.5 가격, 모르는 모델은 비싸게', () => {
  assert.equal(costUsd('claude-opus-5-5', { input_tokens: 1e6, output_tokens: 0 }), 4)
  assert.equal(costUsd('claude-opus-5-5', { input_tokens: 0, output_tokens: 1e6 }), 20)
  assert.ok(Math.abs(costUsd('claude-opus-5-5', { input_tokens: 3101, output_tokens: 2491 }) - 0.0622) < 0.0001)
  assert.equal(costUsd('some-new-model', { input_tokens: 0, output_tokens: 1e6 }), 25)
})

test('normalizeReview: 빠진 칸 채우고 점수는 1~5', () => {
  const r = normalizeReview({
    scores: { structure: 9, grammar: 0, words: '3' },
    sentences: [
      { original: 'I go.', corrected: 'I went.', issues: [{ type: 'grammar', wrong: 'go', right: 'went', why: '과거형' }] },
      { original: 'It is good.', verdict: 'ok', issues: [{ type: 'weird' }] },
    ],
    good: ['좋아요', 3],
  })
  assert.deepEqual(r.scores, { structure: 5, grammar: 1, words: 3, natural: 1 })
  assert.equal(r.sentences[0].verdict, 'fix')
  assert.equal(r.sentences[1].corrected, 'It is good.')
  assert.equal(r.sentences[1].issues[0].type, 'grammar')
  assert.deepEqual(r.good, ['좋아요'])
  assert.deepEqual(r.talk, [])
  assert.equal(normalizeReview(null).summary, '')
})

test('REVIEW_SCHEMA: 모든 객체가 닫혀 있고 모든 칸이 필수 (structured outputs 조건)', () => {
  const walk = (s: Record<string, unknown>) => {
    if (s.type === 'object') {
      assert.equal(s.additionalProperties, false)
      assert.deepEqual([...(s.required as string[])].sort(), Object.keys(s.properties as object).sort())
      for (const v of Object.values(s.properties as Record<string, Record<string, unknown>>)) walk(v)
    }
    if (s.type === 'array') walk(s.items as Record<string, unknown>)
  }
  walk(REVIEW_SCHEMA as unknown as Record<string, unknown>)
})

test('userPrompt: 글은 <writing> 안에, 주제는 있을 때만', () => {
  assert.equal(userPrompt(' Hi there. ', null).includes('주제'), false)
  assert.match(userPrompt('Hi there.', ' 어제 일 '), /^주제: 어제 일\n\n<writing>\nHi there\.\n<\/writing>/)
})

test('markParts: 틀린 부분 표시 (대소문자 무시, 겹치면 건너뜀, 못 찾으면 그대로)', () => {
  const p = markParts('Yesterday I go to the 부대 early morning.', ['go', '부대', 'early morning', 'nothing', 'go to'])
  assert.deepEqual(
    p.filter((x) => x.hit).map((x) => x.t),
    ['go', '부대', 'early morning'],
  )
  assert.equal(p.map((x) => x.t).join(''), 'Yesterday I go to the 부대 early morning.')
  assert.deepEqual(markParts('I study english.', ['English']), [
    { t: 'I study ', hit: false },
    { t: 'english', hit: true },
    { t: '.', hit: false },
  ])
  // 같은 단어가 두 번이면 두 번째 것도 표시
  assert.deepEqual(
    markParts('english and english', ['english', 'english']).filter((x) => x.hit).length,
    2,
  )
  assert.deepEqual(markParts('abc', ['', ' ']), [{ t: 'abc', hit: false }])
})
