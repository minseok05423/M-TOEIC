/**
 * 콘텐츠 스키마. 새 챕터를 만들 때는 CONTENT_GUIDE.md 를 참고하세요.
 *
 * 챕터 = 수업에서 학생이 약했던 부분 하나 (날짜별로 추가)
 * 레슨 = 챕터 안의 작은 주제 (설명 → 단어 → 문장 분석 → 퀴즈)
 */

export interface Chapter {
  /** 'YYYY-MM-DD-slug'. 한 번 정하면 바꾸지 마세요 (학습 기록 키로 쓰임) */
  id: string
  /** 수업 날짜 'YYYY-MM-DD' */
  date: string
  title: string
  subtitle?: string
  /** 왜 이 챕터를 만들었는지 (수업에서 어디가 약했는지) */
  reason: string
  lessons: Lesson[]
}

export interface Lesson {
  /** 챕터 안에서 유일한 짧은 id. 바꾸지 마세요 */
  id: string
  title: string
  /** 지금은 화면에 표시하지 않음 (홈에서는 레슨 번호를 보여줌) */
  emoji: string
  /** 한 줄 요약 */
  summary: string
  /** 설명 카드들 */
  sections: Section[]
  words: Word[]
  sentences: AnalyzedSentence[]
  quiz: Question[]
}

export interface Section {
  heading: string
  /** 여러 줄 가능. **굵게** 지원. 줄 맨 앞 '- ' 는 글머리표, '💡 ' 는 팁 박스, '⚠️ ' 는 주의 박스 */
  body: string
  examples?: Example[]
  /** 표: 첫 행이 헤더 */
  table?: string[][]
}

export interface Example {
  en: string
  ko: string
}

export interface Word {
  /** 생략하면 en 으로 자동 생성. 단어 복습 기록의 키 */
  id?: string
  en: string
  ko: string
  /** 묶음 이름 (예: '시간', '장소'). 단어 탭에서 그룹으로 보여줌 */
  group?: string
  ex?: Example
  tip?: string
}

/**
 * 문장 분석 마크업:
 *   [텍스트|태그]         → 색칠 + 탭하면 역할 표시
 *   [텍스트|태그|설명]    → 탭하면 설명까지 표시
 *   나머지 일반 텍스트     → 그대로
 *
 * 태그 (대문자 = 주절, 소문자 = 종속절/관계절 안):
 *   S 주어 · V 동사 · O 목적어 · C 보어 · MOD 조동사
 *   PREP 전치사 · CONJ 접속사 · REL 관계사
 *   N 명사 · ADJ 형용사 · ADV 부사
 *
 * '뼈대만 보기'를 누르면 대문자 S/V/O/C/MOD 만 진하게 남고 나머지는 흐려집니다.
 */
export interface AnalyzedSentence {
  id: string
  text: string
  ko: string
  /** 끊어 읽기: 'The meeting will start / at 9 a.m.' */
  slash?: string
  note?: string
}

export type Question = McQuestion | TapQuestion

/** 객관식. q 안의 ____ 는 빈칸으로 표시 */
export interface McQuestion {
  type: 'mc'
  id: string
  q: string
  choices: string[]
  /** 정답 index (0부터) */
  answer: number
  explain: string
  /** 문장 해석 (정답 확인 후 표시) */
  ko?: string
}

/** 문장에서 단어 고르기. 정답 부분을 *별표*로 감싸기: 'I stayed home *because* it rained.' */
export interface TapQuestion {
  type: 'tap'
  id: string
  prompt: string
  text: string
  explain: string
  ko?: string
}

/**
 * 맞춤 챕터 파일(personal/*.ts)에서 chapter 와 같이 내보내는 정보.
 * `npm run teacher -- push personal/<파일>.ts` 가 이걸 보고 누구에게 올릴지, 어떤 메모를 반영 표시할지 정함.
 */
export interface PersonalMeta {
  /** 학생 로그인 이메일 */
  user: string
  /** 이 챕터로 반영한 메모 id → 학생에게 보여 줄 선생님 한마디 (빈 문자열이면 한마디 없이 '반영됨'만) */
  notes?: Record<string, string>
}
