/**
 * 토익 Part 1 (사진 묘사) 듣기 연습. 직접 쓴 문제 (저작권 걱정 없음).
 * 사진 대신 장면을 한국어로 보여 주고, 네 문장을 휴대폰 음성으로 들려줘요. 문장은 답한 뒤에 보여요 (실제 시험처럼).
 * 학생 단어장(1·2일차)의 Part 1 동사와 단골 함정(wearing ↔ putting on, is being -ed ↔ has been -ed)으로 만들었어요.
 * 검사: tests/part1.test.ts
 */
export interface Part1Item {
  id: string
  /** 사진에 보이는 것 (한국어) */
  scene: string
  options: { en: string; ko: string }[]
  /** 정답 index (0부터) */
  answer: number
  explain: string
  /** 이 문제의 핵심 단어 */
  words: string[]
}

export const PART1: Part1Item[] = [
  {
    id: 'mow',
    scene: '한 남자가 잔디 깎는 기계를 밀며 잔디를 깎고 있다.',
    options: [
      { en: 'A man is mowing the lawn.', ko: '남자가 잔디를 깎고 있다.' },
      { en: 'A man is raking some leaves.', ko: '남자가 갈퀴로 낙엽을 긁어모으고 있다.' },
      { en: 'A man is planting a tree.', ko: '남자가 나무를 심고 있다.' },
      { en: 'The lawn has been covered with leaves.', ko: '잔디가 낙엽으로 덮여 있다.' },
    ],
    answer: 0,
    explain: 'mow = (잔디를) 깎다. rake 는 갈퀴로 긁어모으는 거예요.',
    words: ['mow', 'rake'],
  },
  {
    id: 'wear',
    scene: '재킷을 이미 입은 여자가 가방을 들고 서 있다.',
    options: [
      { en: 'A woman is putting on a jacket.', ko: '여자가 재킷을 입는 중이다.' },
      { en: 'A woman is wearing a jacket.', ko: '여자가 재킷을 입고 있다.' },
      { en: 'A woman is taking off a jacket.', ko: '여자가 재킷을 벗는 중이다.' },
      { en: 'A woman is hanging a jacket on a hook.', ko: '여자가 재킷을 고리에 걸고 있다.' },
    ],
    answer: 1,
    explain: 'wear = 입고 있는 상태, put on = 입는 동작. 이미 입은 사진이면 wearing! Part 1 단골 함정이에요.',
    words: ['wear', 'put on', 'hang'],
  },
  {
    id: 'stack',
    scene: '창고 바닥에 상자들이 차곡차곡 쌓여 있다. 사람은 없다.',
    options: [
      { en: 'A worker is stacking some boxes.', ko: '작업자가 상자를 쌓고 있다.' },
      { en: 'Some boxes are being loaded onto a truck.', ko: '상자들이 트럭에 실리는 중이다.' },
      { en: 'Some boxes have been stacked on the floor.', ko: '상자들이 바닥에 쌓여 있다.' },
      { en: 'The floor is being swept.', ko: '바닥을 쓰는 중이다.' },
    ],
    answer: 2,
    explain: '사람이 없으면 "is being -ed (누가 하는 중)" 는 거의 오답이에요. "have been -ed" = 이미 그렇게 되어 있는 상태.',
    words: ['stack', 'load'],
  },
  {
    id: 'lean',
    scene: '사다리 하나가 벽에 기대어 세워져 있다.',
    options: [
      { en: 'A man is climbing a ladder.', ko: '남자가 사다리를 오르고 있다.' },
      { en: 'A ladder is being carried.', ko: '사다리가 옮겨지는 중이다.' },
      { en: 'A wall is being painted.', ko: '벽을 칠하는 중이다.' },
      { en: 'A ladder is leaning against a wall.', ko: '사다리가 벽에 기대어 있다.' },
    ],
    answer: 3,
    explain: 'lean against = ~에 기대다. 물건이 기대어 있는 상태도 "is leaning" 으로 말해요.',
    words: ['lean', 'carry'],
  },
  {
    id: 'pour',
    scene: '여자가 주전자로 컵에 커피를 따르고 있다.',
    options: [
      { en: 'A woman is drinking from a cup.', ko: '여자가 컵으로 마시고 있다.' },
      { en: 'A woman is pouring coffee into a cup.', ko: '여자가 컵에 커피를 따르고 있다.' },
      { en: 'A woman is washing some cups.', ko: '여자가 컵을 씻고 있다.' },
      { en: 'Some cups have been filled with water.', ko: '컵들에 물이 채워져 있다.' },
    ],
    answer: 1,
    explain: 'pour = 붓다, 따르다. fill 은 "채우다" 인데 물이 아니라 커피고, 지금 따르는 중이에요.',
    words: ['pour', 'fill'],
  },
  {
    id: 'line',
    scene: '사람들이 버스 정류장에 한 줄로 서서 기다리고 있다.',
    options: [
      { en: 'Some people are getting off a bus.', ko: '사람들이 버스에서 내리고 있다.' },
      { en: 'Some people are crossing the street.', ko: '사람들이 길을 건너고 있다.' },
      { en: 'Some people are lined up at a bus stop.', ko: '사람들이 버스 정류장에 줄 서 있다.' },
      { en: 'A bus is being towed.', ko: '버스가 견인되는 중이다.' },
    ],
    answer: 2,
    explain: 'be lined up = 줄 서 있다 (line = ~을 따라 늘어서다). cross = 건너다.',
    words: ['line', 'cross'],
  },
  {
    id: 'tow',
    scene: '고장 난 트럭이 견인차에 매달려 끌려가고 있다.',
    options: [
      { en: 'A truck is being towed.', ko: '트럭이 견인되는 중이다.' },
      { en: 'A truck is being loaded with boxes.', ko: '트럭에 상자를 싣는 중이다.' },
      { en: 'A truck is parked in a garage.', ko: '트럭이 차고에 세워져 있다.' },
      { en: 'A man is washing a truck.', ko: '남자가 트럭을 세차하고 있다.' },
    ],
    answer: 0,
    explain: 'tow = 견인하다. 끌려가는 중인 게 보이면 "is being towed" 가 맞아요.',
    words: ['tow', 'load'],
  },
  {
    id: 'kneel',
    scene: '남자가 바닥에 무릎을 꿇고 앉아 타일을 자세히 보고 있다.',
    options: [
      { en: 'A man is bending over a desk.', ko: '남자가 책상 위로 몸을 숙이고 있다.' },
      { en: 'A man is kneeling on the floor.', ko: '남자가 바닥에 무릎을 꿇고 있다.' },
      { en: 'A man is sitting on a bench.', ko: '남자가 벤치에 앉아 있다.' },
      { en: 'A man is mopping the floor.', ko: '남자가 바닥을 대걸레로 닦고 있다.' },
    ],
    answer: 1,
    explain: 'kneel = 무릎을 꿇다. bend over = 몸을 숙이다. inspect (자세히 살펴보다) 도 같이 기억해요.',
    words: ['kneel', 'bend', 'inspect'],
  },
  {
    id: 'distribute',
    scene: '회의실에서 여자가 사람들에게 서류를 한 장씩 나눠 주고 있다.',
    options: [
      { en: 'A woman is filing some documents.', ko: '여자가 서류를 철하고 있다.' },
      { en: 'A woman is making copies.', ko: '여자가 복사를 하고 있다.' },
      { en: 'Some papers are scattered on the floor.', ko: '서류가 바닥에 흩어져 있다.' },
      { en: 'A woman is distributing some papers.', ko: '여자가 서류를 나눠 주고 있다.' },
    ],
    answer: 3,
    explain: 'distribute = 나누어 주다 (= hand out). file = 서류를 철하다, scatter = 흩뿌리다.',
    words: ['distribute', 'file', 'scatter'],
  },
  {
    id: 'float',
    scene: '잔잔한 호수 위에 작은 배 몇 척이 떠 있다. 사람은 보이지 않는다.',
    options: [
      { en: 'Some boats are floating on the water.', ko: '배 몇 척이 물 위에 떠 있다.' },
      { en: 'Some boats are being repaired.', ko: '배들을 수리하는 중이다.' },
      { en: 'Some people are swimming in a lake.', ko: '사람들이 호수에서 수영하고 있다.' },
      { en: 'Some trees are being planted.', ko: '나무를 심는 중이다.' },
    ],
    answer: 0,
    explain: 'float = (물에) 뜨다. 사람이 없으니 being 문장(B, D)은 오답이에요.',
    words: ['float', 'plant'],
  },
  {
    id: 'fold',
    scene: '남자가 침대 위에서 셔츠를 개고 있다.',
    options: [
      { en: 'A man is hanging a shirt in a closet.', ko: '남자가 옷장에 셔츠를 걸고 있다.' },
      { en: 'A man is putting on a shirt.', ko: '남자가 셔츠를 입는 중이다.' },
      { en: 'A man is folding some clothes.', ko: '남자가 옷을 개고 있다.' },
      { en: 'A man is ironing a shirt.', ko: '남자가 셔츠를 다리고 있다.' },
    ],
    answer: 2,
    explain: 'fold = 접다, 개다. hang = 걸다, put on = 입는 동작.',
    words: ['fold', 'hang', 'put on'],
  },
  {
    id: 'greet',
    scene: '두 남자가 로비에서 악수하며 인사하고 있다.',
    options: [
      { en: 'Two men are clapping their hands.', ko: '두 남자가 박수를 치고 있다.' },
      { en: 'Two men are greeting each other.', ko: '두 남자가 서로 인사하고 있다.' },
      { en: 'Two men are bowing to an audience.', ko: '두 남자가 관객에게 고개 숙여 인사하고 있다.' },
      { en: 'Two men are seated at a table.', ko: '두 남자가 테이블에 앉아 있다.' },
    ],
    answer: 1,
    explain: 'greet = 인사하다, 맞이하다. bow 도 인사지만 "고개 숙여" 하는 인사예요. be seated = 앉아 있다.',
    words: ['greet', 'clap', 'bow', 'be seated'],
  },
  {
    id: 'trim',
    scene: '정원사가 큰 가위로 덤불을 다듬고 있다.',
    options: [
      { en: 'A gardener is watering some plants.', ko: '정원사가 식물에 물을 주고 있다.' },
      { en: 'A gardener is raking some leaves.', ko: '정원사가 갈퀴로 낙엽을 모으고 있다.' },
      { en: 'Some bushes have been removed.', ko: '덤불이 치워져 있다.' },
      { en: 'A gardener is trimming some bushes.', ko: '정원사가 덤불을 다듬고 있다.' },
    ],
    answer: 3,
    explain: 'trim = 다듬다, 손질하다. rake 와 헷갈리지 않게!',
    words: ['trim', 'rake'],
  },
  {
    id: 'pave',
    scene: '작업자들이 기계로 도로에 새 아스팔트를 깔고 있다.',
    options: [
      { en: 'A road is being paved.', ko: '도로를 포장하는 중이다.' },
      { en: 'Some cars are driving on the road.', ko: '차들이 도로를 달리고 있다.' },
      { en: 'Some workers are crossing a bridge.', ko: '작업자들이 다리를 건너고 있다.' },
      { en: 'Some workers are taking a break.', ko: '작업자들이 쉬고 있다.' },
    ],
    answer: 0,
    explain: 'pave = (도로를) 포장하다. 사람이 일하는 게 보이면 "is being -ed" 가 맞을 수 있어요.',
    words: ['pave', 'cross'],
  },
  {
    id: 'plug',
    scene: '남자가 책상 아래에서 노트북 전원 선을 콘센트에 꽂고 있다.',
    options: [
      { en: 'A man is typing on a keyboard.', ko: '남자가 키보드를 치고 있다.' },
      { en: 'A man is carrying a laptop.', ko: '남자가 노트북을 들고 가고 있다.' },
      { en: 'A man is plugging in a cable.', ko: '남자가 선을 꽂고 있다.' },
      { en: 'A man is turning off a monitor.', ko: '남자가 모니터를 끄고 있다.' },
    ],
    answer: 2,
    explain: 'plug in = 플러그를 꽂다. turn on / off = 켜다 / 끄다.',
    words: ['plug in', 'turn on', 'carry'],
  },
  {
    id: 'reach',
    scene: '여자가 높은 선반 위의 상자를 잡으려고 팔을 뻗고 있다.',
    options: [
      { en: 'A woman is pointing at a sign.', ko: '여자가 표지판을 가리키고 있다.' },
      { en: 'A woman is reaching for a box on a shelf.', ko: '여자가 선반의 상자에 손을 뻗고 있다.' },
      { en: 'Some shelves are being assembled.', ko: '선반을 조립하는 중이다.' },
      { en: 'A woman is arranging some books.', ko: '여자가 책을 정리하고 있다.' },
    ],
    answer: 1,
    explain: 'reach (for) = (손을) 뻗다. point = 가리키다, assemble = 조립하다, arrange = 정리하다.',
    words: ['reach', 'point', 'assemble', 'arrange'],
  },
  {
    id: 'place',
    scene: '긴 테이블 위에 꽃병 몇 개가 나란히 놓여 있다. 사람은 없다.',
    options: [
      { en: 'Some flowers are being arranged.', ko: '꽃을 꽂는(정리하는) 중이다.' },
      { en: 'A tablecloth is being folded.', ko: '식탁보를 접는 중이다.' },
      { en: 'A woman is pouring water into a vase.', ko: '여자가 꽃병에 물을 붓고 있다.' },
      { en: 'Some vases have been placed on a table.', ko: '꽃병 몇 개가 테이블에 놓여 있다.' },
    ],
    answer: 3,
    explain: 'place = 놓다. have been placed = 놓여 있다 (상태). 사람이 없으면 being 은 오답!',
    words: ['place', 'arrange', 'fold'],
  },
  {
    id: 'stroll',
    scene: '사람들이 공원 오솔길을 천천히 걷고 있다.',
    options: [
      { en: 'Some people are strolling along a path.', ko: '사람들이 길을 따라 산책하고 있다.' },
      { en: 'Some people are running a race.', ko: '사람들이 달리기 경주를 하고 있다.' },
      { en: 'Some people are sitting on the grass.', ko: '사람들이 잔디에 앉아 있다.' },
      { en: 'A path is being paved.', ko: '길을 포장하는 중이다.' },
    ],
    answer: 0,
    explain: 'stroll = 거닐다, 산책하다. 천천히 걷는 거예요.',
    words: ['stroll', 'pave'],
  },
]
