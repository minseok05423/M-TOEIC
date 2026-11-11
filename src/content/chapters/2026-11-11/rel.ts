import type { Lesson } from '../../types.ts'

export const rel: Lesson = {
  id: 'rel',
  title: '관계대명사',
  emoji: '🪝',
  summary: '앞의 명사를 뒤에서 설명해 주는 연결 고리',
  sections: [
    {
      heading: '관계대명사란?',
      body: '**앞에 나온 명사를 뒤에서 설명해 주는 연결 단어**예요.\n- 한국어: 설명이 **앞**에 → "어제 내가 산 책"\n- 영어: 설명이 **뒤**에 → "the book **that** I bought yesterday"\n명사 바로 뒤에 who / which / that 이 보이면 → "이 명사에 대한 설명이 시작되는구나!"',
      examples: [
        { en: 'The woman who lives next door is a doctor.', ko: '옆집에 사는 그 여자는 의사이다.' },
      ],
    },
    {
      heading: '종류 한눈에 보기',
      body: '앞 명사가 **사람**이냐 **사물**이냐, 그리고 **뒤에 뭐가 오냐**로 골라요.',
      table: [
        ['앞 명사', '뒤에 동사 (주격)', '뒤에 주어+동사 (목적격)', '뒤에 명사 (소유격)'],
        ['사람', 'who', 'whom / who', 'whose'],
        ['사물·동물', 'which', 'which', 'whose'],
        ['둘 다', 'that', 'that', '—'],
      ],
    },
    {
      heading: '바로 뒤를 보면 구별된다',
      body: '- 뒤에 바로 **동사** → 주격: the man who **works** here (여기서 일하는 남자)\n- 뒤에 **주어 + 동사** → 목적격: the man whom **I met** (내가 만난 남자)\n- 뒤에 **명사** → 소유격 whose: the man whose **car** is red (차가 빨간 남자)\n💡 목적격은 **생략**할 수 있어요: the man (whom) I met → the man I met',
    },
    {
      heading: 'what = "~하는 것"',
      body: 'what 은 **앞에 명사가 없어요.** what 자체가 "~하는 것" 이라는 뜻을 가지고 있어요.\n- **What** I need is time. (내가 필요한 것은 시간이다)\n- the thing what I need ✗ → 앞에 명사(the thing)가 있으면 that / which',
    },
    {
      heading: '덤: 장소·시간 + where / when',
      body: '- 장소 명사 + **where**: the city where I live (내가 사는 도시)\n- 시간 명사 + **when**: the day when we met (우리가 만난 날)\n- 이유 + **why**: the reason why he left (그가 떠난 이유)',
    },
    {
      heading: '⭐ 문장 분석 꿀팁',
      body: '관계대명사부터 그 설명이 끝나는 곳까지 [ ] 로 묶으세요.\nThe report [that you sent] was helpful. → 뼈대: The report was helpful.\n**that 구별법**: 앞에 명사가 있고 뒤가 뭔가 빠진 문장이면 → 관계대명사. think / say 같은 동사 뒤에 완전한 문장이면 → 접속사 ("~라는 것").',
    },
  ],
  words: [
    { group: '관계대명사', en: 'who', ko: '(사람) ~하는 [사람] — 주격', ex: { en: 'I know a man who speaks French.', ko: '나는 프랑스어를 하는 남자를 안다.' }, tip: '뒤에 바로 동사' },
    { group: '관계대명사', en: 'whom', ko: '(사람) ~가 …하는 [사람] — 목적격', ex: { en: 'The woman whom I met was kind.', ko: '내가 만난 여자는 친절했다.' }, tip: '뒤에 주어+동사. 생략 가능' },
    { group: '관계대명사', en: 'whose', ko: '(사람·사물) 그의 / 그것의 ~가 …한', ex: { en: 'I have a friend whose father is a pilot.', ko: '나는 아버지가 조종사인 친구가 있다.' }, tip: '뒤에 명사 (whose + 명사)' },
    { group: '관계대명사', en: 'which', ko: '(사물) ~하는 [것]', ex: { en: 'This is the bag which I bought.', ko: '이것이 내가 산 가방이다.' } },
    { group: '관계대명사', en: 'that', ko: '(사람·사물) ~하는 [것/사람]', ex: { en: 'The bus that goes downtown is here.', ko: '시내로 가는 버스가 왔다.' }, tip: 'who / which 대신 쓸 수 있음' },
    { group: '관계대명사', en: 'what', ko: '~하는 것 (= the thing which)', ex: { en: 'What he said is true.', ko: '그가 말한 것은 사실이다.' }, tip: '앞에 명사 없음!' },

    { group: '관계부사', en: 'where', ko: '(장소) ~하는 [곳]', ex: { en: 'This is the office where I work.', ko: '여기가 내가 일하는 사무실이다.' } },
    { group: '관계부사', en: 'when', ko: '(시간) ~하는 [때]', ex: { en: 'I remember the day when we met.', ko: '나는 우리가 만난 날을 기억한다.' } },
    { group: '관계부사', en: 'why', ko: '(이유) ~하는 [이유]', ex: { en: 'Tell me the reason why you left.', ko: '네가 떠난 이유를 말해 줘.' } },

    { group: '자주 쓰는 덩어리', en: 'those who', ko: '~하는 사람들', ex: { en: 'Those who register early get a discount.', ko: '일찍 등록하는 사람들은 할인을 받는다.' }, tip: '토익 단골' },
    { group: '자주 쓰는 덩어리', en: 'anyone who', ko: '~하는 사람은 누구든', ex: { en: 'Anyone who is interested can join.', ko: '관심 있는 사람은 누구든 참여할 수 있다.' } },
    { group: '자주 쓰는 덩어리', en: 'whoever', ko: '~하는 사람은 누구든지', ex: { en: 'Whoever finishes first wins.', ko: '먼저 끝내는 사람이 누구든 이긴다.' } },
    { group: '자주 쓰는 덩어리', en: 'whatever', ko: '~하는 것은 무엇이든', ex: { en: 'You can order whatever you want.', ko: '원하는 건 뭐든 주문해도 돼요.' } },
  ],
  sentences: [
    {
      id: 'r1',
      text: '[The woman|S] [who|REL|사람 + 뒤에 바로 동사(lives) → 주격 who] [lives|v] [next door|adv] [is|V] [a doctor|C].',
      ko: '옆집에 사는 여자는 의사이다.',
      slash: 'The woman / who lives next door / is a doctor.',
      note: '[who lives next door] 를 묶으면 뼈대: The woman is a doctor.',
    },
    {
      id: 'r2',
      text: '[The report|S] [that|REL|사물 + 뒤에 주어+동사(you sent) → 목적격] [you|s] [sent|v] [yesterday|adv] [was|V] [very helpful|C].',
      ko: '어제 보내 주신 보고서가 정말 도움이 되었어요.',
      slash: 'The report / that you sent yesterday / was very helpful.',
    },
    {
      id: 'r3',
      text: '[We|S] [hired|V] [a designer|O] [whose|REL|뒤에 명사(work) → 소유격: 그 디자이너의 작품] [work|s] [won|v] [many awards|o].',
      ko: '우리는 작품이 많은 상을 받은 디자이너를 고용했다.',
      slash: 'We hired a designer / whose work won many awards.',
    },
    {
      id: 'r4',
      text: '[This|S] [is|V] [the hotel|C] [where|REL|장소 명사(the hotel) + where] [we|s] [stayed|v] [last year|adv].',
      ko: '여기가 우리가 작년에 묵었던 호텔이다.',
      slash: 'This is the hotel / where we stayed last year.',
    },
    {
      id: 'r5',
      text: '[What we need|S|What(~하는 것)이 이끄는 덩어리 전체가 주어] [is|V] [more time|C].',
      ko: '우리에게 필요한 것은 더 많은 시간이다.',
      slash: 'What we need / is more time.',
    },
    {
      id: 'r6',
      text: '[Customers|S] [who|REL] [buy|v] [two items|o] [will|MOD] [receive|V] [a free gift|O].',
      ko: '물건을 두 개 사는 고객은 무료 선물을 받게 됩니다.',
      slash: 'Customers / who buy two items / will receive a free gift.',
    },
    {
      id: 'r7',
      text: '[The laptop|S] [I|s|앞에 that 이 생략됨: The laptop (that) I bought] [bought|v] [last week|adv] [stopped|V] [working|O].',
      ko: '내가 지난주에 산 노트북이 작동을 멈췄다.',
      slash: 'The laptop / I bought last week / stopped working.',
      note: '명사 뒤에 바로 주어+동사가 오면 목적격 관계대명사가 생략된 거예요.',
    },
  ],
  quiz: [
    { type: 'mc', id: 'q1', q: 'The man ____ is standing by the door is our new manager.', choices: ['who', 'which', 'whose', 'what'], answer: 0, explain: '사람(The man) + 뒤에 바로 동사(is standing) → who.', ko: '문 옆에 서 있는 남자가 우리의 새 매니저이다.' },
    { type: 'mc', id: 'q2', q: 'I lost the umbrella ____ my mother gave me.', choices: ['who', 'which', 'whose', 'where'], answer: 1, explain: '사물(the umbrella) + 뒤에 주어+동사(my mother gave) → which.', ko: '나는 엄마가 주신 우산을 잃어버렸다.' },
    { type: 'mc', id: 'q3', q: 'We need someone ____ can speak Chinese.', choices: ['which', 'whose', 'who', 'what'], answer: 2, explain: '사람(someone) + 뒤에 동사(can speak) → who.', ko: '우리는 중국어를 할 수 있는 사람이 필요하다.' },
    { type: 'mc', id: 'q4', q: 'The company hired a manager ____ experience is impressive.', choices: ['who', 'whom', 'whose', 'which'], answer: 2, explain: '뒤에 명사(experience) → 소유격 whose. "그 매니저의 경력이 인상적인"', ko: '회사는 경력이 인상적인 매니저를 고용했다.' },
    { type: 'mc', id: 'q5', q: '____ you said is true.', choices: ['That', 'Which', 'What', 'Who'], answer: 2, explain: '앞에 명사가 없고 "~하는 것" 이라는 뜻 → What.', ko: '네가 말한 것은 사실이다.' },
    { type: 'mc', id: 'q6', q: 'This is the restaurant ____ I had lunch with Mr. Cho.', choices: ['which', 'where', 'who', 'what'], answer: 1, explain: '장소(the restaurant) + 뒤에 빠진 것 없는 완전한 문장 → where.', ko: '여기가 내가 조 씨와 점심을 먹은 식당이다.' },
    { type: 'tap', id: 'q7', prompt: '관계대명사를 고르세요.', text: 'The book *that* you recommended is very interesting.', explain: '앞 명사(The book)를 설명하는 that.', ko: '네가 추천해 준 책은 정말 재미있다.' },
    { type: 'tap', id: 'q8', prompt: '관계대명사를 고르세요.', text: 'Employees *who* work overtime will be paid extra.', explain: '앞 명사(Employees)를 설명하는 who. 뼈대: Employees will be paid extra.', ko: '초과 근무를 하는 직원은 추가 수당을 받는다.' },
    { type: 'mc', id: 'q9', q: 'The woman who lives next door is a doctor.\n이 문장의 뼈대는?', choices: ['The woman is a doctor.', 'The woman lives next door.', 'Next door is a doctor.', 'The woman who lives.'], answer: 0, explain: '[who lives next door] 는 The woman 을 설명하는 꾸밈. 뼈대: The woman is a doctor.' },
    { type: 'mc', id: 'q10', q: '관계대명사 바로 뒤에 동사가 왔다면?', choices: ['주격', '목적격', '소유격', '관계부사'], answer: 0, explain: '뒤에 바로 동사 → 주격 (who / which / that).' },
  ],
}
