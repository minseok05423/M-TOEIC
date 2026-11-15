/**
 * 화면 본문은 Layout 의 LayoutContent 안에서 스크롤돼요 (위·아래 바는 고정).
 * window.scrollTo 대신 이걸 쓰세요.
 */
export const SCROLL_ROOT = 'screen-scroll'

export function scrollToTop() {
  document.getElementById(SCROLL_ROOT)?.scrollTo(0, 0)
  window.scrollTo(0, 0)
}
