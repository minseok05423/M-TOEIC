// 단어 테스트 규칙 · Part 1 문제 검사. 실행: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { typingKeys, TYPE_AFTER_MISSES } from '../src/lib/wordtest.ts'
import { PART1 } from '../src/content/part1.ts'
import type { WordTest } from '../src/lib/store.ts'

test(`단어 테스트: ${TYPE_AFTER_MISSES}번 이상 틀린 단어만 직접 쓰기`, () => {
  const t = (id: string, ok: boolean, key = 'c:1'): WordTest => ({ id, day: '2026-11-13', startedAt: 0, finishedAt: 0, score: 0, total: 1, items: [{ key, en: 'x', ko: 'y', part: 'new', ok }] })
  assert.deepEqual([...typingKeys({ a: t('a', false) })], [])
  assert.deepEqual([...typingKeys({ a: t('a', false), b: t('b', false) })], ['c:1'])
  assert.deepEqual([...typingKeys({ a: t('a', false), b: t('b', true) })], [])
})

test('Part 1: 문제마다 보기 4개, 정답 번호가 맞고, id 가 겹치지 않아요', () => {
  assert.equal(new Set(PART1.map((q) => q.id)).size, PART1.length)
  for (const q of PART1) {
    assert.equal(q.options.length, 4, q.id)
    assert.ok(q.answer >= 0 && q.answer < 4, q.id)
    assert.equal(new Set(q.options.map((o) => o.en)).size, 4, `${q.id}: 같은 문장`)
    for (const o of q.options) assert.ok(o.en.trim() && o.ko.trim(), q.id)
    assert.ok(q.explain.trim() && q.scene.trim(), q.id)
  }
  // 정답 위치가 한쪽으로 몰리지 않게
  const at = [0, 1, 2, 3].map((i) => PART1.filter((q) => q.answer === i).length)
  assert.ok(Math.min(...at) >= 2, `정답 위치 ${at.join('/')}`)
})
