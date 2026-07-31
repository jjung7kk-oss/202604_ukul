/** 같은 출처의 새 창은 sessionStorage를 공유하지 않으므로 localStorage 사용 */
export const SCORE_PREVIEW_POPOUT_STORAGE_KEY = 'ukul-score-preview-popout-v1'

export type ScorePreviewPopoutStoredV1 = {
  v: 1
  title: string
  artist?: string
  lines: unknown
  notation: unknown
  selectedUnknownChords?: unknown
  showUnknownChordsBelowTitle?: unknown
  unknownChordBodyMode?: unknown
}
