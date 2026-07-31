import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchMyScores,
  saveMyScore,
  type ScoreDto,
} from '../api/scoresApi'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { useChordLibrary } from '../hooks/useChordLibrary'
import {
  collectValidMeasureKeysFromPreview,
  emptyNotationState,
  makeMeasureKey,
  parseMeasureKey,
  parseScoreNotation,
  sanitizeNotationForLines,
  type JumpDirectiveKind,
  type MeasureNotation,
  type ScoreNotationState,
} from '../lib/scoreNotation'
import { SCORE_PREVIEW_POPOUT_STORAGE_KEY } from '../lib/scorePreviewPopout'
import { getRepresentativeShapeForSymbol } from '../utils/chordSymbolShape'
import { ScoreNotationPanel } from './ScoreNotationPanel'
import { ScoreSheetPreview, type PreviewLine } from './ScoreSheetPreview'

type ScoreVerseDraft = {
  id: string
  label: string
  lyrics: string
}

type ScoreDraft = {
  verses: ScoreVerseDraft[]
}

type ParsedMeasure = {
  id: string
  text: string
}

type ParsedLyricLine = {
  id: string
  lineIndex: number
  measures: ParsedMeasure[]
}

const INITIAL_DRAFT: ScoreDraft = {
  verses: [
    {
      id: 'verse-1',
      label: '1절',
      lyrics: '',
    },
  ],
}
const MAX_VERSES = 4
const EDITOR_LINE_HEIGHT = 24
const EDITOR_VERTICAL_PADDING = 20
const PAIRED_EDITOR_VIEWPORT_PX = 268
const PAIRED_EDITOR_MIN_DISPLAY_LINES = 12

function createVerse(index: number, lyrics = ''): ScoreVerseDraft {
  return {
    id: `verse-${index}`,
    label: `${index}절`,
    lyrics,
  }
}

function splitLineToMeasures(line: string): string[] {
  const normalizedLine = line.trim()
  if (normalizedLine.length === 0) return []

  return normalizedLine.split('/').map((part) => part.trim())
}

function parseLyricsLines(rawText: string): ParsedLyricLine[] {
  return rawText.split(/\r?\n/).map((rawLine, lineIndex) => {
    const measures = splitLineToMeasures(rawLine).map((text, measureIndex) => ({
      id: `line-${lineIndex + 1}-measure-${measureIndex + 1}`,
      text,
    }))
    return {
      id: `line-${lineIndex + 1}`,
      lineIndex,
      measures,
    }
  })
}

function parseRawLines(rawText: string): string[] {
  return rawText.split(/\r?\n/)
}

type OverlayRect = {
  left: number
  top: number
  width: number
  height: number
}

const OVERLAY_FONT = '500 15px system-ui, -apple-system, "Segoe UI", "Noto Sans KR", sans-serif'

function measureTextWidth(text: string): number {
  if (typeof document === 'undefined') return text.length * 8.2
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return text.length * 8.2
  ctx.font = OVERLAY_FONT
  return ctx.measureText(text).width
}

function measureRectForSelectedChunk(
  rawText: string,
  lineIndex: number | null,
  chunkIndex: number | null,
  lineHeight: number,
  padY: number,
): OverlayRect | null {
  if (lineIndex == null || chunkIndex == null) return null
  const lines = rawText.split(/\r?\n/)
  const line = lines[lineIndex]
  if (line == null) return null
  const chunks = line.split('/')
  if (chunkIndex < 0 || chunkIndex >= chunks.length) return null
  const leftText = chunks.slice(0, chunkIndex).join('/')
  const baseLeft = leftText.length > 0 ? measureTextWidth(`${leftText}/`) : 0
  const chunkText = chunks[chunkIndex] ?? ''
  const width = Math.max(12, measureTextWidth(chunkText || ' '))
  return {
    left: Math.max(0, baseLeft - 2),
    top: padY + lineIndex * lineHeight + 2,
    width: width + 4,
    height: lineHeight - 4,
  }
}

function countTextLines(rawText: string): number {
  if (rawText.length === 0) return 1
  return rawText.split(/\r?\n/).length
}

function splitMeasureToChordTokens(measureText: string): string[] {
  const normalizedMeasure = measureText.trim()
  if (normalizedMeasure.length === 0) return []

  return normalizedMeasure.split(/\s+/).filter((token) => token.length > 0)
}

function splitChordLineToMeasures(chordLine: string): string[][] {
  const normalizedLine = chordLine.trim()
  if (normalizedLine.length === 0) return []

  return normalizedLine.split('/').map((measure) => splitMeasureToChordTokens(measure))
}

function parseChordLines(rawText: string): string[][][] {
  return rawText.split(/\r?\n/).map((line) => splitChordLineToMeasures(line))
}

function toEditorVersesFromStored(verses: { label: string; lyrics: string }[]): ScoreVerseDraft[] {
  const safe = verses.slice(0, MAX_VERSES)
  if (safe.length === 0) return [createVerse(1)]
  return safe.map((verse, index) => ({
    id: `verse-${index + 1}`,
    label: verse.label?.trim() || `${index + 1}절`,
    lyrics: typeof verse.lyrics === 'string' ? verse.lyrics : '',
  }))
}

function formatUpdatedAt(dateString: string): string {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '-'
  try {
    return date.toLocaleString('ko-KR')
  } catch {
    return date.toISOString()
  }
}

function compareMeasureKeys(a: string, b: string): number {
  const pa = parseMeasureKey(a)
  const pb = parseMeasureKey(b)
  if (!pa && !pb) return 0
  if (!pa) return 1
  if (!pb) return -1
  if (pa.lineIndex !== pb.lineIndex) return pa.lineIndex - pb.lineIndex
  return pa.measureIndex - pb.measureIndex
}

function primarySelectedKey(selected: ReadonlySet<string>): string | null {
  const keys = [...selected].sort(compareMeasureKeys)
  return keys[0] ?? null
}

function formatSelectionSummary(selected: ReadonlySet<string>): string {
  if (selected.size === 0) return '선택된 마디: 없음'
  const parsed = [...selected]
    .map((k) => parseMeasureKey(k))
    .filter((p): p is { lineIndex: number; measureIndex: number } => p != null)
  if (parsed.length === 0) return '선택된 마디: 없음'
  const lineIndex = parsed[0]!.lineIndex
  if (!parsed.every((p) => p.lineIndex === lineIndex)) {
    return `선택된 마디: ${selected.size}곳`
  }
  const idxs = [...new Set(parsed.map((p) => p.measureIndex))].sort((a, b) => a - b)
  const lo = idxs[0]!
  const hi = idxs[idxs.length - 1]!
  const row = lineIndex + 1
  if (lo === hi) return `선택된 마디: ${row}행 ${lo + 1}마디`
  return `선택된 마디: ${row}행 ${lo + 1}~${hi + 1}마디`
}

function rangeFromSelection(
  selected: ReadonlySet<string>,
): { lineIndex: number; start: number; end: number } | null {
  if (selected.size === 0) return null
  const parsed: { lineIndex: number; measureIndex: number }[] = []
  for (const k of selected) {
    const p = parseMeasureKey(k)
    if (p) parsed.push(p)
  }
  if (parsed.length === 0) return null
  const lineIndex = parsed[0]!.lineIndex
  if (!parsed.every((p) => p.lineIndex === lineIndex)) return null
  const uniq = [...new Set(parsed.map((p) => p.measureIndex))].sort((a, b) => a - b)
  const lo = uniq[0]!
  const hi = uniq[uniq.length - 1]!
  if (uniq.length !== hi - lo + 1) return null
  return { lineIndex, start: lo, end: hi }
}

type BoolMarkKey = 'repeatStart' | 'repeatEnd' | 'segno' | 'coda' | 'toCoda' | 'fine'
type UnknownChordBodyMode = 'none' | 'first' | 'all'
type UnknownChordDisplayPrefs = {
  selectedUnknownChords: string[]
  showUnknownChordsBelowTitle: boolean
  unknownChordBodyMode: UnknownChordBodyMode
}

function coerceUnknownChordBodyMode(raw: unknown): UnknownChordBodyMode {
  return raw === 'first' || raw === 'all' ? raw : 'none'
}

function readUnknownChordDisplayPrefs(rawNotation: unknown): UnknownChordDisplayPrefs {
  if (!rawNotation || typeof rawNotation !== 'object') {
    return {
      selectedUnknownChords: [],
      showUnknownChordsBelowTitle: false,
      unknownChordBodyMode: 'none',
    }
  }
  const root = rawNotation as Record<string, unknown>
  const rawPrefs =
    root.unknownChordDisplay && typeof root.unknownChordDisplay === 'object'
      ? (root.unknownChordDisplay as Record<string, unknown>)
      : null
  if (!rawPrefs) {
    return {
      selectedUnknownChords: [],
      showUnknownChordsBelowTitle: false,
      unknownChordBodyMode: 'none',
    }
  }
  return {
    selectedUnknownChords: Array.isArray(rawPrefs.selectedUnknownChords)
      ? rawPrefs.selectedUnknownChords.filter((v): v is string => typeof v === 'string')
      : [],
    showUnknownChordsBelowTitle: rawPrefs.showUnknownChordsBelowTitle === true,
    unknownChordBodyMode: coerceUnknownChordBodyMode(rawPrefs.unknownChordBodyMode),
  }
}

function flipBoolMeasureField(
  entry: MeasureNotation | undefined,
  field: BoolMarkKey,
): MeasureNotation | null {
  const o: MeasureNotation = { ...(entry ?? {}) }
  const on =
    field === 'repeatStart'
      ? Boolean(o.repeatStart)
      : field === 'repeatEnd'
        ? Boolean(o.repeatEnd)
        : field === 'segno'
          ? Boolean(o.segno)
          : field === 'coda'
            ? Boolean(o.coda)
            : field === 'toCoda'
              ? Boolean(o.toCoda)
              : Boolean(o.fine)
  if (on) {
    if (field === 'repeatStart') delete o.repeatStart
    if (field === 'repeatEnd') delete o.repeatEnd
    if (field === 'segno') delete o.segno
    if (field === 'coda') delete o.coda
    if (field === 'toCoda') delete o.toCoda
    if (field === 'fine') delete o.fine
  } else {
    if (field === 'repeatStart') o.repeatStart = true
    if (field === 'repeatEnd') o.repeatEnd = true
    if (field === 'segno') o.segno = true
    if (field === 'coda') o.coda = true
    if (field === 'toCoda') o.toCoda = true
    if (field === 'fine') o.fine = true
  }
  return Object.keys(o).length > 0 ? o : null
}

export function ScoreCreatePage() {
  const { token } = useAdminAuth()
  const { library: chordLibrary } = useChordLibrary()
  const [draft, setDraft] = useState<ScoreDraft>(INITIAL_DRAFT)
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [sharedChordText, setSharedChordText] = useState<string>('')
  const [currentScoreId, setCurrentScoreId] = useState<string | null>(null)
  const [savedScores, setSavedScores] = useState<ScoreDto[]>([])
  const [loadingScores, setLoadingScores] = useState(false)
  const [savingScore, setSavingScore] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionOk, setActionOk] = useState<string | null>(null)
  const [notation, setNotation] = useState<ScoreNotationState>(emptyNotationState)
  const [selectedMeasureKeys, setSelectedMeasureKeys] = useState<Set<string>>(() => new Set())
  const [selectedUnknownChords, setSelectedUnknownChords] = useState<Set<string>>(() => new Set())
  const [showUnknownChordsBelowTitle, setShowUnknownChordsBelowTitle] = useState(false)
  const [unknownChordBodyMode, setUnknownChordBodyMode] = useState<UnknownChordBodyMode>('none')

  const verse1 = draft.verses[0]
  const activeVerses = draft.verses
  const parsedByVerseId = useMemo(
    () =>
      Object.fromEntries(
        activeVerses.map((verse) => [verse.id, parseLyricsLines(verse.lyrics)]),
      ) as Record<string, ParsedLyricLine[]>,
    [activeVerses],
  )
  const rawLinesByVerseId = useMemo(
    () =>
      Object.fromEntries(
        activeVerses.map((verse) => [verse.id, parseRawLines(verse.lyrics)]),
      ) as Record<string, string[]>,
    [activeVerses],
  )
  const verse1ParsedLines =
    verse1 != null ? (parsedByVerseId[verse1.id] ?? []) : []
  const parsedChordLines = useMemo(
    () => parseChordLines(sharedChordText),
    [sharedChordText],
  )
  const previewLines = useMemo<PreviewLine[]>(
    () =>
      verse1ParsedLines.map((lyricLine, lineIndex) => {
        const chordMeasures = parsedChordLines[lineIndex] ?? []
        const lyricMeasures =
          lyricLine.measures.length > 0
            ? lyricLine.measures
            : [{ id: `${lyricLine.id}-measure-empty`, text: '' }]
        const visibleVersesForLine = activeVerses.filter((verse, verseIndex) => {
          if (verseIndex === 0) return true
          const rawLine = rawLinesByVerseId[verse.id]?.[lineIndex] ?? ''
          return rawLine.trim().length > 0
        })

        return {
          id: lyricLine.id,
          lineIndex: lyricLine.lineIndex,
          measures: lyricMeasures.map((measure, measureIndex) => ({
            id: measure.id,
            chords: (chordMeasures[measureIndex] ?? []).slice(0, 4),
            lyrics: visibleVersesForLine.map((verse) => {
              const parsedLine = parsedByVerseId[verse.id]?.[lineIndex]
              return {
                verseId: verse.id,
                label: verse.label,
                text: parsedLine?.measures?.[measureIndex]?.text ?? '',
              }
            }),
          })),
        }
      }),
    [activeVerses, parsedByVerseId, parsedChordLines, rawLinesByVerseId, verse1ParsedLines],
  )
  const lineMeasureLengths = useMemo(
    () =>
      verse1ParsedLines.map((line) =>
        line.measures.length > 0 ? line.measures.length : 1,
      ),
    [verse1ParsedLines],
  )
  const notationSelectionSummary = useMemo(
    () => formatSelectionSummary(selectedMeasureKeys),
    [selectedMeasureKeys],
  )
  const activeSelectedMeasure = useMemo(
    () => primarySelectedKey(selectedMeasureKeys),
    [selectedMeasureKeys],
  )
  const activeSelectionPos = useMemo(
    () => (activeSelectedMeasure ? parseMeasureKey(activeSelectedMeasure) : null),
    [activeSelectedMeasure],
  )
  const selectedLineIndex = activeSelectionPos?.lineIndex ?? null
  const selectedMeasureIndex = activeSelectionPos?.measureIndex ?? null
  const chordSelectedMeasureRect = useMemo(
    () =>
      measureRectForSelectedChunk(
        sharedChordText,
        selectedLineIndex,
        selectedMeasureIndex,
        EDITOR_LINE_HEIGHT,
        10,
      ),
    [sharedChordText, selectedLineIndex, selectedMeasureIndex],
  )
  const usedChordSymbols = useMemo(() => {
    const out: string[] = []
    const seen = new Set<string>()
    for (const line of previewLines) {
      for (const measure of line.measures) {
        for (const chord of measure.chords) {
          const sym = chord.trim()
          if (!sym || seen.has(sym)) continue
          seen.add(sym)
          out.push(sym)
        }
      }
    }
    return out
  }, [previewLines])
  const selectedUnknownChordSymbolsOrdered = useMemo(
    () => usedChordSymbols.filter((symbol) => selectedUnknownChords.has(symbol)),
    [selectedUnknownChords, usedChordSymbols],
  )
  const selectedUnknownChordShapeMap = useMemo(() => {
    const out = new Map()
    if (!chordLibrary) return out
    for (const symbol of selectedUnknownChordSymbolsOrdered) {
      const shape = getRepresentativeShapeForSymbol(chordLibrary, symbol)
      if (!shape) continue
      out.set(symbol, shape)
    }
    return out
  }, [chordLibrary, selectedUnknownChordSymbolsOrdered])

  const hasVerse1Input = (verse1?.lyrics ?? '').trim().length > 0
  const pairedEditorDisplayLineCount = useMemo(() => {
    const lyricLines = countTextLines(verse1?.lyrics ?? '')
    const chordLines = countTextLines(sharedChordText)
    return Math.max(PAIRED_EDITOR_MIN_DISPLAY_LINES, lyricLines, chordLines)
  }, [sharedChordText, verse1?.lyrics])
  const pairedCompareInnerHeightPx = useMemo(
    () =>
      Math.max(
        PAIRED_EDITOR_VIEWPORT_PX,
        EDITOR_VERTICAL_PADDING + pairedEditorDisplayLineCount * EDITOR_LINE_HEIGHT,
      ),
    [pairedEditorDisplayLineCount],
  )
  const pairedEditorDocumentLineNumbers = useMemo(
    () => Array.from({ length: pairedEditorDisplayLineCount }, (_, i) => i + 1),
    [pairedEditorDisplayLineCount],
  )

  useEffect(() => {
    const allowed = new Set(usedChordSymbols)
    setSelectedUnknownChords((prev) => {
      const next = new Set([...prev].filter((symbol) => allowed.has(symbol)))
      if (next.size === prev.size && [...next].every((symbol) => prev.has(symbol))) return prev
      return next
    })
  }, [usedChordSymbols])

  const openPreviewPopout = useCallback(() => {
    if (!hasVerse1Input) return
    try {
      localStorage.setItem(
        SCORE_PREVIEW_POPOUT_STORAGE_KEY,
        JSON.stringify({
          v: 1,
          title: title.trim().length > 0 ? title.trim() : '곡 제목',
          artist: artist.trim(),
          lines: previewLines,
          notation,
          selectedUnknownChords: selectedUnknownChordSymbolsOrdered,
          showUnknownChordsBelowTitle,
          unknownChordBodyMode,
        }),
      )
    } catch {
      setActionError('미리보기를 새 창으로 넘기지 못했습니다. 저장 공간을 확인해 주세요.')
      setActionOk(null)
      return
    }
    const base = import.meta.env.BASE_URL
    const prefix = base.endsWith('/') ? base.slice(0, -1) : base
    const path = `${prefix}/sheet/create/preview-popout`
    const url = `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
    const win = window.open(url, 'ukulScorePreview', 'noopener,noreferrer,width=1024,height=800')
    if (!win) {
      setActionError('새 창이 차단되었습니다. 브라우저에서 팝업을 허용해 주세요.')
      setActionOk(null)
    }
  }, [
    hasVerse1Input,
    title,
    artist,
    previewLines,
    notation,
    selectedUnknownChordSymbolsOrdered,
    showUnknownChordsBelowTitle,
    unknownChordBodyMode,
  ])

  const updateVerseLyrics = (verseId: string, lyrics: string) => {
    setDraft((prev) => ({
      ...prev,
      verses: prev.verses.map((verse) =>
        verse.id === verseId ? { ...verse, lyrics } : verse,
      ),
    }))
  }

  const addVerse = () => {
    setDraft((prev) => {
      if (prev.verses.length >= MAX_VERSES) return prev
      const nextNumber = prev.verses.length + 1
      return {
        ...prev,
        verses: [
          ...prev.verses,
          {
            id: `verse-${nextNumber}`,
            label: `${nextNumber}절`,
            lyrics: '',
          },
        ],
      }
    })
  }
  const canAddVerse = draft.verses.length < MAX_VERSES

  const removeVerse = (verseId: string) => {
    setDraft((prev) => {
      const target = prev.verses.find((v) => v.id === verseId)
      if (!target) return prev
      if (target.lyrics.trim().length > 0) return prev
      const next = prev.verses.filter((v) => v.id !== verseId)
      if (next.length === 0) return prev
      return {
        ...prev,
        verses: next.map((verse, index) => ({
          ...verse,
          id: `verse-${index + 1}`,
          label: `${index + 1}절`,
        })),
      }
    })
  }

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoadingScores(true)
    fetchMyScores(token)
      .then((scores) => {
        if (!cancelled) setSavedScores(scores)
      })
      .catch((err) => {
        if (!cancelled) {
          setActionError(
            err instanceof Error ? err.message : '내 악보 목록을 불러오지 못했습니다.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingScores(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const reloadScores = async (): Promise<void> => {
    if (!token) return
    const scores = await fetchMyScores(token)
    setSavedScores(scores)
  }

  const toggleMeasureSelection = useCallback((measureKey: string) => {
    const clicked = parseMeasureKey(measureKey)
    if (!clicked) return

    setSelectedMeasureKeys((prev) => {
      if (prev.has(measureKey)) {
        const next = new Set(prev)
        next.delete(measureKey)
        return next
      }

      const others: string[] = []
      const sameLine: string[] = []
      for (const k of prev) {
        const p = parseMeasureKey(k)
        if (!p) continue
        if (p.lineIndex === clicked.lineIndex) sameLine.push(k)
        else others.push(k)
      }

      if (others.length > 0) {
        return new Set([measureKey])
      }

      const idxSorted = [
        ...new Set(sameLine.map((k) => parseMeasureKey(k)!.measureIndex)),
      ].sort((a, b) => a - b)
      const m = clicked.measureIndex
      const universe = [...new Set([...idxSorted, m])].sort((a, b) => a - b)
      const lo = universe[0]!
      const hi = universe[universe.length - 1]!
      const contiguous = universe.length === hi - lo + 1

      if (contiguous) {
        const out = new Set<string>()
        for (let i = lo; i <= hi; i += 1) {
          out.add(makeMeasureKey(clicked.lineIndex, i))
        }
        return out
      }

      return new Set([measureKey])
    })
  }, [])

  const clearMeasureSelection = useCallback(() => {
    setSelectedMeasureKeys(new Set())
  }, [])

  const toggleUnknownChordSelection = useCallback((symbol: string) => {
    setSelectedUnknownChords((prev) => {
      const next = new Set(prev)
      if (next.has(symbol)) next.delete(symbol)
      else next.add(symbol)
      return next
    })
  }, [])

  const toggleBoolOnPrimary = useCallback(
    (flag: BoolMarkKey) => {
      const key = primarySelectedKey(selectedMeasureKeys)
      if (!key) {
        setActionError('마디를 하나 이상 선택해 주세요.')
        setActionOk(null)
        return
      }
      setActionError(null)
      setNotation((n) => {
        const nextEntry = flipBoolMeasureField(n.measures[key], flag)
        const measures = { ...n.measures }
        if (nextEntry == null) delete measures[key]
        else measures[key] = nextEntry
        return { ...n, measures }
      })
    },
    [selectedMeasureKeys],
  )

  const setJumpOnPrimary = useCallback(
    (kind: JumpDirectiveKind | null) => {
      const key = primarySelectedKey(selectedMeasureKeys)
      if (!key) {
        setActionError('마디를 하나 이상 선택해 주세요.')
        setActionOk(null)
        return
      }
      setActionError(null)
      setNotation((n) => {
        const cur: MeasureNotation = { ...(n.measures[key] ?? {}) }
        if (kind == null) delete cur.jumpDirective
        else cur.jumpDirective = kind
        const measures = { ...n.measures }
        if (Object.keys(cur).length === 0) delete measures[key]
        else measures[key] = cur
        return { ...n, measures }
      })
    },
    [selectedMeasureKeys],
  )

  const clearMarksOnSelection = useCallback(() => {
    if (selectedMeasureKeys.size === 0) {
      setActionError('선택된 마디가 없습니다.')
      setActionOk(null)
      return
    }
    setActionError(null)
    setNotation((n) => {
      const measures = { ...n.measures }
      for (const k of selectedMeasureKeys) {
        delete measures[k]
      }

      const selectedByLine = new Map<number, Set<number>>()
      for (const k of selectedMeasureKeys) {
        const p = parseMeasureKey(k)
        if (!p) continue
        let set = selectedByLine.get(p.lineIndex)
        if (!set) {
          set = new Set()
          selectedByLine.set(p.lineIndex, set)
        }
        set.add(p.measureIndex)
      }

      const endings = n.endings.filter((e) => {
        const sel = selectedByLine.get(e.lineIndex)
        if (!sel || sel.size === 0) return true
        for (let mi = e.startMeasureIndex; mi <= e.endMeasureIndex; mi += 1) {
          if (sel.has(mi)) return false
        }
        return true
      })

      return { ...n, measures, endings }
    })
  }, [selectedMeasureKeys])

  const addEndingBracket = useCallback(
    (type: 1 | 2) => {
      const range = rangeFromSelection(selectedMeasureKeys)
      if (!range) {
        setActionError(
          '같은 줄에서 연속한 마디만 선택해 주세요. (한 칸만 선택해도 됩니다.)',
        )
        setActionOk(null)
        return
      }
      setActionError(null)
      const id = `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
      setNotation((n) => ({
        ...n,
        endings: [
          ...n.endings,
          {
            id,
            type,
            lineIndex: range.lineIndex,
            startMeasureIndex: range.start,
            endMeasureIndex: range.end,
          },
        ],
      }))
      setActionOk(`${type}번 괄호 구간을 추가했습니다.`)
    },
    [selectedMeasureKeys],
  )

  const removeEnding = useCallback((id: string) => {
    setNotation((n) => ({
      ...n,
      endings: n.endings.filter((e) => e.id !== id),
    }))
  }, [])

  const applyLoadedScore = (score: ScoreDto): void => {
    const unknownDisplayPrefs = readUnknownChordDisplayPrefs(score.notation)
    setCurrentScoreId(score.id)
    setTitle(score.title)
    setArtist(score.artist ?? '')
    setSharedChordText(score.sharedChordText)
    setDraft({
      verses: toEditorVersesFromStored(score.verses),
    })
    setNotation(parseScoreNotation(score.notation))
    setSelectedMeasureKeys(new Set())
    setSelectedUnknownChords(new Set(unknownDisplayPrefs.selectedUnknownChords))
    setShowUnknownChordsBelowTitle(unknownDisplayPrefs.showUnknownChordsBelowTitle)
    setUnknownChordBodyMode(unknownDisplayPrefs.unknownChordBodyMode)
    setActionError(null)
    setActionOk(`"${score.title}" 악보를 불러왔습니다.`)
  }

  const resetToNewScore = (): void => {
    setCurrentScoreId(null)
    setTitle('')
    setArtist('')
    setDraft(INITIAL_DRAFT)
    setSharedChordText('')
    setNotation(emptyNotationState())
    setSelectedMeasureKeys(new Set())
    setSelectedUnknownChords(new Set())
    setShowUnknownChordsBelowTitle(false)
    setUnknownChordBodyMode('none')
    setActionError(null)
    setActionOk('새 악보 작성을 시작합니다.')
  }

  const saveCurrentScore = async (): Promise<void> => {
    if (!token) {
      setActionError('로그인이 필요합니다.')
      return
    }
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setActionError('곡 제목을 입력해 주세요.')
      setActionOk(null)
      return
    }
    setSavingScore(true)
    setActionError(null)
    setActionOk(null)
    const wasEditingExisting = Boolean(currentScoreId)
    try {
      const validKeys = collectValidMeasureKeysFromPreview(lineMeasureLengths)
      const notationToSave = sanitizeNotationForLines(
        notation,
        validKeys,
        lineMeasureLengths,
      )
      const notationWithUnknownDisplay = {
        ...notationToSave,
        unknownChordDisplay: {
          selectedUnknownChords: selectedUnknownChordSymbolsOrdered,
          showUnknownChordsBelowTitle,
          unknownChordBodyMode,
        },
      }

      const saved = await saveMyScore(
        {
          ...(currentScoreId ? { scoreId: currentScoreId } : {}),
          title: trimmedTitle,
          artist: artist.trim(),
          sharedChordText,
          notation: notationWithUnknownDisplay,
          verses: draft.verses.map((verse, index) => ({
            label: verse.label || `${index + 1}절`,
            lyrics: verse.lyrics,
          })),
        },
        token,
      )
      applyLoadedScore(saved)
      setActionError(null)
      setActionOk(wasEditingExisting ? '수정 저장되었습니다.' : '새 악보로 저장되었습니다.')
      try {
        await reloadScores()
      } catch {
        setActionOk(
          (wasEditingExisting ? '수정 저장되었습니다.' : '새 악보로 저장되었습니다.') +
            ' 다만 내 악보 목록만 다시 불러오지 못했습니다. 페이지를 새로고침 해 보세요.',
        )
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSavingScore(false)
    }
  }

  return (
    <section className="score-create-page" aria-labelledby="score-create-title">
      <div className="chord-finder__hero chord-finder__hero--compact">
        <h1 id="score-create-title" className="chord-finder__hero-title">
          악보 만들기
        </h1>
        <p className="chord-finder__hero-desc">
          1절 가사를 먼저 입력한 뒤, 다음 단계에서 마디/코드/미리보기를 연결합니다.
        </p>
      </div>

      <div className="score-create-page__workspace">
        <div className="section-card score-create-page__guide">
          <h2 className="chord-finder__heading">입력 안내</h2>
          <ul className="score-create-page__guide-list">
            <li>가사는 일반 텍스트처럼 입력합니다.</li>
            <li>Enter는 줄바꿈으로 사용합니다.</li>
            <li>
              <code>/</code>는 이후 단계에서 마디 구분 기호로 사용할 예정입니다.
            </li>
          </ul>
        </div>

        <div className="section-card score-create-page__manage">
          <div className="score-create-page__manage-head">
            <h2 className="chord-finder__heading">악보 저장</h2>
            <p className="score-create-page__manage-current">
              {currentScoreId ? '수정 모드' : '새 악보 모드'}
            </p>
          </div>
          <div className="score-create-page__title-artist-row">
            <label className="chord-edit__label" htmlFor="score-title">
              <span className="chord-edit__label-text">곡 제목</span>
              <input
                id="score-title"
                type="text"
                className="chord-edit__input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="예: 흔들리는 꽃들 속에서"
                autoComplete="off"
              />
            </label>
            <label className="chord-edit__label" htmlFor="score-artist">
              <span className="chord-edit__label-text">아티스트</span>
              <input
                id="score-artist"
                type="text"
                className="chord-edit__input"
                value={artist}
                onChange={(event) => setArtist(event.target.value)}
                placeholder="예: 아이유"
                autoComplete="off"
              />
            </label>
          </div>
          <div className="score-create-page__manage-actions">
            <button
              type="button"
              className="chord-edit__btn chord-edit__btn--primary"
              onClick={() => void saveCurrentScore()}
              disabled={savingScore}
            >
              {savingScore ? '저장 중…' : '저장'}
            </button>
            <button
              type="button"
              className="chord-edit__btn chord-edit__btn--secondary"
              onClick={resetToNewScore}
              disabled={savingScore}
            >
              새 악보
            </button>
          </div>
          {actionError ? (
            <p className="chord-edit__error" role="alert">
              {actionError}
            </p>
          ) : null}
          {actionOk ? (
            <p className="chord-edit__ok" role="status">
              {actionOk}
            </p>
          ) : null}
        </div>

        <div className="section-card score-create-page__saved-list">
          <div className="score-create-page__manage-head">
            <h2 className="chord-finder__heading">내 악보 목록</h2>
            {loadingScores ? (
              <span className="score-create-page__saved-meta">불러오는 중…</span>
            ) : (
              <span className="score-create-page__saved-meta">{savedScores.length}개</span>
            )}
          </div>
          {savedScores.length > 0 ? (
            <ul className="score-create-page__saved-items">
              {savedScores.map((score) => (
                <li key={score.id}>
                  <button
                    type="button"
                    className={`score-create-page__saved-btn${currentScoreId === score.id ? ' score-create-page__saved-btn--active' : ''}`}
                    onClick={() => applyLoadedScore(score)}
                  >
                    <span className="score-create-page__saved-title">{score.title}</span>
                    <span className="score-create-page__saved-date">
                      수정 {formatUpdatedAt(score.updatedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="chord-finder__load-hint">저장된 악보가 아직 없습니다.</p>
          )}
        </div>

        {verse1 ? (
          <div className="section-card score-create-page__pair-editor-card">
            <div className="score-create-page__pair-editor-head">
              <h2 className="chord-finder__heading">가사 · 코드 입력</h2>
              <button
                type="button"
                className="chord-edit__btn chord-edit__btn--secondary"
                onClick={addVerse}
                disabled={!canAddVerse}
              >
                절 추가
              </button>
            </div>

            <div className="score-create-page__pair-editor-wrap score-create-page__pair-editor-wrap--compare">
              <label className="chord-edit__label score-create-page__pair-editor-label" htmlFor={verse1.id}>
                <span className="chord-edit__label-text">{verse1.label} 가사</span>
              </label>
              <label
                className="chord-edit__label score-create-page__pair-editor-label"
                htmlFor={`${verse1.id}-chords`}
              >
                <span className="chord-edit__label-text">공통 코드</span>
              </label>

              <div className="score-create-page__pair-compare-shell">
                <div className="score-create-page__compare-scroll">
                  <div
                    className={`score-create-page__compare-inner${selectedLineIndex != null ? ' score-create-page__compare-inner--has-selected-line' : ''}`}
                    style={{ height: `${pairedCompareInnerHeightPx}px` }}
                  >
                    <div className="score-create-page__compare-zebra" aria-hidden />
                    <div className="score-create-page__compare-grid">
                      <div className="score-create-page__line-gutter score-create-page__line-gutter--pair" aria-hidden="true">
                        <div className="score-create-page__line-gutter-track score-create-page__line-gutter-track--pair">
                          {pairedEditorDocumentLineNumbers.map((lineNo) => (
                            <span key={`lyric-line-${lineNo}`} className="score-create-page__line-no">
                              {lineNo}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="score-create-page__pair-cell-stack">
                        <div className="score-create-page__textarea-overlay" aria-hidden="true">
                          {selectedLineIndex != null ? (
                            <span
                              className="score-create-page__overlay-line-highlight"
                              style={{ top: `${10 + selectedLineIndex * EDITOR_LINE_HEIGHT}px` }}
                            />
                          ) : null}
                        </div>
                        <textarea
                          id={verse1.id}
                          className="score-create-page__textarea score-create-page__textarea--pair-cell"
                          value={verse1.lyrics}
                          onChange={(event) => updateVerseLyrics(verse1.id, event.target.value)}
                          placeholder="가사를 여러 줄로 자유롭게 입력해 주세요."
                          wrap="off"
                          rows={1}
                          spellCheck
                        />
                      </div>
                      <div className="score-create-page__pair-cell-stack">
                        <div className="score-create-page__textarea-overlay" aria-hidden="true">
                          {selectedLineIndex != null ? (
                            <span
                              className="score-create-page__overlay-line-highlight"
                              style={{ top: `${10 + selectedLineIndex * EDITOR_LINE_HEIGHT}px` }}
                            />
                          ) : null}
                          {chordSelectedMeasureRect ? (
                            <span
                              className="score-create-page__measure-hint"
                              style={{
                                left: `${chordSelectedMeasureRect.left}px`,
                                top: `${chordSelectedMeasureRect.top}px`,
                                width: `${chordSelectedMeasureRect.width}px`,
                                height: `${chordSelectedMeasureRect.height}px`,
                              }}
                            />
                          ) : null}
                        </div>
                        <textarea
                          id={`${verse1.id}-chords`}
                          className="score-create-page__textarea score-create-page__textarea--pair-cell score-create-page__textarea--pair-cell-chord"
                          value={sharedChordText}
                          onChange={(event) => setSharedChordText(event.target.value)}
                          placeholder={`(예시) C G7 / Am Em7 / F\n(예시) C / F G7 / C`}
                          wrap="off"
                          rows={1}
                          spellCheck={false}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {activeVerses.slice(1).length > 0 ? (
              <div className="score-create-page__verse-list">
                {activeVerses.slice(1).map((verse) => (
                  <label key={verse.id} className="chord-edit__label score-create-page__verse-label" htmlFor={verse.id}>
                    <span className="score-create-page__verse-label-head">
                      <span className="chord-edit__label-text">{verse.label} 가사</span>
                      <button
                        type="button"
                        className="chord-edit__btn chord-edit__btn--secondary score-create-page__verse-remove-btn"
                        onClick={() => removeVerse(verse.id)}
                        disabled={verse.lyrics.trim().length > 0}
                      >
                        절 삭제
                      </button>
                    </span>
                    <div className="score-create-page__verse-editor-shell">
                      <div className="score-create-page__compare-scroll score-create-page__compare-scroll--verse">
                        {(() => {
                          const verseDisplayLineCount = Math.max(
                            PAIRED_EDITOR_MIN_DISPLAY_LINES,
                            countTextLines(verse.lyrics),
                          )
                          const verseInnerHeightPx = Math.max(
                            PAIRED_EDITOR_VIEWPORT_PX,
                            EDITOR_VERTICAL_PADDING + verseDisplayLineCount * EDITOR_LINE_HEIGHT,
                          )
                          const verseLineNos = Array.from(
                            { length: verseDisplayLineCount },
                            (_, i) => i + 1,
                          )
                          return (
                            <div
                              className="score-create-page__compare-inner"
                              style={{ height: `${verseInnerHeightPx}px` }}
                            >
                              <div className="score-create-page__compare-zebra" aria-hidden />
                              <div className="score-create-page__single-editor-grid">
                                <div
                                  className="score-create-page__line-gutter score-create-page__line-gutter--pair"
                                  aria-hidden="true"
                                >
                                  <div className="score-create-page__line-gutter-track score-create-page__line-gutter-track--pair">
                                    {verseLineNos.map((lineNo) => (
                                      <span key={`${verse.id}-line-${lineNo}`} className="score-create-page__line-no">
                                        {lineNo}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <textarea
                                  id={verse.id}
                                  className="score-create-page__textarea score-create-page__textarea--pair-cell score-create-page__textarea--verse-lyrics"
                                  value={verse.lyrics}
                                  onChange={(event) => updateVerseLyrics(verse.id, event.target.value)}
                                  placeholder={`${verse.label} 가사를 입력해 주세요.`}
                                  wrap="off"
                                  rows={1}
                                  spellCheck
                                />
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          className="section-card score-create-page__preview"
          aria-labelledby="score-preview-title"
        >
          <div className="score-create-page__preview-head">
            <h2 id="score-preview-title" className="chord-finder__heading">
              미리보기
            </h2>
            {hasVerse1Input ? (
              <button
                type="button"
                className="chord-edit__btn chord-edit__btn--secondary score-create-page__preview-popout-btn"
                onClick={openPreviewPopout}
              >
                새 창 미리보기
              </button>
            ) : null}
          </div>
          {!hasVerse1Input ? (
            <p className="score-create-page__preview-meta">
              {activeVerses.map((verse) => verse.label).join(' · ')}
            </p>
          ) : null}
          {hasVerse1Input ? (
            <>
              <div className="score-create-page__preview-tools">
              <div className="score-create-page__preview-main">
                <ScoreSheetPreview
                  title={title.trim().length > 0 ? title.trim() : '곡 제목'}
                  artist={artist.trim()}
                  lines={previewLines}
                  notation={notation}
                  unknownChordShapes={selectedUnknownChordShapeMap}
                  showUnknownChordsBelowTitle={showUnknownChordsBelowTitle}
                  unknownChordBodyMode={unknownChordBodyMode}
                  selectedMeasureKeys={selectedMeasureKeys}
                  onToggleMeasureKey={toggleMeasureSelection}
                  interactive
                />
              </div>
              <aside className="score-create-page__symbols-sticky" aria-label="기호 넣기">
                <ScoreNotationPanel
                  disabled={savingScore}
                  selectionSummary={notationSelectionSummary}
                  endings={notation.endings}
                  onClearSelection={clearMeasureSelection}
                  onToggleRepeatStart={() => toggleBoolOnPrimary('repeatStart')}
                  onToggleRepeatEnd={() => toggleBoolOnPrimary('repeatEnd')}
                  onToggleSegno={() => toggleBoolOnPrimary('segno')}
                  onToggleCoda={() => toggleBoolOnPrimary('coda')}
                  onToggleToCoda={() => toggleBoolOnPrimary('toCoda')}
                  onToggleFine={() => toggleBoolOnPrimary('fine')}
                  onSetJump={setJumpOnPrimary}
                  onClearMeasureMarks={clearMarksOnSelection}
                  onAddEnding1={() => addEndingBracket(1)}
                  onAddEnding2={() => addEndingBracket(2)}
                  onRemoveEnding={removeEnding}
                />
              </aside>
              </div>
            </>
          ) : (
            <p className="chord-finder__load-hint">
              1절 가사를 입력하면 줄/마디 기준 미리보기가 표시됩니다.
            </p>
          )}
        </div>
        {hasVerse1Input ? (
          <div className="score-create-page__unknown-tool section-card section-card--flush">
            <h3 className="chord-finder__heading">모르는 코드 운지 표시</h3>
            {usedChordSymbols.length === 0 ? (
              <p className="score-create-page__unknown-empty">
                현재 악보에서 코드가 감지되지 않았습니다. 코드 입력을 먼저 확인해 주세요.
              </p>
            ) : (
              <>
                <div className="score-create-page__unknown-list" role="group" aria-label="모르는 코드 선택">
                  {usedChordSymbols.map((symbol) => (
                    <label
                      key={symbol}
                      className="score-create-page__unknown-item"
                      htmlFor={`unknown-chord-${symbol}`}
                    >
                      <input
                        id={`unknown-chord-${symbol}`}
                        type="checkbox"
                        checked={selectedUnknownChords.has(symbol)}
                        onChange={() => toggleUnknownChordSelection(symbol)}
                      />
                      <span>{symbol}</span>
                    </label>
                  ))}
                </div>
                <div className="score-create-page__unknown-options">
                  <label className="score-create-page__unknown-opt" htmlFor="unknown-position-header">
                    <input
                      id="unknown-position-header"
                      type="checkbox"
                      checked={showUnknownChordsBelowTitle}
                      onChange={(event) => setShowUnknownChordsBelowTitle(event.target.checked)}
                    />
                    <span>제목 아래 공통 표시</span>
                  </label>
                  <label className="score-create-page__unknown-opt" htmlFor="unknown-position-none">
                    <input
                      id="unknown-position-none"
                      type="radio"
                      name="unknown-body-position"
                      checked={unknownChordBodyMode === 'none'}
                      onChange={() => setUnknownChordBodyMode('none')}
                    />
                    <span>본문 미표시</span>
                  </label>
                  <label className="score-create-page__unknown-opt" htmlFor="unknown-position-first">
                    <input
                      id="unknown-position-first"
                      type="radio"
                      name="unknown-body-position"
                      checked={unknownChordBodyMode === 'first'}
                      onChange={() => setUnknownChordBodyMode('first')}
                    />
                    <span>본문 코드 옆 표시 (처음 1회)</span>
                  </label>
                  <label className="score-create-page__unknown-opt" htmlFor="unknown-position-all">
                    <input
                      id="unknown-position-all"
                      type="radio"
                      name="unknown-body-position"
                      checked={unknownChordBodyMode === 'all'}
                      onChange={() => setUnknownChordBodyMode('all')}
                    />
                    <span>본문 코드 옆 표시 (나올 때마다)</span>
                  </label>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}
