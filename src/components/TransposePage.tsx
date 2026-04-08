import { useEffect, useMemo, useState } from 'react'
import {
  fetchChordLibrary,
  type ChordLibraryLoadInfo,
} from '../api/chordsApi'
import { ChordDataFallbackBanner } from './ChordDataFallbackBanner'
import { CANONICAL_ROOTS } from '../data/chordData'
import { TRANSPOSE_KEY_PRESETS } from '../data/transposePresets'
import type { CanonicalRootName, ChordLibrary } from '../types/chord'
import { getRepresentativeShapeForSymbol } from '../utils/chordSymbolShape'
import {
  semitoneStepsBetweenKeys,
  transposeChordName,
} from '../utils/transposeChordName'
import { HorizontalChordDiagram } from './HorizontalChordDiagram'

type ListMode = 'all' | 'pick'

export function TransposePage() {
  const [fromKey, setFromKey] = useState<CanonicalRootName>('C')
  const [toKey, setToKey] = useState<CanonicalRootName>('D')
  const [listMode, setListMode] = useState<ListMode>('all')
  const [picked, setPicked] = useState<Set<string>>(() => new Set())
  const [library, setLibrary] = useState<ChordLibrary | null>(null)
  const [libraryLoadInfo, setLibraryLoadInfo] =
    useState<ChordLibraryLoadInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const presetForKey = TRANSPOSE_KEY_PRESETS[fromKey]

  function selectFromKey(k: CanonicalRootName): void {
    setFromKey(k)
    setPicked(new Set())
  }

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
    return presetForKey.filter((sym) => picked.has(sym))
  }, [listMode, presetForKey, picked])

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

  const showResults =
    sourceSymbols.length > 0 && (listMode === 'all' || picked.size > 0)

  function togglePicked(symbol: string): void {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(symbol)) next.delete(symbol)
      else next.add(symbol)
      return next
    })
  }

  return (
    <section className="transpose-page" aria-labelledby="transpose-title">
      <div className="chord-finder__hero chord-finder__hero--compact">
        <h1 id="transpose-title" className="chord-finder__hero-title">
          조변환
        </h1>
        <p className="chord-finder__hero-desc">
          원곡 키와 목표 키를 고르면 코드 이름만 반음 단위로 옮기고, 운지는 서버
          또는 앱에 포함된 코드표에서 해당 코드를 다시 불러와 보여줍니다.
        </p>
      </div>

      {!loading && library && libraryLoadInfo?.source === 'fallback' ? (
        <ChordDataFallbackBanner info={libraryLoadInfo} />
      ) : null}
      {loading ? (
        <p className="chord-finder__load-hint" aria-live="polite">
          코드 데이터를 불러오는 중…
        </p>
      ) : null}

      <div className="transpose-page__controls">
        <div className="section-card">
          <h2 className="chord-finder__heading">원곡 키</h2>
          <p className="transpose-page__hint">
            기본 코드 프리셋과 계산 기준은 샵 표기(
            {CANONICAL_ROOTS.join(', ')})입니다.
          </p>
          <div className="tab-strip tab-strip--wrap" role="group" aria-label="원곡 키">
            {CANONICAL_ROOTS.map((k) => (
              <button
                key={k}
                type="button"
                className={`tab-strip__btn${fromKey === k ? ' tab-strip__btn--active' : ''}`}
                onClick={() => selectFromKey(k)}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <div className="section-card">
          <h2 className="chord-finder__heading">목표 키</h2>
          <p className="transpose-page__hint">
            원곡 대비{' '}
            <strong>
              {semitoneSteps === 0
                ? '0'
                : semitoneSteps <= 6
                  ? `+${semitoneSteps}`
                  : `−${12 - semitoneSteps}`}
            </strong>{' '}
            반음 이동으로 계산합니다.
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
                원곡 키 기준 7개 중 필요한 코드만 골라주세요.
              </p>
              <div className="transpose-page__chips">
                {presetForKey.map((sym) => {
                  const on = picked.has(sym)
                  return (
                    <label key={sym} className="transpose-page__chip">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => togglePicked(sym)}
                      />
                      <span>{sym}</span>
                    </label>
                  )
                })}
              </div>
            </>
          ) : (
            <p className="transpose-page__hint">
              <strong>{fromKey}</strong> 키의 기본 7코드 전부를 변환합니다.
            </p>
          )}
        </div>
      </div>

      {listMode === 'pick' && picked.size === 0 ? (
        <p className="chord-grid__empty" role="status">
          직접 선택 모드에서는 코드를 하나 이상 선택하면 결과가 표시됩니다.
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
    </section>
  )
}
