/** 앱 아이콘과 같은 마크 (public/icon.svg 와 모양을 맞춰 두세요): 종이 + 형광펜 + 잉크 M + 빨간펜 밑줄 */
export function LogoMark({ className = 'logo-mark' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" aria-hidden>
      <rect width="512" height="512" rx="104" fill="#f4efe4" stroke="#211e19" strokeWidth="14" />
      <path d="M86 318 L420 262 L432 352 L98 408 Z" fill="#ffd23f" />
      <path d="M146 372 V158 L256 290 L366 158 V372" fill="none" stroke="#211e19" strokeWidth="48" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M118 440 C210 418 318 414 404 428" fill="none" stroke="#d4422b" strokeWidth="20" strokeLinecap="round" />
    </svg>
  )
}
