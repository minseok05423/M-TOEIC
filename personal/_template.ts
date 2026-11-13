/**
 * 맞춤 챕터 견본. 복사해서 personal/<챕터id>.ts 로 저장한 뒤
 *   npm run teacher -- push personal/<챕터id>.ts
 * 로 그 학생에게만 올려요. (이름이 _ 로 시작하는 이 파일은 검사·업로드 대상이 아님)
 *
 * 방법 A. 새 챕터 추가 → id 를 새로: 'YYYY-MM-DD-me-<slug>'
 * 방법 B. 기존 레슨 고치기 → 기본 챕터와 같은 id 로 올리면 그 학생에게는 기본 챕터 대신 이게 보임.
 *         아래처럼 기본 챕터를 import 해서 바꿀 레슨만 바꾸면, 나머지 레슨과 학습 기록(id 기준)은 그대로.
 *         ⚠️ 그 뒤 기본 챕터를 고쳐도 이 학생에게는 안 보여요 → 다시 push 해야 반영됨.
 */
import type { Chapter, Lesson, PersonalMeta } from '../src/content/types.ts'
import { chapter as base } from '../src/content/chapters/2026-11-11/index.ts'

export const meta: PersonalMeta = {
  user: 'student@example.com',
  // 이 챕터로 답한 메모 id → 학생 화면에 보일 선생님 한마디
  notes: {
    // '00000000-0000-0000-0000-000000000000': 'enjoy 뒤에는 -ing 가 와요. 2번 레슨에 정리해 뒀어요!',
  },
}

// ── 방법 A: 새 챕터 ──
const extra: Lesson = {
  id: 'ing-after-verbs',
  title: '동사 뒤의 -ing',
  emoji: '🔁',
  summary: 'enjoy reading 의 reading 은 진행형이 아니에요',
  sections: [{ heading: '진행형 vs 동명사', body: '**be + -ing** 일 때만 진행형이에요.\n- I am reading. (읽는 중)\n- I enjoy reading. (읽는 것을 즐긴다)' }],
  words: [{ en: 'enjoy', ko: '즐기다', tip: '뒤에 -ing' }],
  sentences: [{ id: 'i1', text: '[I|S] [enjoy|V] [reading books|O].', ko: '나는 책 읽는 것을 즐긴다.' }],
  quiz: [{ type: 'mc', id: 'q1', q: 'She enjoys ____ music.', choices: ['listen', 'listening to', 'listens'], answer: 1, explain: 'enjoy 뒤에는 **-ing**.' }],
}

export const chapterA: Chapter = {
  id: '2026-11-14-me-ing',
  date: '2026-11-14',
  title: '내 질문 정리: -ing',
  reason: '"enjoy reading 은 왜 진행형이 아니에요?" 라는 메모를 보고 만들었어요.',
  lessons: [extra],
}

// ── 방법 B: 기존 챕터의 basics 레슨에 설명 한 장 더하기 ──
export const chapterB: Chapter = {
  ...base,
  lessons: base.lessons.map((l) =>
    l.id === 'basics' ? { ...l, sections: [...l.sections, { heading: '추가 설명', body: '학생 메모에 답하는 설명' }] } : l,
  ),
}

// push 하는 건 이 이름 하나: export const chapter
export const chapter: Chapter = chapterA
