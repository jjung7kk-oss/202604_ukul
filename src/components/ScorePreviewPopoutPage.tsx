import { useEffect, useMemo, useState } from 'react'
import { parseScoreNotation, type ScoreNotationState } from '../lib/scoreNotation'
import {
  SCORE_PREVIEW_POPOUT_STORAGE_KEY,
  type ScorePreviewPopoutStoredV1,
} from '../lib/scorePreviewPopout'
import { useChordLibrary } from '../hooks/useChordLibrary'
import { getRepresentativeShapeForSymbol } from '../utils/chordSymbolShape'
import { ScoreSheetPreview, type PreviewLine } from './ScoreSheetPreview'

function coerceLines(raw: unknown): PreviewLine[] {
  if (!Array.isArray(raw)) return []
  return raw as PreviewLine[]
}

export function ScorePreviewPopoutPage() {
  const { library: chordLibrary } = useChordLibrary()
  const [title, setTitle] = useState('미리보기')
  const [artist, setArtist] = useState('')
  const [lines, setLines] = useState<PreviewLine[]>([])
  const [notation, setNotation] = useState<ScoreNotationState>(() =>
    parseScoreNotation(null),
  )
  const [selectedUnknownChords, setSelectedUnknownChords] = useState<string[]>([])
  const [showUnknownChordsBelowTitle, setShowUnknownChordsBelowTitle] = useState(false)
  const [unknownChordBodyMode, setUnknownChordBodyMode] = useState<'none' | 'first' | 'all'>('none')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCORE_PREVIEW_POPOUT_STORAGE_KEY)
      if (!raw) {
        setLoaded(true)
        return
      }
      const parsed = JSON.parse(raw) as ScorePreviewPopoutStoredV1 & {
        v?: unknown
      }
      if (parsed?.v !== 1) {
        setLoaded(true)
        return
      }
      const nextTitle =
        typeof parsed.title === 'string' && parsed.title.trim().length > 0
          ? parsed.title.trim()
          : '곡 제목'
      setTitle(nextTitle)
      setArtist(typeof parsed.artist === 'string' ? parsed.artist.trim() : '')
      setLines(coerceLines(parsed.lines))
      setNotation(parseScoreNotation(parsed.notation))
      setSelectedUnknownChords(
        Array.isArray(parsed.selectedUnknownChords)
          ? parsed.selectedUnknownChords.filter((v): v is string => typeof v === 'string')
          : [],
      )
      setShowUnknownChordsBelowTitle(parsed.showUnknownChordsBelowTitle === true)
      setUnknownChordBodyMode(
        parsed.unknownChordBodyMode === 'all' || parsed.unknownChordBodyMode === 'first'
          ? parsed.unknownChordBodyMode
          : 'none',
      )
    } catch {
      setLines([])
    } finally {
      setLoaded(true)
    }
  }, [])

  const empty = useMemo(() => lines.length === 0, [lines.length])
  const unknownChordShapeMap = useMemo(() => {
    const out = new Map()
    if (!chordLibrary) return out
    for (const symbol of selectedUnknownChords) {
      const shape = getRepresentativeShapeForSymbol(chordLibrary, symbol)
      if (!shape) continue
      out.set(symbol, shape)
    }
    return out
  }, [chordLibrary, selectedUnknownChords])

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
          artist={artist}
          lines={lines}
          notation={notation}
          unknownChordShapes={unknownChordShapeMap}
          showUnknownChordsBelowTitle={showUnknownChordsBelowTitle}
          unknownChordBodyMode={unknownChordBodyMode}
          selectedMeasureKeys={new Set()}
          onToggleMeasureKey={() => {}}
          interactive={false}
        />
      ) : null}
    </div>
  )
}
