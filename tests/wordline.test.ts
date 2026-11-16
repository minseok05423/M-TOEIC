// 여러 개 붙여넣기 한 줄 읽기 (src/lib/wordline.ts). 실행: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseLine, takePos } from '../src/lib/wordline.ts'

const cases: [string, { en: string; ko: string; pos?: string } | null][] = [
  // 숙어 (예전에 깨지던 것들)
  ['set up 설치하다, 설립하다', { en: 'set up', ko: '설치하다, 설립하다' }],
  ['look forward to ~ing ~을 고대하다', { en: 'look forward to ~ing', ko: '~을 고대하다' }],
  ['make sure (that) 반드시 ~하다', { en: 'make sure (that)', ko: '반드시 ~하다' }],
  ['pack (up) 싸다, 포장하다', { en: 'pack (up)', ko: '싸다, 포장하다' }],
  ['fill out (서류를) 작성하다', { en: 'fill out', ko: '(서류를) 작성하다' }],
  ['A as well as B B뿐만 아니라 A도', { en: 'A as well as B', ko: 'B뿐만 아니라 A도' }],
  ['take off-벗다', { en: 'take off', ko: '벗다' }],
  ['take off—벗다', { en: 'take off', ko: '벗다' }],
  ['plug in 구 : 플러그를 꽂다', { en: 'plug in', ko: '플러그를 꽂다', pos: '숙어' }],
  ['take part in (숙) 참가하다', { en: 'take part in', ko: '참가하다', pos: '숙어' }],
  ['turn on/off 켜다/끄다', { en: 'turn on/off', ko: '켜다/끄다' }],
  // 단어 (예전 형식 그대로)
  ['hold 들다, 잡다', { en: 'hold', ko: '들다, 잡다' }],
  ['postpone = 연기하다', { en: 'postpone', ko: '연기하다' }],
  ['postpone - 연기하다', { en: 'postpone', ko: '연기하다' }],
  ['require = (동) 요구하다', { en: 'require', ko: '요구하다', pos: '동사' }],
  ['hold (동) - 들다', { en: 'hold', ko: '들다', pos: '동사' }],
  ['shade - (동) 그늘지게 하다 / (명) 그늘', { en: 'shade', ko: '그늘지게 하다 / 그늘', pos: '동사 / 명사' }],
  ['shade 동: 그늘지게 하다, 명: 그늘, 블라인드', { en: 'shade', ko: '그늘지게 하다 / 그늘, 블라인드', pos: '동사 / 명사' }],
  ['1. take off 벗다', { en: 'take off', ko: '벗다' }],
  ['- hand in 제출하다', { en: 'hand in', ko: '제출하다' }],
  ['postpone = delay', { en: 'postpone', ko: 'delay' }],
  // 못 읽는 줄
  ['미리 in advance', null],
  ['just english', null],
  ['', null],
]

for (const [line, want] of cases)
  test(`parseLine: ${line || '(빈 줄)'}`, () => {
    const got = parseLine(line)
    if (want === null) return assert.equal(got, null)
    assert.ok(got, '읽혀야 해요')
    assert.equal(got.en, want.en)
    assert.equal(got.ko, want.ko)
    assert.equal(got.pos, want.pos)
  })

test('takePos: 단어 속 "활동:" 은 품사 표시가 아님', () => {
  assert.deepEqual(takePos('활동: 참석하다'), { ko: '활동: 참석하다' })
})
