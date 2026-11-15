import '@astryxdesign/core/reset.css'
import '@astryxdesign/core/astryx.css'
// 글꼴: 한국어 Pretendard (테마 본문 글꼴), 영어 단어·문장은 Fraunces (src/ui/styles.ts 의 en)
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import '@fontsource-variable/fraunces/opsz.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Root } from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
    // 나머지 화면도 미리 받아 두기 → 서비스 워커가 캐시해서 오프라인에서도 열림
    const screens = import.meta.glob('./screens/*.tsx')
    setTimeout(() => Object.values(screens).forEach((load) => void load()), 3000)
  })
}
