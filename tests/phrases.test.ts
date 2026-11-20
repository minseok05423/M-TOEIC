import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizePhrase, normalizeReview, REVIEW_SCHEMA } from '../supabase/functions/review-writing/review.ts'
import {
  buildLibrary,
  checkBlank,
  checkOrder,
  chooseForm,
  clozeParts,
  formsFor,
  orderTokens,
  phrasesFromWriting,
  pickBlank,
  planTest,
  practicePick,
  rightOptions,
  shuffleOrder,
  status,
  weak,
  type Phrase,
} from '../src/lib/phrases.ts'
import { mergeProgress } from '../src/lib/merge.ts'
import type { PhraseCard } from '../src/lib/store.ts'

const card = (box: number, due: string, lapses = 0, reps = 1): PhraseCard => ({ box, due, reps, lapses, u: 1 })

const went = {
  en: 'Yesterday I went to the bank.',
  ko: '어제 은행에 갔어요.',
  kind: 'fix',
  wrong: 'Yesterday I go to 은행.',
  why: '지난 일은 과거형 went',
  blank: 'went',
  choices: ['go', 'goed', 'Go', 'went', 'going', 'gone'],
}

test('normalizePhrase: 보기는 정답과 다르고 겹치지 않게 3개까지', () => {
  const p = normalizePhrase(went)!
  assert.equal(p.blank, 'went')
  assert.deepEqual(p.choices, ['go', 'goed', 'Go']) // 대소문자가 다르면 다른 보기
  const caps = normalizePhrase({ en: 'Today I will study English.', blank: 'English', choices: ['english', 'English', 'englishes'] })!
  assert.deepEqual(caps.choices, ['english', 'englishes'])
  assert.equal(p.kind, 'fix')
})

test('normalizePhrase: en 에 없는 blank 는 버림, 영어 없으면 null, 모르는 kind 는 useful', () => {
  const p = normalizePhrase({ ...went, blank: 'gone', kind: 'weird' })!
  assert.equal(p.blank, '')
  assert.deepEqual(p.choices, [])
  assert.equal(p.kind, 'useful')
  assert.equal(normalizePhrase({ en: '은행' }), null)
  assert.equal(normalizePhrase({ en: 'I am fine.', wrong: 'I am fine.' })!.wrong, '')
  assert.equal(normalizePhrase({ en: 'I am fine.', wrong: 'i am fine' })!.wrong, 'i am fine') // 대문자 · 마침표 실수도 남김
})

test('normalizeReview: phrases 칸 (없으면 빈 배열)', () => {
  assert.deepEqual(normalizeReview({}).phrases, [])
  assert.equal(normalizeReview({ phrases: [went, { en: '' }] }).phrases.length, 1)
  assert.ok(REVIEW_SCHEMA.required.includes('phrases'))
})

const writing = (id: string, review: unknown, created_at = '2026-11-20T10:00:00Z') => ({
  id,
  day: created_at.slice(0, 10),
  topic: null,
  created_at,
  review: normalizeReview(review),
})

test('phrasesFromWriting: AI 표현 → id, 같은 영어는 한 번, 최대 8개', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ ...went, en: `I went there ${'very '.repeat(i)}early.` }))
  const ps = phrasesFromWriting(writing('w1', { phrases: [went, { ...went, en: 'yesterday i went to the bank' }, ...many] }))
  assert.equal(ps.length, 8)
  assert.equal(ps[0].id, 'w:w1:0')
  assert.equal(ps[1].id, 'w:w1:2') // 1번은 0번과 같은 영어라 빠짐
  assert.equal(ps[0].writingId, 'w1')
})

test('phrasesFromWriting: 예전 검수는 고친 문장 · 아쉬운 표현에서', () => {
  const ps = phrasesFromWriting(
    writing('old', {
      sentences: [
        { original: 'I go to work.', corrected: 'I went to work.', verdict: 'fix', issues: [{ type: 'grammar', wrong: 'go', right: 'went', why: '과거형' }] },
        { original: 'It was fun.', corrected: 'It was fun.', verdict: 'ok', issues: [] },
      ],
      better: [{ original: 'I ate rice.', better: 'I had lunch.', why: '더 자연스러워요' }],
    }),
  )
  assert.equal(ps.length, 2)
  assert.deepEqual([ps[0].en, ps[0].kind, ps[0].blank, ps[0].choices[0], ps[0].wrong], ['I went to work.', 'fix', 'went', 'go', 'I go to work.'])
  assert.equal(ps[1].kind, 'better')
  assert.equal(ps[1].blank, 'lunch') // 빈칸이 없으면 가장 긴 단어
})

test('buildLibrary: 최근 것부터, 지운 내 표현 빼고, 숨긴 것은 따로', () => {
  const w = writing('w1', { phrases: [went, { ...went, en: 'I was tired.', blank: 'was' }] }, '2026-11-19T10:00:00Z')
  const mine = {
    a: { id: 'a', en: 'See you soon.', ko: '곧 봐요.', createdAt: Date.parse('2026-11-20T01:00:00Z'), u: 1 },
    b: { id: 'b', en: 'Gone.', ko: 'x', createdAt: 5, u: 2, deleted: true },
  }
  const lib = buildLibrary([w], mine, { 'w:w1:1': { ...card(0, '2026-11-20'), hidden: true } })
  assert.deepEqual(
    lib.shown.map((p) => p.id),
    ['m:a', 'w:w1:0'],
  )
  assert.deepEqual(
    lib.hidden.map((p) => p.id),
    ['w:w1:1'],
  )
  assert.equal(lib.shown[0].kind, 'mine')
})

const P = (id: string, extra: Partial<Phrase> = {}): Phrase => ({
  id,
  en: 'I went to the bank.',
  ko: '은행에 갔어요.',
  kind: 'fix',
  wrong: 'I go to the bank.',
  why: '',
  blank: 'went',
  choices: ['go', 'goed'],
  day: '2026-11-20',
  at: 0,
  ...extra,
})

test('planTest: 복습할 차례(덜 외운 것부터) → 새 표현, 최대 10개', () => {
  const ps = [P('new1'), P('later'), P('due-box2'), P('due-box0'), ...Array.from({ length: 10 }, (_, i) => P(`n${i}`))]
  const cards = { later: card(3, '2026-11-25'), 'due-box2': card(2, '2026-11-20'), 'due-box0': card(0, '2026-11-19', 1) }
  const plan = planTest(ps, cards, '2026-11-20')
  assert.equal(plan.items.length, 10)
  assert.deepEqual(
    plan.items.slice(0, 3).map((p) => p.id),
    ['due-box0', 'due-box2', 'new1'],
  )
  assert.equal(plan.due, 2)
  assert.equal(plan.fresh, 11)
  assert.ok(!plan.items.some((p) => p.id === 'later'))
  // 숨김 표시만 있고 풀어 본 적 없는 카드 (reps 0) 는 새 표현
  assert.equal(planTest([P('h')], { h: { ...card(0, '2026-11-01', 0, 0), hidden: true } }, '2026-11-20').fresh, 1)
})

test('practicePick: 덜 외운 것 · 자주 틀린 것부터', () => {
  const ps = [P('known'), P('weak'), P('mid')]
  const got = practicePick(ps, { known: card(5, '2026-12-30'), weak: card(0, '2026-12-01', 3), mid: card(2, '2026-12-01') })
  assert.deepEqual(
    got.map((p) => p.id),
    ['weak', 'mid', 'known'],
  )
})

test('status · weak', () => {
  assert.equal(status(undefined), 'new')
  assert.equal(status(card(0, 'x', 1)), 'again')
  assert.equal(status(card(2, 'x')), 'learning')
  assert.equal(status(card(4, 'x')), 'known')
  assert.ok(weak(card(3, 'x', 2)))
  assert.ok(!weak(card(0, 'x', 1)))
  assert.ok(!weak(card(1, 'x', 1)))
})

test('formsFor · chooseForm: 외운 정도에 따라 쉬운 것 → 어려운 것', () => {
  const p = P('p')
  assert.deepEqual(formsFor(p), ['pick-right', 'cloze-pick', 'order', 'cloze-type', 'speak'])
  assert.equal(chooseForm(p, undefined, 0), 'pick-right')
  assert.equal(chooseForm(p, undefined, 1), 'cloze-pick')
  assert.equal(chooseForm(p, card(1, 'x'), 0), 'cloze-pick')
  assert.equal(chooseForm(p, card(1, 'x'), 1), 'order')
  assert.equal(chooseForm(p, card(4, 'x'), 0), 'order')
  assert.equal(chooseForm(p, card(4, 'x'), 1), 'cloze-type')
  assert.equal(chooseForm(p, card(4, 'x'), 2), 'speak')
  assert.equal(chooseForm(p, card(4, 'x'), 3), 'order')
  // 내 표현: 틀린 모양 · 보기 없음 → 순서 맞추기 · 빈칸 쓰기 · 말해 보기
  const mine = P('m', { kind: 'mine', wrong: '', choices: [], blank: pickBlank('See you next week.') , en: 'See you next week.' })
  assert.deepEqual(formsFor(mine), ['order', 'cloze-type', 'speak'])
  assert.equal(chooseForm(mine, undefined, 0), 'order')
  // 두 단어 · 뜻 없음 · 빈칸 없음 → 낼 문제 없음
  assert.equal(chooseForm(P('x', { en: 'Hi there', ko: '', wrong: '', blank: '', choices: [] }), undefined), null)
})

test('pickBlank: 가장 긴 단어 (3글자 이상)', () => {
  assert.equal(pickBlank("I'm looking forward to it."), 'looking')
  assert.equal(pickBlank('I am ok'), '')
})

test('clozeParts · rightOptions', () => {
  assert.deepEqual(clozeParts('I Went home.', 'went'), ['I ', ' home.'])
  assert.deepEqual(rightOptions(P('p')), ['I went to the bank.', 'I go to the bank.'])
  // 대문자만 틀린 문장도 바른 문장 고르기로 나옴
  const capsP = P('c', { en: 'Today I study English.', wrong: 'today I study english.', blank: 'English', choices: [] })
  assert.ok(formsFor(capsP).includes('pick-right'))
  assert.deepEqual(rightOptions(capsP), ['Today I study English.', 'today I study english.'])
  assert.deepEqual(rightOptions(P('p', { choices: ['goed'] })), ['I went to the bank.', 'I go to the bank.', 'I goed to the bank.'])
})

test('checkBlank: 대소문자 · 문장 부호 무시, 4글자 이상은 한 글자 실수 허용', () => {
  assert.equal(checkBlank(' went ', 'went'), 'exact')
  assert.equal(checkBlank('Went', 'went'), 'typo') // 대소문자만 다름 → 맞음 + 철자 보여 줌
  assert.equal(checkBlank('english', 'English'), 'typo')
  assert.equal(checkBlank('wnet', 'went'), false) // 두 글자 바뀜
  assert.equal(checkBlank('wen', 'went'), 'typo')
  assert.equal(checkBlank('go', 'got'), false) // 짧은 말은 정확히
  assert.equal(checkBlank('looking forwrd', 'looking forward'), 'typo')
  assert.equal(checkBlank('', 'went'), false)
  assert.equal(checkBlank("don’t", "don't"), 'exact')
})

test('orderTokens · checkOrder · shuffleOrder', () => {
  assert.deepEqual(orderTokens('I went to the bank.'), ['I', 'went', 'to', 'the', 'bank'])
  assert.ok(checkOrder(['I', 'went', 'to', 'the', 'bank'], 'I went to the bank.'))
  assert.ok(!checkOrder(['went', 'I', 'to', 'the', 'bank'], 'I went to the bank.'))
  const t = orderTokens('I went to the bank.')
  let i = 0
  const fixed = () => [0.99, 0.99, 0.99, 0.99][i++ % 4] // 그대로 두는 셔플 → 다시 섞거나 뒤집음
  const s = shuffleOrder(t, fixed)
  assert.ok(!checkOrder(s, t.join(' ')))
  assert.deepEqual([...s].sort(), [...t].sort())
})

test('mergeProgress: 표현 기록 · 내 표현은 더 최근 것, 없으면 칸을 만들지 않음', () => {
  const base = { lessons: {}, srs: {}, days: {} }
  assert.equal('phrases' in mergeProgress(base, base), false)
  const a = { ...base, phrases: { x: { ...card(1, 'd'), u: 5 } } }
  const b = { ...base, phrases: { x: { ...card(3, 'd'), u: 9 }, y: { ...card(0, 'd'), u: 1 } }, myPhrases: { m: { id: 'm', en: 'Hi.', ko: '안녕', createdAt: 1, u: 1 } } }
  const m = mergeProgress(a, b)
  assert.equal(m.phrases!.x.box, 3)
  assert.ok(m.phrases!.y)
  assert.equal(m.myPhrases!.m.en, 'Hi.')
})
