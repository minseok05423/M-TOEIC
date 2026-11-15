import { Avatar } from '@astryxdesign/core/Avatar'

/** 앱 아이콘 (public/icon.svg): 종이 + 형광펜 + 잉크 M + 빨간펜 밑줄 */
export function LogoMark({ size = 48 }: { size?: 32 | 48 | 64 | 72 }) {
  return <Avatar src="/icon.svg" name="M-TOEIC" alt="" shape="rounded" size={size} tooltip={false} />
}
