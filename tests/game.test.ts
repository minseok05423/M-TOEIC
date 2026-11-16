// 오답 보기 고르기 · 직접 쓰기 채점 (src/lib/game.ts). 실행: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { acceptedAnswers, checkTyped, distractorPicker, oneSense, senseVariants } from '../src/lib/game.ts'
import type { StudyWord } from '../src/lib/words.ts'

const w = (en: string, ko: string, pos?: string, origin: StudyWord['origin'] = 'custom', group = '1일차'): StudyWord => ({
  key: `${origin === 'custom' ? 'c' : 'w'}:${en}`,
  en,
  ko,
  pos,
  group,
  origin,
})

// 학생 단어장 비슷한 묶음: 동사 40개 + 명사 몇 개 + 문법 항목 (품사 없는 레슨 단어)
const verbs = Array.from({ length: 40 }, (_, i) => w(`verb${i}`, `동작${i}하다`, '동사'))
const nouns = Array.from({ length: 6 }, (_, i) => w(`noun${i}`, `물건${i}`, '명사'))
const grammar = [w('can', '~할 수 있다 (능력)', undefined, 'lesson', '조동사'), w('must', '~해야 한다', undefined, 'lesson', '조동사'), w('because', '~ 때문에', undefined, 'lesson', '접속사')]
const hold = w('hold', '들다, 잡다', '동사')
const carry = w('carry', '들다, 나르다, 운반하다', '동사')
const shade = w('shade', '그늘지게 하다 / 그늘', '동사 / 명사')
const pool = [...verbs, ...nouns, ...grammar, hold, carry, shade]

// 한 판 = 30문제 × 오답 3개 = 90칸, 동사 모양 단어는 43개 → 어떤 단어는 세 번까지 나올 수밖에 없어요
test('한 판(30문제) 안에서 오답이 고르게 돌아가요 (예전엔 같은 오답이 6번 넘게)', () => {
  const answers = verbs.slice(0, 30)
  const pick = distractorPicker(pool, answers)
  const count = new Map<string, number>()
  for (const a of answers) for (const d of pick(a)) count.set(d.en, (count.get(d.en) ?? 0) + 1)
  assert.ok(Math.max(...count.values()) <= 3, `가장 많이 나온 오답 ${Math.max(...count.values())}번`)
  assert.ok(count.size >= 35, `서로 다른 오답 ${count.size}개`)
})

test('동사 문제의 오답은 동사, 문법 항목은 안 섞어요 (한 판 30문제)', () => {
  const answers = verbs.slice(0, 30)
  const pick = distractorPicker(pool, answers)
  for (const a of answers)
    for (const d of pick(a)) {
      assert.ok(!grammar.some((g) => g.en === d.en), `문법 항목 ${d.en}`)
      assert.match(d.ko, /다$/, `동사 아닌 오답 ${d.ko}`)
    }
})

test('문법 항목 문제의 오답은 문법 항목', () => {
  const pick = distractorPicker(pool)
  assert.deepEqual(pick(grammar[0], 2).map((d) => d.en).sort(), ['because', 'must'])
})

test('뜻이 하나라도 겹치는 단어는 오답으로 안 나와요 (hold 들다 ↔ carry 들다)', () => {
  const pick = distractorPicker(pool)
  for (let i = 0; i < 100; i++) assert.ok(!pick(hold).some((d) => d.en === 'carry'))
})

test('뜻이 여럿인 단어는 뜻 하나씩, 보기에 " / " 가 안 남아요', () => {
  assert.deepEqual(
    senseVariants(shade).map((v) => [v.ko, v.pos]),
    [
      ['그늘지게 하다', '동사'],
      ['그늘', '명사'],
    ],
  )
  const pick = distractorPicker(pool)
  for (let i = 0; i < 100; i++) {
    const shown = oneSense(shade)
    assert.ok(!shown.ko.includes('/'))
    for (const d of pick(verbs[i % 10])) assert.ok(!d.ko.includes('/'), `오답에 / : ${d.ko}`)
  }
})

test('직접 쓰기: 받아 주는 답', () => {
  assert.deepEqual(acceptedAnswers('pack (up)'), ['pack up', 'pack'])
  assert.deepEqual(acceptedAnswers('(re)pave'), ['repave', 'pave'])
  assert.deepEqual(acceptedAnswers('turn on/off'), ['turn on', 'turn off'])
  assert.ok(acceptedAnswers('look forward to ~ing').includes('look forward to'))
  assert.deepEqual(acceptedAnswers('a few'), ['a few'], '소문자 a 는 빼면 안 됨 (a few ≠ few)')
})

test('직접 쓰기: 채점', () => {
  assert.equal(checkTyped('Pack up', 'pack (up)'), 'exact')
  assert.equal(checkTyped('  Turn  OFF ', 'turn on/off'), 'exact')
  assert.equal(checkTyped('as well as', 'A as well as B'), 'exact')
  assert.equal(checkTyped('distribte', 'distribute'), 'typo')
  assert.equal(checkTyped('distrbte', 'distribute'), false)
  assert.equal(checkTyped('hld', 'hold'), false, '짧은 단어는 한 글자도 봐주지 않음')
  assert.equal(checkTyped('few', 'a few'), false)
  assert.equal(checkTyped('', 'hold'), false)
})
