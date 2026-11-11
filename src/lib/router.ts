import { useEffect, useState } from 'react'

/** 해시 라우팅 '#/a/b' → ['a', 'b']. 휴대폰 뒤로가기 버튼이 그대로 동작함 */
function parse(): string[] {
  return location.hash
    .replace(/^#\/?/, '')
    .split('?')[0]
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent)
}

export function useRoute(): string[] {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const on = () => {
      setRoute(parse())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export function href(...parts: string[]): string {
  return '#/' + parts.map(encodeURIComponent).join('/')
}

export function go(...parts: string[]) {
  location.hash = href(...parts).slice(1)
}

/** 바꿔치기 이동 (뒤로가기 기록에 안 남음) */
export function replace(...parts: string[]) {
  history.replaceState(null, '', href(...parts))
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}
