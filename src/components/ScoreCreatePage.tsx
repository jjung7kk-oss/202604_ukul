import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  fetchMyScores,
  saveMyScore,
  type ScoreDto,
} from '../api/scoresApi'
import { useAdminAuth } from '../hooks/useAdminAuth'
import {
  collectValidMeasureKeysFromPreview,
  emptyNotationState,
  JUMP_LABELS,
  makeMeasureKey,
  parseMeasureKey,
  parseScoreNotation,
  sanitizeNotationForLines,
  type JumpDirectiveKind,
  type MeasureNotation,
  type ScoreNotationState,
} from '../lib/scoreNotation'
import { ScoreNotationPanel } from './ScoreNotationPanel'

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

type PreviewMeasure = {
  id: string
  chords: string[]
  lyrics: {
    verseId: string
    label: string
    text: string
  }[]
}

type PreviewLine = {
  id: string
  lineIndex: number
  measures: PreviewMeasure[]
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

function getChordTokenPositions(chordCount: number): number[] {
  if (chordCount <= 1) return [0]
  if (chordCount === 2) return [0, 50]
  if (chordCount === 3) return [0, 50, 75]
  return [0, 25, 50, 75]
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

function rangeFromSelection(
  selected: ReadonlySet<string>,
): { lineIndex: number; start: number; end: number } | null {
  if (selected.size < 2) return null
  const parsed: { lineIndex: number; measureIndex: number }[] = []
  for (const k of selected) {
    const p = parseMeasureKey(k)
    if (p) parsed.push(p)
  }
  if (parsed.length < 2) return null
  const lineIndex = parsed[0]!.lineIndex
  if (!parsed.every((p) => p.lineIndex === lineIndex)) return null
  const idxs = parsed.map((p) => p.measureIndex)
  return { lineIndex, start: Math.min(...idxs), end: Math.max(...idxs) }
}

type BoolMarkKey = 'repeatStart' | 'repeatEnd' | 'segno' | 'coda' | 'toCoda' | 'fine'

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
  const [draft, setDraft] = useState<ScoreDraft>(INITIAL_DRAFT)
  const [title, setTitle] = useState('')
  const [sharedChordText, setSharedChordText] = useState<string>('')
  const [currentScoreId, setCurrentScoreId] = useState<string | null>(null)
  const [savedScores, setSavedScores] = useState<ScoreDto[]>([])
  const [loadingScores, setLoadingScores] = useState(false)
  const [savingScore, setSavingScore] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionOk, setActionOk] = useState<string | null>(null)
  const [notation, setNotation] = useState<ScoreNotationState>(emptyNotationState)
  const [selectedMeasureKeys, setSelectedMeasureKeys] = useState<Set<string>>(() => new Set())

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
  const notationSelectionHint = useMemo(() => {
    if (selectedMeasureKeys.size === 0) {
      return '선택된 마디 없음 — 미리보기 마디를 눌러 선택하세요.'
    }
    if (selectedMeasureKeys.size === 1) {
      return '마디 1개 선택됨 (단일 마디 기호는 이 마디에 적용됩니다.)'
    }
    return `마디 ${selectedMeasureKeys.size}개 선택됨 (단일 마디 기호는 가장 앞쪽 마디에만 적용됩니다.)`
  }, [selectedMeasureKeys])

  const hasVerse1Input = (verse1?.lyrics ?? '').trim().length > 0

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
    setSelectedMeasureKeys((prev) => {
      const next = new Set(prev)
      if (next.has(measureKey)) next.delete(measureKey)
      else next.add(measureKey)
      return next
    })
  }, [])

  const clearMeasureSelection = useCallback(() => {
    setSelectedMeasureKeys(new Set())
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
      return { ...n, measures }
    })
  }, [selectedMeasureKeys])

  const addEndingBracket = useCallback(
    (type: 1 | 2) => {
      const range = rangeFromSelection(selectedMeasureKeys)
      if (!range) {
        setActionError('같은 줄에서 마디를 둘 이상 선택해 주세요.')
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
    setCurrentScoreId(score.id)
    setTitle(score.title)
    setSharedChordText(score.sharedChordText)
    setDraft({
      verses: toEditorVersesFromStored(score.verses),
    })
    setNotation(parseScoreNotation(score.notation))
    setSelectedMeasureKeys(new Set())
    setActionError(null)
    setActionOk(`"${score.title}" 악보를 불러왔습니다.`)
  }

  const resetToNewScore = (): void => {
    setCurrentScoreId(null)
    setTitle('')
    setDraft(INITIAL_DRAFT)
    setSharedChordText('')
    setNotation(emptyNotationState())
    setSelectedMeasureKeys(new Set())
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

      const saved = await saveMyScore(
        {
          ...(currentScoreId ? { scoreId: currentScoreId } : {}),
          title: trimmedTitle,
          sharedChordText,
          notation: notationToSave,
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
          <div className="score-create-page__input-grid">
            <div className="section-card score-create-page__verse">
              <h2 className="chord-finder__heading">가사 입력</h2>
              <div className="score-create-page__verse-list">
                <label className="chord-edit__label" htmlFor={verse1.id}>
                  <span className="chord-edit__label-text">{verse1.label} 가사</span>
                  <textarea
                    id={verse1.id}
                    className="score-create-page__textarea"
                    value={verse1.lyrics}
                    onChange={(event) => updateVerseLyrics(verse1.id, event.target.value)}
                    placeholder="가사를 여러 줄로 자유롭게 입력해 주세요."
                    rows={10}
                  />
                </label>

                <div className="score-create-page__verse-add-row">
                  <button
                    type="button"
                    className="chord-edit__btn chord-edit__btn--secondary"
                    onClick={addVerse}
                    disabled={!canAddVerse}
                  >
                    절 추가
                  </button>
                </div>

                {activeVerses.slice(1).map((verse) => (
                  <label key={verse.id} className="chord-edit__label" htmlFor={verse.id}>
                    <span className="chord-edit__label-text">{verse.label} 가사</span>
                    <textarea
                      id={verse.id}
                      className="score-create-page__textarea"
                      value={verse.lyrics}
                      onChange={(event) => updateVerseLyrics(verse.id, event.target.value)}
                      placeholder={`${verse.label} 가사를 입력해 주세요.`}
                      rows={6}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="section-card score-create-page__code">
              <h2 className="chord-finder__heading">코드 입력</h2>
              <label className="chord-edit__label" htmlFor={`${verse1.id}-chords`}>
                <span className="chord-edit__label-text">공통 코드</span>
                <textarea
                  id={`${verse1.id}-chords`}
                  className="score-create-page__textarea score-create-page__textarea--code"
                  value={sharedChordText}
                  onChange={(event) => setSharedChordText(event.target.value)}
                  placeholder={`(예시) C G7 / Am Em7 / F\n(예시) C / F G7 / C`}
                  rows={10}
                  spellCheck={false}
                />
              </label>
            </div>
          </div>
        ) : null}

        <div
          className="section-card score-create-page__preview"
          aria-labelledby="score-preview-title"
        >
          <h2 id="score-preview-title" className="chord-finder__heading">
            미리보기
          </h2>
          <p className="score-create-page__preview-meta">
            {activeVerses.map((verse) => verse.label).join(' · ')}
          </p>
          {hasVerse1Input ? (
            <>
              <div className="score-preview" aria-live="polite">
                {previewLines.map((line) => {
                  const measureCount =
                    line.measures.length > 0 ? line.measures.length : 1
                  const voltaForLine = notation.endings.filter(
                    (e) => e.lineIndex === line.lineIndex,
                  )
                  return (
                    <div
                      key={line.id}
                      className="score-preview__row-wrap"
                      aria-label={`${line.lineIndex + 1}번째 줄`}
                    >
                      {voltaForLine.length > 0 ? (
                        <div
                          className="score-preview__volta-layer"
                          style={
                            {
                              '--measure-count': String(measureCount),
                            } as CSSProperties
                          }
                        >
                          {voltaForLine.map((e) => (
                            <div
                              key={e.id}
                              className={`score-preview__volta-bracket score-preview__volta-bracket--t${e.type}`}
                              style={
                                {
                                  gridColumn: `${e.startMeasureIndex + 1} / ${e.endMeasureIndex + 2}`,
                                } as CSSProperties
                              }
                            >
                              <span className="score-preview__volta-label">{e.type}.</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div
                        className={`score-preview__row${line.measures.length === 0 ? ' score-preview__row--empty' : ''}`}
                        style={
                          {
                            '--measure-count': String(measureCount),
                          } as CSSProperties
                        }
                      >
                        {line.measures.length > 0 ? (
                          line.measures.map((measure, measureIndex) => {
                            const measureKey = makeMeasureKey(line.lineIndex, measureIndex)
                            const meta = notation.measures[measureKey]
                            const selected = selectedMeasureKeys.has(measureKey)
                            return (
                              <div
                                key={measure.id}
                                className={`score-preview__measure${selected ? ' score-preview__measure--selected' : ''}`}
                                role="button"
                                tabIndex={0}
                                aria-pressed={selected}
                                aria-label={`마디 ${measureIndex + 1}, 선택 ${selected ? '됨' : '안 됨'}`}
                                onClick={() => toggleMeasureSelection(measureKey)}
                                onKeyDown={(ev) => {
                                  if (ev.key === 'Enter' || ev.key === ' ') {
                                    ev.preventDefault()
                                    toggleMeasureSelection(measureKey)
                                  }
                                }}
                              >
                                <div className="score-preview__sign-slot">
                                  <div className="score-preview__marker-line">
                                    {meta?.segno ? (
                                      <span className="score-preview__marker">세뇨</span>
                                    ) : null}
                                    {meta?.coda ? (
                                      <span className="score-preview__marker">Coda</span>
                                    ) : null}
                                    {meta?.toCoda ? (
                                      <span className="score-preview__marker">To Coda</span>
                                    ) : null}
                                    {meta?.fine ? (
                                      <span className="score-preview__marker">Fine</span>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="score-preview__chord-row">
                                  <span
                                    className={`score-preview__rep score-preview__rep--start${meta?.repeatStart ? '' : ' score-preview__rep--off'}`}
                                    aria-label={meta?.repeatStart ? '되돌이표 시작' : undefined}
                                    aria-hidden={!meta?.repeatStart}
                                  >
                                    |:
                                  </span>
                                  <div className="score-preview__chord-slot" aria-label="코드 영역">
                                    <div className="score-preview__chord-track">
                                      {measure.chords.map((chord, chordIndex) => {
                                        const positions = getChordTokenPositions(
                                          measure.chords.length,
                                        )
                                        return (
                                          <span
                                            key={`${measure.id}-chord-${chordIndex + 1}`}
                                            className="score-preview__chord-token"
                                            style={{ left: `${positions[chordIndex] ?? 0}%` }}
                                          >
                                            {chord}
                                          </span>
                                        )
                                      })}
                                    </div>
                                  </div>
                                  <span
                                    className={`score-preview__rep score-preview__rep--end${meta?.repeatEnd ? '' : ' score-preview__rep--off'}`}
                                    aria-label={meta?.repeatEnd ? '되돌이표 끝' : undefined}
                                    aria-hidden={!meta?.repeatEnd}
                                  >
                                    :|
                                  </span>
                                </div>
                                {measure.lyrics.map((lyricSlot, slotIndex) => (
                                  <div
                                    key={`${measure.id}-${lyricSlot.verseId}`}
                                    className={`score-preview__lyric-slot${slotIndex > 0 ? ' score-preview__lyric-slot--extra' : ''}`}
                                  >
                                    {lyricSlot.text.length > 0 ? (
                                      lyricSlot.text
                                    ) : (
                                      <span
                                        className="score-preview__measure-empty"
                                        aria-label={`${lyricSlot.label} 빈 마디`}
                                      >
                                        {'\u00A0'}
                                      </span>
                                    )}
                                  </div>
                                ))}
                                <div className="score-preview__jump-slot">
                                  {meta?.jumpDirective ? (
                                    <span className="score-preview__jump-text">
                                      {JUMP_LABELS[meta.jumpDirective]}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <div className="score-preview__measure score-preview__measure--empty-line">
                            <div className="score-preview__sign-slot" aria-hidden="true" />
                            <div className="score-preview__chord-row">
                              <span className="score-preview__rep score-preview__rep--start score-preview__rep--off">
                                |:
                              </span>
                              <div className="score-preview__chord-slot" aria-hidden="true" />
                              <span className="score-preview__rep score-preview__rep--end score-preview__rep--off">
                                :|
                              </span>
                            </div>
                            <div className="score-preview__lyric-slot">
                              <span className="score-preview__measure-empty" aria-label="빈 줄">
                                {'\u00A0'}
                              </span>
                            </div>
                            <div className="score-preview__jump-slot" />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <ScoreNotationPanel
                disabled={savingScore}
                selectionHint={notationSelectionHint}
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
            </>
          ) : (
            <p className="chord-finder__load-hint">
              1절 가사를 입력하면 줄/마디 기준 미리보기가 표시됩니다.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
