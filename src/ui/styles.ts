/**
 * 우리 앱만의 스타일. Astryx 컴포넌트에 xstyle 로 붙여요.
 * 색·간격·모서리는 전부 Astryx 토큰(var(--color-*), var(--spacing-*), var(--radius-*))만 써요.
 * 팔레트를 바꾸려면 테마(themes/notebook)를 바꾸세요: npx astryx experimental theme editor …
 */
import * as stylex from '@stylexjs/stylex'

export type Hue = 'blue' | 'red' | 'green' | 'purple' | 'orange' | 'cyan' | 'pink' | 'yellow' | 'teal' | 'gray'

/** 영어 단어·문장: 사전처럼 세리프. 한글은 테마 본문 글꼴로 넘어감 */
export const type = stylex.create({
  en: { fontFamily: "'Fraunces Variable', var(--font-family-body)", letterSpacing: 0 },
  enBig: {
    fontFamily: "'Fraunces Variable', var(--font-family-body)",
    fontSize: 'var(--font-size-4xl)',
    lineHeight: 1.15,
    fontWeight: 'var(--font-weight-semibold)',
  },
  enLarge: {
    fontFamily: "'Fraunces Variable', var(--font-family-body)",
    fontSize: 'var(--font-size-xl)',
    lineHeight: 1.6,
  },
  keepAll: { wordBreak: 'keep-all', overflowWrap: 'anywhere' },
  center: { textAlign: 'center' },
})

/** 문장 분석 태그 색 (글자) */
export const hueText = stylex.create({
  blue: { color: 'var(--color-text-blue)' },
  red: { color: 'var(--color-text-red)' },
  green: { color: 'var(--color-text-green)' },
  purple: { color: 'var(--color-text-purple)' },
  orange: { color: 'var(--color-text-orange)' },
  cyan: { color: 'var(--color-text-cyan)' },
  pink: { color: 'var(--color-text-pink)' },
  yellow: { color: 'var(--color-text-yellow)' },
  teal: { color: 'var(--color-text-teal)' },
  gray: { color: 'var(--color-text-gray)' },
})

/** 문장 분석 태그 색 (밑줄). 주절은 실선, 절 안은 점선 */
export const hueUnderline = stylex.create({
  blue: { borderBottomColor: 'var(--color-border-blue)' },
  red: { borderBottomColor: 'var(--color-border-red)' },
  green: { borderBottomColor: 'var(--color-border-green)' },
  purple: { borderBottomColor: 'var(--color-border-purple)' },
  orange: { borderBottomColor: 'var(--color-border-orange)' },
  cyan: { borderBottomColor: 'var(--color-border-cyan)' },
  pink: { borderBottomColor: 'var(--color-border-pink)' },
  yellow: { borderBottomColor: 'var(--color-border-yellow)' },
  teal: { borderBottomColor: 'var(--color-border-teal)' },
  gray: { borderBottomColor: 'var(--color-border-gray)' },
})

/** 문장 분석 태그 색 (바탕) */
export const hueFill = stylex.create({
  blue: { backgroundColor: 'var(--color-background-blue)' },
  red: { backgroundColor: 'var(--color-background-red)' },
  green: { backgroundColor: 'var(--color-background-green)' },
  purple: { backgroundColor: 'var(--color-background-purple)' },
  orange: { backgroundColor: 'var(--color-background-orange)' },
  cyan: { backgroundColor: 'var(--color-background-cyan)' },
  pink: { backgroundColor: 'var(--color-background-pink)' },
  yellow: { backgroundColor: 'var(--color-background-yellow)' },
  teal: { backgroundColor: 'var(--color-background-teal)' },
  gray: { backgroundColor: 'var(--color-background-gray)' },
})

const pop = stylex.keyframes({
  '0%': { transform: 'scale(0.4)', opacity: 0 },
  '70%': { transform: 'scale(1.15)', opacity: 1 },
  '100%': { transform: 'scale(1)', opacity: 1 },
})

const shake = stylex.keyframes({
  '0%, 100%': { transform: 'translateX(0)' },
  '25%': { transform: 'translateX(calc(var(--spacing-1) * -1))' },
  '75%': { transform: 'translateX(var(--spacing-1))' },
})

const rise = stylex.keyframes({
  from: { transform: 'translateY(var(--spacing-3))', opacity: 0 },
  to: { transform: 'translateY(0)', opacity: 1 },
})

export const motion = stylex.create({
  pop: {
    animationName: pop,
    animationDuration: 'var(--duration-medium)',
    animationTimingFunction: 'var(--ease-entrance)',
    animationFillMode: 'both',
  },
  shake: { animationName: shake, animationDuration: 'var(--duration-medium)', animationIterationCount: 2 },
  rise: { animationName: rise, animationDuration: 'var(--duration-medium)', animationTimingFunction: 'var(--ease-entrance)' },
  delay1: { animationDelay: 'var(--duration-fast)' },
  delay2: { animationDelay: 'var(--duration-medium)' },
})

/** 정답·오답 보기, 짝 맞추기 타일 */
export const answer = stylex.create({
  right: {
    backgroundColor: 'var(--color-success-muted)',
    borderColor: 'var(--color-border-success)',
    color: 'var(--color-on-success-muted)',
  },
  wrong: {
    backgroundColor: 'var(--color-error-muted)',
    borderColor: 'var(--color-border-error)',
    color: 'var(--color-on-error-muted)',
  },
  selected: { boxShadow: 'var(--shadow-inset-selected)', backgroundColor: 'var(--color-accent-muted)' },
  dim: { opacity: 0.45 },
  gone: { opacity: 0, pointerEvents: 'none' },
  hint: { boxShadow: 'var(--shadow-inset-warning)' },
})

export const layout = stylex.create({
  /** 버튼 안에서 왼쪽 정렬 (보기 버튼) */
  start: { justifyContent: 'flex-start', textAlign: 'start' },
  /** 휴대폰 아래 홈 인디케이터 자리 */
  safeBottom: { paddingBottom: 'max(var(--spacing-3), env(safe-area-inset-bottom))' },
  /** 동그란 번호 (레슨 번호, 도장) */
  dot: {
    width: 'var(--size-element-md)',
    height: 'var(--size-element-md)',
    flexShrink: 0,
    borderRadius: 'var(--radius-full)',
    borderWidth: 'var(--border-width)',
    borderStyle: 'solid',
    borderColor: 'var(--color-border-emphasized)',
    backgroundColor: 'var(--color-background-card)',
    color: 'var(--color-text-primary)',
    fontWeight: 'var(--font-weight-semibold)',
  },
  dotDone: {
    backgroundColor: 'var(--color-success)',
    borderColor: 'var(--color-success)',
    color: 'var(--color-on-success)',
  },
  dotNext: {
    backgroundColor: 'var(--color-accent)',
    borderColor: 'var(--color-accent)',
    color: 'var(--color-on-accent)',
  },
  dotToday: { borderColor: 'var(--color-text-primary)', borderWidth: 'calc(var(--border-width) * 2)' },
  dotEmpty: { borderStyle: 'dashed', color: 'var(--color-text-secondary)' },
  /** 문장 분석: 조각마다 밑줄 */
  tok: {
    borderBottomWidth: 'calc(var(--border-width) * 3)',
    borderBottomStyle: 'solid',
    borderRadius: 'var(--radius-inner)',
    paddingInline: 'var(--spacing-1)',
    height: 'auto',
    minHeight: 'var(--size-element-md)',
  },
  tokClause: { borderBottomStyle: 'dashed' },
  tokFaded: { opacity: 0.35 },
  /** 짧은 진행 막대 (외운 정도) */
  meter: { width: 'calc(var(--spacing-12) + var(--spacing-4))', flexShrink: 0 },
  /** 형광펜 밑줄 */
  highlight: {
    backgroundImage: 'linear-gradient(transparent 55%, var(--color-accent-muted) 55%)',
    paddingInline: 'var(--spacing-0-5)',
  },
  /** 빈칸 */
  blank: {
    display: 'inline-block',
    minWidth: 'calc(var(--spacing-12) + var(--spacing-6))',
    borderBottomWidth: 'calc(var(--border-width) * 2)',
    borderBottomStyle: 'solid',
    borderBottomColor: 'var(--color-text-primary)',
    textAlign: 'center',
  },
  blankFilled: { borderBottomColor: 'var(--color-success)', color: 'var(--color-text-success)' },
  fill: { flexGrow: 1, minWidth: 0 },
  /** 받은 별: 잉크 테두리 + 형광펜 노랑 */
  starOn: { color: 'var(--color-text-primary)', fill: 'var(--color-accent)' },
  starOff: { color: 'var(--color-icon-disabled)', fill: 'none' },
  full: { width: '100%' },
})
