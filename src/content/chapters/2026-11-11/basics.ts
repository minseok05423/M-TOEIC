import type { Lesson } from '../../types.ts'

export const basics: Lesson = {
  id: 'basics',
  title: '문장의 뼈대와 신호 단어',
  emoji: '🦴',
  summary: '긴 문장도 뼈대는 짧다! 신호 단어로 덩어리를 나누는 법',
  sections: [
    {
      heading: '영어는 "주어 → 동사" 순서',
      body: '한국어는 동사가 맨 끝에 와요. 영어는 **주어 바로 다음에 동사**가 와요.\n- 한국어: 나는 / 커피를 / 마신다\n- 영어: I / drink / coffee\n그래서 영어 문장을 보면 **"주어가 뭐지? 그 다음 동사는 어디지?"** 부터 찾으면 돼요.',
      examples: [
        { en: 'I drink coffee.', ko: '나는 커피를 마신다.' },
        { en: 'The store opens at 9.', ko: '그 가게는 9시에 연다.' },
      ],
    },
    {
      heading: '뼈대와 꾸밈',
      body: '**뼈대** = 주어 + 동사 (+ 목적어 / 보어)\n**꾸밈** = 나머지 전부 (언제, 어디서, 왜, 어떤…)\n토익 문장은 길어 보여도 꾸밈을 괄호로 묶어 지우면 뼈대는 아주 짧아요.',
      examples: [
        {
          en: 'The new manager (from the Seoul office) will visit our factory (on Friday).',
          ko: '뼈대: The new manager will visit our factory. (새 매니저가 우리 공장을 방문할 것이다)',
        },
      ],
    },
    {
      heading: '덩어리를 알려주는 신호 단어 5가지',
      body: '아래 단어들은 "여기서 덩어리가 시작돼요!" 라고 알려주는 **신호등**이에요. 이번 챕터에서 하나씩 배워요.',
      table: [
        ['신호 단어', '예', '보이면?'],
        ['전치사', 'in, at, for, during', '뒤에 명사 덩어리 → ( ) 괄호'],
        ['조동사', 'can, will, should', '바로 뒤가 동사!'],
        ['접속사', 'because, although, if', '새 문장(주어+동사) 시작'],
        ['관계대명사', 'who, which, that', '앞 명사 설명 시작'],
        ['품사 어미', '-tion, -ful, -ly', '단어 끝으로 품사 짐작'],
      ],
    },
    {
      heading: '이 앱의 "문장" 탭 사용법',
      body: '- 색칠된 단어를 누르면 그 단어의 **역할**이 나와요.\n- **뼈대만 보기**를 누르면 꾸밈이 흐려지고 뼈대만 남아요.\n- 🔊 버튼으로 원어민 발음(기기 음성)을 들을 수 있어요.\n- **끊어 읽기**는 영어 순서 그대로 앞에서부터 해석하는 연습이에요.',
    },
  ],
  words: [],
  sentences: [
    {
      id: 'b1',
      text: '[I|S] [drink|V] [coffee|O] [every morning|ADV].',
      ko: '나는 매일 아침 커피를 마신다.',
      slash: 'I drink coffee / every morning.',
    },
    {
      id: 'b2',
      text: '[The new manager|S] [from|PREP|from + 명사 → 꾸밈 덩어리] the Seoul office [will|MOD] [visit|V] [our factory|O] [on|PREP] Friday.',
      ko: '서울 지사에서 온 새 매니저가 금요일에 우리 공장을 방문할 것이다.',
      slash: 'The new manager / from the Seoul office / will visit our factory / on Friday.',
      note: '뼈대: The new manager will visit our factory.',
    },
    {
      id: 'b3',
      text: '[Ms. Kim|S] [is|V] [busy|C] [because|CONJ|여기서 새 문장 시작 (she has…)] [she|s] [has|v] [a meeting|o] [at|PREP] 3 p.m.',
      ko: '김 씨는 오후 3시에 회의가 있어서 바쁘다.',
      slash: 'Ms. Kim is busy / because she has a meeting / at 3 p.m.',
    },
    {
      id: 'b4',
      text: '[The printer|S] [that|REL|앞의 The printer를 설명 시작] [we|s] [bought|v] [last week|adv] [is|V] [broken|C].',
      ko: '우리가 지난주에 산 프린터는 고장 났다.',
      slash: 'The printer / that we bought last week / is broken.',
      note: '뼈대: The printer is broken.',
    },
  ],
  quiz: [
    {
      type: 'mc',
      id: 'q1',
      q: '영어 문장에서 주어 바로 다음에 주로 오는 것은?',
      choices: ['목적어', '동사', '전치사', '형용사'],
      answer: 1,
      explain: '영어는 "주어 → 동사" 순서예요. I drink coffee.',
    },
    {
      type: 'tap',
      id: 'q2',
      prompt: '이 문장의 동사를 고르세요.',
      text: 'The staff *meets* every Monday.',
      explain: 'The staff(주어) 다음에 오는 meets(모인다)가 동사예요.',
      ko: '직원들은 매주 월요일에 모인다.',
    },
    {
      type: 'tap',
      id: 'q3',
      prompt: '이 문장의 주어를 고르세요.',
      text: '*Customers* can return items within 30 days.',
      explain: '동사(can return) 앞에 있는 Customers(고객들)가 주어예요.',
      ko: '고객들은 30일 이내에 물건을 반품할 수 있다.',
    },
    {
      type: 'mc',
      id: 'q4',
      q: 'The manager of the sales team will call you tomorrow.\n이 문장의 뼈대는?',
      choices: [
        'The manager will call you.',
        'The sales team will call you.',
        'The manager of the sales team.',
        'will call you tomorrow.',
      ],
      answer: 0,
      explain: 'of the sales team (전치사 덩어리), tomorrow (때)는 꾸밈이에요. 뼈대: The manager will call you.',
      ko: '영업팀 매니저가 내일 당신에게 전화할 것이다.',
    },
    {
      type: 'mc',
      id: 'q5',
      q: 'because 를 보면 어떤 생각을 해야 할까요?',
      choices: [
        '뒤에 명사 하나만 온다',
        '여기서 새 문장(주어+동사)이 시작된다',
        '바로 뒤에 동사원형이 온다',
        '앞의 명사를 설명한다',
      ],
      answer: 1,
      explain: 'because는 접속사예요. 뒤에 "주어 + 동사"가 있는 문장이 하나 더 와요.',
    },
    {
      type: 'mc',
      id: 'q6',
      q: 'can, will, should 바로 뒤에 오는 것은?',
      choices: ['동사원형', '명사', '-ing', '-ed'],
      answer: 0,
      explain: '조동사 뒤에는 항상 동사원형! (will go, can swim)',
    },
    {
      type: 'tap',
      id: 'q7',
      prompt: '전치사를 고르세요.',
      text: 'We had lunch *at* a Korean restaurant.',
      explain: 'at + a Korean restaurant (명사) → at 이 전치사예요.',
      ko: '우리는 한국 식당에서 점심을 먹었다.',
    },
  ],
}
