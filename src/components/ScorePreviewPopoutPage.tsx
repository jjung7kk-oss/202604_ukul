import { useEffect, useMemo, useState } from 'react'
import { parseScoreNotation, type ScoreNotationState } from '../lib/scoreNotation'
import { SCORE_PREVIEW_POPOUT_STORAGE_KEY } from '../lib/scorePreviewPopout'
import { ScoreSheetPreview, type PreviewLine } from './ScoreSheetPreview'

function coerceLines(raw: unknown): PreviewLine[] {
  if (!Array.isArray(raw)) return []
  return raw as PreviewLine[]
}

export function ScorePreviewPopoutPage() {
  const [title, setTitle] = useState('미리보기')
  const [lines, setLines] = useState<PreviewLine[]>([])
  const [notation, setNotation] = useState<ScoreNotationState>(() =>
    parseScoreNotation(null),
  )
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCORE_PREVIEW_POPOUT_STORAGE_KEY)
      if (!raw) {
        setLoaded(true)
        return
      }
      const parsed = JSON.parse(raw) as { v?: unknown; title?: unknown; lines?: unknown; notation?: unknown }
      if (parsed?.v !== 1) {
        setLoaded(true)
        return
      }
      const nextTitle =
        typeof parsed.title === 'string' && parsed.title.trim().length > 0
          ? parsed.title.trim()
          : '곡 제목'
      setTitle(nextTitle)
      setLines(coerceLines(parsed.lines))
      setNotation(parseScoreNotation(parsed.notation))
    } catch {
      setLines([])
    } finally {
      setLoaded(true)
    }
  }, [])

  const empty = useMemo(() => lines.length === 0, [lines.length])

  return (
    <div className="score-preview-popout-page">
      {loaded && empty ? (
        <p className="score-preview-popout-page__empty">
          표시할 미리보기가 없습니다. 악보 만들기에서「새 창 미리보기」를 다시 눌러 주세요.
        </p>
      ) : null}
      {loaded && !empty ? (
        <ScoreSheetPreview
          title={title}
          lines={lines}
          notation={notation}
          selectedMeasureKeys={new Set()}
          onToggleMeasureKey={() => {}}
          interactive={false}
        />
      ) : null}
    </div>
  )
}
