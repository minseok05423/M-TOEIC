import { useEffect } from 'react'

/** 퀴즈·카드처럼 집중해야 하는 화면에서 아래 탭바를 숨김 */
export function useImmersive() {
  useEffect(() => {
    document.body.classList.add('immersive')
    return () => document.body.classList.remove('immersive')
  }, [])
}
