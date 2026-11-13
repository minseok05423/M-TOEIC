/**
 * 모든 챕터 목록. 새 챕터를 만들면 여기에 import 해서 배열에 추가하세요.
 * 순서는 상관없어요 (앱에서 날짜 최신순으로 정렬).
 */
import type { Chapter } from '../types.ts'
import { chapter as c20261111 } from './2026-11-11/index.ts'
import { chapter as c20261114 } from './2026-11-14/index.ts'

export const CHAPTERS: Chapter[] = [c20261111, c20261114].sort((a, b) => b.date.localeCompare(a.date))
