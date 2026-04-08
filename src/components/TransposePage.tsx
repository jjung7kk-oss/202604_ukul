import { useEffect, useMemo, useState } from 'react'
import {
  fetchChordLibrary,
  type ChordLibraryLoadInfo,
} from '../api/chordsApi'
import { ChordDataFallbackBanner } from './ChordDataFallbackBanner'
import { CANONICAL_ROOTS, QUALITY_ORDER } from '../data/chordData'
import { TRANSPOSE_KEY_PRESETS } from '../data/transposePresets'
import type {
  CanonicalRootName,
  ChordLibrary,
  ChordQuality,
} from '../types/chord'
import { getRepresentativeShapeForSymbol } from '../utils/chordSymbolShape'
import {
  formatChordSymbol,
  semitoneStepsBetweenKeys,
  transposeChordName,
} from '../utils/transposeChordName'
import { HorizontalChordDiagram } from './HorizontalChordDiagram'

type ListMode = 'all' | 'pick'

export function TransposePage() {
  const [fromKey, setFromKey] = useState<CanonicalRootName>('C')
  const [toKey, setToKey] = useState<CanonicalRootName>('D')
  const [listMode, setListMode] = useState<ListMode>('all')
  const [customRoot, setCustomRoot] = useState<CanonicalRootName>('C')
  const [customQuality, setCustomQuality] = useState<ChordQuality>('major')
  const [customSymbols, setCustomSymbols] = useState<string[]>([])
  const [library, setLibrary] = useState<ChordLibrary | null>(null)
  const [libraryLoadInfo, setLibraryLoadInfo] =
    useState<ChordLibraryLoadInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const presetForKey = TRANSPOSE_KEY_PRESETS[fromKey]

  useEffect(() => {
    let cancelled = false
    fetchChordLibrary()
      .then(({ library: lib, loadInfo }) => {
        if (!cancelled) {
          setLibrary(lib)
          setLibraryLoadInfo(loadInfo)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sourceSymbols = useMemo(() => {
    if (listMode === 'all') {
      return [...presetForKey]
    }
    return customSymbols
  }, [customSymbols, listMode, presetForKey])

  const semitoneSteps = useMemo(
    () => semitoneStepsBetweenKeys(fromKey, toKey),
    [fromKey, toKey],
  )

  const rows = useMemo(() => {
    return sourceSymbols.map((before) => {
      const after = transposeChordName(before, semitoneSteps)
      const shape =
        after != null
          ? getRepresentativeShapeForSymbol(library, after)
          : null
      return { before, after, shape }
    })
  }, [library, semitoneSteps, sourceSymbols])

  const showResults = sourceSymbols.length > 0

  const candidateSymbol = useMemo(
    () => formatChordSymbol({ root: customRoot, quality: customQuality }),
    [customQuality, customRoot],
  )

  function addCustomSymbol(): void {
    const symbol = candidateSymbol
    setCustomSymbols((prev) => (prev.includes(symbol) ? prev : [...prev, symbol]))
  }

  function removeCustomSymbol(symbol: string): void {
    setCustomSymbols((prev) => prev.filter((s) => s !== symbol))
  }

  return (
    <section className="transpose-page" aria-labelledby="transpose-title">
      <div className="chord-finder__hero chord-finder__hero--compact">
        <h1 id="transpose-title" className="chord-finder__hero-title">
          조변환
        </h1>
        <p className="chord-finder__hero-desc">
          원래 코드를 원하는 키로 쉽게 바꿔볼 수 있어요.
        </p>
      </div>

      {loading ? (
        <p className="chord-finder__load-hint" aria-live="polite">
          코드 데이터를 불러오는 중…
        </p>
      ) : null}

      <div className="transpose-page__controls">
        <div className="section-card">
          <h2 className="chord-finder__heading">원곡 키</h2>
          <p className="transpose-page__hint">
            키는 샵 표기만 사용해요 (
            {CANONICAL_ROOTS.join(', ')}).
          </p>
          <div className="tab-strip tab-strip--wrap" role="group" aria-label="원곡 키">
            {CANONICAL_ROOTS.map((k) => (
              <button
                key={k}
                type="button"
                className={`tab-strip__btn${fromKey === k ? ' tab-strip__btn--active' : ''}`}
                onClick={() => setFromKey(k)}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <div className="section-card">
          <h2 className="chord-finder__heading">목표 키</h2>
          <p className="transpose-page__hint">
            원곡에서{' '}
            <strong>
              {semitoneSteps === 0
                ? '0'
                : semitoneSteps <= 6
                  ? `+${semitoneSteps}`
                  : `−${12 - semitoneSteps}`}
            </strong>{' '}
            칸 옮겨서 계산해요.
          </p>
          <div className="tab-strip tab-strip--wrap" role="group" aria-label="목표 키">
            {CANONICAL_ROOTS.map((k) => (
              <button
                key={k}
                type="button"
                className={`tab-strip__btn${toKey === k ? ' tab-strip__btn--active' : ''}`}
                onClick={() => setToKey(k)}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <div className="section-card">
          <h2 className="chord-finder__heading">코드 목록</h2>
          <div
            className="transpose-page__mode"
            role="radiogroup"
            aria-label="코드 목록 선택 방식"
          >
            <button
              type="button"
              role="radio"
              aria-checked={listMode === 'all'}
              className={`tab-strip__btn${listMode === 'all' ? ' tab-strip__btn--active' : ''}`}
              onClick={() => setListMode('all')}
            >
              기본 코드 전체
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={listMode === 'pick'}
              className={`tab-strip__btn${listMode === 'pick' ? ' tab-strip__btn--active' : ''}`}
              onClick={() => setListMode('pick')}
            >
              직접 선택
            </button>
          </div>

          {listMode === 'pick' ? (
            <>
              <p className="transpose-page__hint">
                루트음과 코드 타입을 고른 뒤, 코드를 목록에 추가해 주세요.
              </p>
              <div className="transpose-page__builder">
                <div className="transpose-page__builder-row">
                  <span className="transpose-page__builder-label">루트음</span>
                  <div className="tab-strip tab-strip--wrap">
                    {CANONICAL_ROOTS.map((k) => (
                      <button
                        key={k}
                        type="button"
                        className={`tab-strip__btn${customRoot === k ? ' tab-strip__btn--active' : ''}`}
                        onClick={() => setCustomRoot(k)}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="transpose-page__builder-row">
                  <span className="transpose-page__builder-label">코드 타입</span>
                  <div className="tab-strip tab-strip--wrap">
                    {QUALITY_ORDER.map((q) => (
                      <button
                        key={q.key}
                        type="button"
                        className={`tab-strip__btn${customQuality === q.key ? ' tab-strip__btn--active' : ''}`}
                        onClick={() => setCustomQuality(q.key)}
                      >
                        {q.label || 'major'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="transpose-page__builder-actions">
                  <span className="transpose-page__builder-picked">
                    선택 코드: <strong>{candidateSymbol}</strong>
                  </span>
                  <button
                    type="button"
                    className="tab-strip__btn tab-strip__btn--active"
                    onClick={addCustomSymbol}
                    disabled={customSymbols.includes(candidateSymbol)}
                  >
                    코드 추가
                  </button>
                </div>
              </div>

              <div className="transpose-page__picked-list">
                {customSymbols.length === 0 ? (
                  <p className="transpose-page__hint">
                    아직 추가된 코드가 없습니다.
                  </p>
                ) : (
                  customSymbols.map((sym) => (
                    <div key={sym} className="transpose-page__picked-item">
                      <span className="transpose-page__cell-name">{sym}</span>
                      <button
                        type="button"
                        className="chord-edit__btn chord-edit__btn--ghost"
                        onClick={() => removeCustomSymbol(sym)}
                      >
                        삭제
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <p className="transpose-page__hint">
              <strong>{fromKey}</strong> 키의 기본 7코드 전부를 변환합니다.
            </p>
          )}
        </div>
      </div>

      {listMode === 'pick' && customSymbols.length === 0 ? (
        <p className="chord-grid__empty" role="status">
          직접 선택 모드에서는 코드를 하나 이상 추가하면 결과가 표시됩니다.
        </p>
      ) : null}

      {showResults ? (
        <div className="section-card transpose-page__results">
          <h2 className="chord-finder__heading">결과</h2>
          <div className="transpose-page__table-wrap">
            <table className="transpose-page__table">
              <thead>
                <tr>
                  <th scope="col">변경 전</th>
                  <th scope="col">변경 후</th>
                  <th scope="col">대표 운지</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ before, after, shape }) => (
                  <tr key={before}>
                    <td className="transpose-page__cell-name">{before}</td>
                    <td className="transpose-page__cell-name">
                      {after ?? '—'}
                    </td>
                    <td className="transpose-page__cell-diagram">
                      {shape ? (
                        <div className="transpose-page__diagram">
                          <HorizontalChordDiagram shape={shape} />
                        </div>
                      ) : (
                        <span className="transpose-page__no-shape">운지 없음</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {!loading && library && libraryLoadInfo?.source === 'fallback' ? (
        <ChordDataFallbackBanner info={libraryLoadInfo} />
      ) : null}
    </section>
  )
}
