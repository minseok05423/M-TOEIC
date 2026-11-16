/**
 * 단어 한 줄 읽기 (여러 개 붙여넣기). 화면과 상관없는 순수 함수라 tests/wordline.test.ts 에서 시험해요.
 */

/** 같은 단어인지 비교할 때 쓰는 영어 (대소문자 · 여러 칸 띄어쓰기 무시) */
export const normEn = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** 구(句) 는 숙어로 */
const SHORT: Record<string, string> = { 동: '동사', 명: '명사', 형: '형용사', 부: '부사', 전: '전치사', 접: '접속사', 숙: '숙어', 구: '숙어' }
const TAG = '(동사?|명사?|형(?:용사)?|부사?|전(?:치사)?|접(?:속사)?|숙어?|구)'
/** 품사 표시 하나: '(동)' '[명사]' '동:' '구 :'. 줄 처음이나 공백·쉼표·/ 뒤에서만 ('활동:' 같은 건 아님) */
const MARK = new RegExp(`(?:^|[\\s,/;])(?:[(\\[]\\s*${TAG}\\s*[)\\]]|${TAG}\\s*:)`, 'g')
const EDGE = /^[\s,/;=:\-–—]+|[\s,/;]+$/g

/**
 * "(동) 들다", "[명사] 그늘", "동: 들다", "구 : 플러그를 꽂다" 처럼 뜻 앞에 붙인 품사 표시를 떼어 냄 (여러 개 붙여넣기용).
 * 품사가 여러 개면 뜻도 그 자리에서 나눠요: "동: 그늘지게 하다, 명: 그늘" → '그늘지게 하다 / 그늘', '동사 / 명사'
 */
export function takePos(ko: string): { ko: string; pos?: string } {
  const marks = [...ko.matchAll(MARK)]
  if (!marks.length) return { ko: ko.trim() }
  const parts: { tag?: string; text: string }[] = []
  const head = ko.slice(0, marks[0].index).replace(EDGE, '')
  if (head) parts.push({ text: head })
  marks.forEach((m, i) => {
    const text = ko.slice(m.index + m[0].length, marks[i + 1]?.index ?? ko.length).replace(EDGE, '')
    if (text) parts.push({ tag: SHORT[(m[1] ?? m[2])[0]], text })
  })
  const found = parts.flatMap((p) => p.tag ?? [])
  if (!found.length) return { ko: parts.map((p) => p.text).join(' / ') }
  const pos = found.length === parts.length && new Set(found).size > 1 ? found.join(' / ') : [...new Set(found)].join('·')
  return { ko: parts.map((p) => p.text).join(' / '), pos }
}

/** 영어와 뜻 사이에 올 수 있는 구분 기호 */
const SEP = /[\s=:\-–—,|]/

/**
 * 한 줄에 단어 하나. 뜻은 첫 한글이 든 덩어리부터라서 구분 기호는 있어도 없어도 돼요:
 *   "set up 설치하다, 설립하다" · "look forward to ~ing ~을 고대하다" · "make sure (that) 반드시 ~하다"
 *   "fill out = (서류를) 작성하다" · "take off-벗다" · "A as well as B B뿐만 아니라 A도"
 * 덩어리는 한글 앞의 괄호·~·영어 글자까지 (공백이나 구분 기호에서 끊음). 한글이 없으면 첫 구분 기호에서 나눔.
 */
export function parseLine(line: string): { en: string; ko: string; pos?: string } | null {
  const tx = line.replace(/^\s*(?:\d+\s*[.)]|[-•*·]\s)\s*/, '').trim()
  if (!tx) return null
  let en: string
  let ko: string
  const h = tx.search(/[가-힣]/)
  if (h >= 0) {
    let s = h
    while (s > 0 && !SEP.test(tx[s - 1])) s--
    en = tx.slice(0, s).replace(/[\s=:\-–—,|]+$/, '')
    ko = tx.slice(s)
  } else {
    const m = tx.match(/^(.+?)\s*(?:\t|=|:|\s[-–—]\s|,)\s*(.+)$/)
    if (!m) return null
    en = m[1].trim()
    ko = m[2].trim()
  }
  if (!/[a-zA-Z]/.test(en)) return null
  const w = takePos(ko)
  return w.ko ? { en, ...w } : null
}
