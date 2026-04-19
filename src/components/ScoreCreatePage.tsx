import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  fetchMyScores,
  saveMyScore,
  type ScoreDto,
} from '../api/scoresApi'
import { useAdminAuth } from '../hooks/useAdminAuth'

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

  const applyLoadedScore = (score: ScoreDto): void => {
    setCurrentScoreId(score.id)
    setTitle(score.title)
    setSharedChordText(score.sharedChordText)
    setDraft({
      verses: toEditorVersesFromStored(score.verses),
    })
    setActionError(null)
    setActionOk(`"${score.title}" 악보를 불러왔습니다.`)
  }

  const resetToNewScore = (): void => {
    setCurrentScoreId(null)
    setTitle('')
    setDraft(INITIAL_DRAFT)
    setSharedChordText('')
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
    try {
      const saved = await saveMyScore(
        {
          scoreId: currentScoreId,
          title: trimmedTitle,
          sharedChordText,
          verses: draft.verses.map((verse, index) => ({
            label: verse.label || `${index + 1}절`,
            lyrics: verse.lyrics,
          })),
        },
        token,
      )
      applyLoadedScore(saved)
      setActionOk(currentScoreId ? '수정 저장되었습니다.' : '새 악보로 저장되었습니다.')
      try {
        await reloadScores()
      } catch {
        setActionError('저장 후 목록을 새로고침하지 못했습니다.')
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
            <div className="score-preview" aria-live="polite">
              {previewLines.map((line) => (
                <div
                  key={line.id}
                  className="score-preview__row-wrap"
                  aria-label={`${line.lineIndex + 1}번째 줄`}
                >
                  <div
                    className={`score-preview__row${line.measures.length === 0 ? ' score-preview__row--empty' : ''}`}
                    style={
                      {
                        '--measure-count': String(
                          line.measures.length > 0 ? line.measures.length : 1,
                        ),
                      } as CSSProperties
                    }
                  >
                    {line.measures.length > 0 ? (
                      line.measures.map((measure) => (
                        <div key={measure.id} className="score-preview__measure">
                          <div className="score-preview__sign-slot" aria-hidden="true" />
                          <div className="score-preview__chord-slot" aria-label="코드 영역">
                            <div className="score-preview__chord-track">
                              {measure.chords.map((chord, chordIndex) => {
                                const positions = getChordTokenPositions(measure.chords.length)
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
                        </div>
                      ))
                    ) : (
                      <div className="score-preview__measure score-preview__measure--empty-line">
                        <div className="score-preview__sign-slot" aria-hidden="true" />
                        <div className="score-preview__chord-slot" aria-hidden="true" />
                        <div className="score-preview__lyric-slot">
                          <span className="score-preview__measure-empty" aria-label="빈 줄">
                            {'\u00A0'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
