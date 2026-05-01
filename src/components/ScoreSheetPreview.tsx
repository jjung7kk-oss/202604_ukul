import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import type { ChordShape } from '../types/chord'
import {
  JUMP_LABELS,
  makeMeasureKey,
  type JumpDirectiveKind,
  type ScoreNotationState,
} from '../lib/scoreNotation'
import { HorizontalChordDiagram } from './HorizontalChordDiagram'

export type PreviewMeasure = {
  id: string
  chords: string[]
  lyrics: {
    verseId: string
    label: string
    text: string
  }[]
}

export type PreviewLine = {
  id: string
  lineIndex: number
  measures: PreviewMeasure[]
}

/** Unicode Musical Symbols — 렌더는 Noto Music (index.html) */
const U_SEGNO = '\u{1D10B}'
const U_CODA = '\u{1D10C}'

/** 인쇄·PDF에서도 사라지지 않도록 벡터(SVG)로 그림 */
function RepeatStartSign() {
  return (
    <span className="score-preview__repeat-sign score-preview__repeat-sign--start" aria-label="되돌이표 시작">
      <svg
        className="score-preview__repeat-svg"
        width="20"
        height="18"
        viewBox="0 0 20 18"
        aria-hidden="true"
      >
        <rect x="0.5" y="0.5" width="3.5" height="17" fill="#050505" />
        <rect x="5.5" y="1.25" width="1.75" height="15.5" fill="#050505" />
        <circle cx="11.5" cy="5.5" r="1.65" fill="#050505" />
        <circle cx="11.5" cy="12.5" r="1.65" fill="#050505" />
      </svg>
    </span>
  )
}

function RepeatEndSign() {
  return (
    <span className="score-preview__repeat-sign score-preview__repeat-sign--end" aria-label="되돌이표 끝">
      <svg
        className="score-preview__repeat-svg"
        width="20"
        height="18"
        viewBox="0 0 20 18"
        aria-hidden="true"
      >
        <circle cx="8.5" cy="5.5" r="1.65" fill="#050505" />
        <circle cx="8.5" cy="12.5" r="1.65" fill="#050505" />
        <rect x="12.75" y="1.25" width="1.75" height="15.5" fill="#050505" />
        <rect x="15.5" y="0.5" width="3.5" height="17" fill="#050505" />
      </svg>
    </span>
  )
}

function StaffMeasureTick({
  leftPct,
  tickKind,
}: {
  leftPct: number
  tickKind: 'inner' | 'start' | 'end'
}) {
  const thick = tickKind !== 'inner'
  return (
    <svg
      className="score-preview__staff-tick-svg"
      style={{ left: `${leftPct}%` }}
      width={thick ? 5 : 4}
      height="18"
      viewBox={thick ? '0 0 5 18' : '0 0 4 18'}
      aria-hidden="true"
    >
      {thick ? (
        <rect x="0.75" y="1" width="3.5" height="16" fill="#111" />
      ) : (
        <rect x="0.5" y="1" width="3" height="16" fill="#111" />
      )}
    </svg>
  )
}

function jumpLeadAndTail(kind: JumpDirectiveKind): { lead: string; tail: string } {
  const table: Record<JumpDirectiveKind, { lead: string; tail: string }> = {
    DS_AL_CODA: { lead: 'D.S.', tail: ' al Coda' },
    DS_AL_FINE: { lead: 'D.S.', tail: ' al Fine' },
    DC_AL_CODA: { lead: 'D.C.', tail: ' al Coda' },
    DC_AL_FINE: { lead: 'D.C.', tail: ' al Fine' },
  }
  return table[kind]
}

type ChordAnchor = 'start' | 'center' | 'end'

function getChordTokenLayouts(
  chordCount: number,
): { leftPct: number; anchor: ChordAnchor }[] {
  if (chordCount <= 0) return []
  if (chordCount === 1) return [{ leftPct: 0, anchor: 'start' }]
  if (chordCount === 2) {
    return [
      { leftPct: 0, anchor: 'start' },
      { leftPct: 50, anchor: 'center' },
    ]
  }
  return Array.from({ length: chordCount }, (_, i) => {
    const leftPct = (i / (chordCount - 1)) * 100
    const anchor: ChordAnchor =
      i === 0 ? 'start' : i === chordCount - 1 ? 'end' : 'center'
    return { leftPct, anchor }
  })
}

function chordTokenTransform(anchor: ChordAnchor): string | undefined {
  if (anchor === 'center') return 'translateX(-50%)'
  if (anchor === 'end') return 'translateX(-100%)'
  return undefined
}

function LyricFitText({
  text,
  className,
  emptyLabel,
}: {
  text: string
  className?: string
  emptyLabel?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  const displayText = text.replace(/\r?\n/g, ' ')

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = (): void => {
      const maxPx = 16
      const minPx = 9
      if (!displayText.trim()) {
        el.style.fontSize = ''
        return
      }
      el.style.fontSize = `${maxPx}px`
      let size = maxPx
      const w = el.clientWidth
      if (w <= 0) return
      let guard = 0
      while (size > minPx && el.scrollWidth > w && guard < 56) {
        size -= 0.5
        el.style.fontSize = `${size}px`
        guard += 1
      }
    }
    fit()
    const parent = el.parentElement
    if (!parent) return
    const ro = new ResizeObserver(() => fit())
    ro.observe(parent)
    return () => ro.disconnect()
  }, [displayText])

  if (!text.trim()) {
    return (
      <span className={className} aria-label={emptyLabel}>
        {'\u00A0'}
      </span>
    )
  }

  return (
    <div
      ref={ref}
      className={`score-preview__lyric-fit${className ? ` ${className}` : ''}`}
    >
      {displayText}
    </div>
  )
}

export type ScoreSheetPreviewProps = {
  title: string
  artist?: string
  lines: PreviewLine[]
  notation: ScoreNotationState
  unknownChordShapes?: ReadonlyMap<string, ChordShape>
  showUnknownChordsBelowTitle?: boolean
  unknownChordBodyMode?: 'none' | 'first' | 'all'
  selectedMeasureKeys: ReadonlySet<string>
  onToggleMeasureKey: (measureKey: string) => void
  interactive: boolean
}

export function ScoreSheetPreview({
  title,
  artist = '',
  lines,
  notation,
  unknownChordShapes = new Map<string, ChordShape>(),
  showUnknownChordsBelowTitle = false,
  unknownChordBodyMode = 'none',
  selectedMeasureKeys,
  onToggleMeasureKey,
  interactive,
}: ScoreSheetPreviewProps) {
  const unknownBodyVisible = unknownChordShapes.size > 0 && unknownChordBodyMode !== 'none'
  const shownUnknownInBody = new Set<string>()
  const measureBlock = (lineIndex: number, measureIndex: number) => {
    const measureKey = makeMeasureKey(lineIndex, measureIndex)
    const meta = notation.measures[measureKey]
    const selected = selectedMeasureKeys.has(measureKey)
    const cellSel = selected ? ' score-preview__sheet-cell--selected' : ''
    const activate = () => {
      if (!interactive) return
      onToggleMeasureKey(measureKey)
    }
    const onKeyChord = (ev: KeyboardEvent) => {
      if (!interactive) return
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault()
        activate()
      }
    }
    return { meta, selected, cellSel, activate, onKeyChord }
  }

  return (
    <div
      className={`score-preview${interactive ? '' : ' score-preview--readonly'}${unknownBodyVisible ? ' score-preview--unknown-inline' : ''}`}
      aria-live="polite"
    >
      <header className="score-preview__sheet-head">
        <h3 className="score-preview__sheet-title">{title}</h3>
        {artist.trim().length > 0 ? (
          <p className="score-preview__sheet-artist">{artist.trim()}</p>
        ) : null}
      </header>
      {showUnknownChordsBelowTitle && unknownChordShapes.size > 0 ? (
        <section className="score-preview__unknown-band" aria-label="모르는 코드 운지">
          {[...unknownChordShapes.entries()].map(([symbol, shape]) => (
            <article key={`unknown-title-${symbol}`} className="score-preview__unknown-card">
              <h4 className="score-preview__unknown-name">{symbol}</h4>
              <div className="score-preview__unknown-diagram-wrap">
                <HorizontalChordDiagram shape={shape} className="score-preview__unknown-diagram" />
              </div>
            </article>
          ))}
        </section>
      ) : null}
      {lines.map((line) => {
        const measureCount = line.measures.length > 0 ? line.measures.length : 1
        const voltaForLine = notation.endings.filter((e) => e.lineIndex === line.lineIndex)
        const repeatBoundaryTicks = new Set<number>()
        line.measures.forEach((_, measureIndex) => {
          const measureKey = makeMeasureKey(line.lineIndex, measureIndex)
          const meta = notation.measures[measureKey]
          if (meta?.repeatStart) repeatBoundaryTicks.add(measureIndex)
          if (meta?.repeatEnd) repeatBoundaryTicks.add(measureIndex + 1)
        })
        const sheetGridStyle = {
          '--measure-count': String(measureCount),
          gridTemplateColumns: `repeat(${measureCount}, minmax(0, 1fr))`,
        } as CSSProperties

        return (
          <div
            key={line.id}
            className="score-preview__row-wrap"
            aria-label={`${line.lineIndex + 1}번째 줄`}
          >
            <span className="score-preview__row-index" aria-hidden="true">
              {line.lineIndex + 1}
            </span>
            <div className="score-preview__staff-line">
            {voltaForLine.length > 0 ? (
              <div
                className="score-preview__volta-layer"
                style={
                  {
                    '--measure-count': String(measureCount),
                  } as CSSProperties
                }
              >
                {[...voltaForLine]
                  .sort((a, b) => a.startMeasureIndex - b.startMeasureIndex)
                  .map((e, idx, arr) => {
                    const prev = arr[idx - 1]
                    const next = arr[idx + 1]
                    const gapBefore =
                      prev != null && prev.endMeasureIndex + 1 === e.startMeasureIndex
                    const gapAfter =
                      next != null && e.endMeasureIndex + 1 === next.startMeasureIndex
                    return (
                      <div
                        key={e.id}
                        className={[
                          'score-preview__volta-bracket',
                          `score-preview__volta-bracket--t${e.type}`,
                          gapBefore ? 'score-preview__volta-bracket--adj-prev' : '',
                          gapAfter ? 'score-preview__volta-bracket--adj-next' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        style={
                          {
                            gridColumn: `${e.startMeasureIndex + 1} / ${e.endMeasureIndex + 2}`,
                          } as CSSProperties
                        }
                      >
                        <span className="score-preview__volta-label">{e.type}.</span>
                      </div>
                    )
                  })}
              </div>
            ) : null}
            <div
              className={`score-preview__sheet${line.measures.length === 0 ? ' score-preview__sheet--empty' : ''}`}
            >
              <div className="score-preview__sheet-inner" style={sheetGridStyle}>
              {line.measures.length > 0 ? (
                <>
                  {line.measures.map((measure, measureIndex) => {
                    const b = measureBlock(line.lineIndex, measureIndex)
                    const chordLayouts = getChordTokenLayouts(measure.chords.length)
                    return (
                      <div
                        key={`${measure.id}-chords`}
                        className={`score-preview__sheet-cell score-preview__sheet-cell--chords${b.cellSel}`}
                        style={{ gridColumn: measureIndex + 1, gridRow: 1 }}
                        {...(interactive
                          ? {
                              role: 'button' as const,
                              tabIndex: 0,
                              'aria-pressed': b.selected,
                              'aria-label': `마디 ${measureIndex + 1} 코드, 선택 ${b.selected ? '됨' : '안 됨'}`,
                              onClick: b.activate,
                              onKeyDown: b.onKeyChord,
                            }
                          : {
                              'aria-label': `마디 ${measureIndex + 1} 코드`,
                            })}
                      >
                        {b.meta?.segno ? (
                          <span
                            className="score-preview__corner-segno"
                            title="Segno"
                            aria-label="세뇨"
                          >
                            <span className="score-preview__glyph-music" aria-hidden="true">
                              {U_SEGNO}
                            </span>
                          </span>
                        ) : null}
                        <div className="score-preview__chord-row">
                          <div className="score-preview__chord-slot" aria-label="코드">
                            <div className="score-preview__chord-track">
                              {measure.chords.map((chord, chordIndex) => {
                                const layout = chordLayouts[chordIndex] ?? {
                                  leftPct: 0,
                                  anchor: 'start' as const,
                                }
                                const unknownShape = unknownChordShapes.get(chord)
                                let showUnknownInBody = false
                                if (unknownShape && unknownChordBodyMode !== 'none') {
                                  if (unknownChordBodyMode === 'all') {
                                    showUnknownInBody = true
                                  } else if (!shownUnknownInBody.has(chord)) {
                                    shownUnknownInBody.add(chord)
                                    showUnknownInBody = true
                                  }
                                }
                                return (
                                  <span
                                    key={`${measure.id}-chord-${chordIndex + 1}`}
                                    className="score-preview__chord-token"
                                    style={{
                                      left: `${layout.leftPct}%`,
                                      transform: chordTokenTransform(layout.anchor),
                                    }}
                                  >
                                    <span className="score-preview__chord-token-label">{chord}</span>
                                    {showUnknownInBody && unknownShape ? (
                                      <span className="score-preview__inline-diagram-wrap" aria-hidden="true">
                                        <HorizontalChordDiagram
                                          shape={unknownShape}
                                          className="score-preview__inline-diagram"
                                        />
                                      </span>
                                    ) : null}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {line.measures.map((measure, measureIndex) => {
                    const b = measureBlock(line.lineIndex, measureIndex)
                    return (
                      <div
                        key={`${measure.id}-staff-seg`}
                        className="score-preview__staff-seg"
                        style={{ gridColumn: measureIndex + 1, gridRow: 2 }}
                      >
                        {b.meta?.repeatStart ? <RepeatStartSign /> : null}
                        {b.meta?.repeatEnd ? <RepeatEndSign /> : null}
                        {b.meta?.coda ? (
                          <span className="score-preview__staff-coda" title="Coda" aria-label="코다">
                            <span className="score-preview__glyph-music">{U_CODA}</span>
                          </span>
                        ) : null}
                        {b.meta?.toCoda ? (
                          <span className="score-preview__staff-to-coda" title="To Coda" aria-label="투 코다">
                            <span className="score-preview__staff-to-coda-prefix" aria-hidden="true">
                              To
                            </span>
                            <span className="score-preview__glyph-music">{U_CODA}</span>
                          </span>
                        ) : null}
                      </div>
                    )
                  })}
                  <div
                    className="score-preview__staff score-preview__staff--underlays"
                    style={{ gridColumn: '1 / -1', gridRow: 2 }}
                  >
                    <div className="score-preview__staff-hline" aria-hidden="true" />
                    {Array.from({ length: measureCount + 1 }, (_, tickIndex) => {
                      if (repeatBoundaryTicks.has(tickIndex)) return null
                      const leftPct = (100 * tickIndex) / measureCount
                      const tickKind =
                        tickIndex === 0 ? 'start' : tickIndex === measureCount ? 'end' : 'inner'
                      return (
                        <StaffMeasureTick
                          key={`${line.id}-tick-${tickIndex}`}
                          leftPct={leftPct}
                          tickKind={tickKind}
                        />
                      )
                    })}
                  </div>
                  {line.measures.map((measure, measureIndex) => {
                    const b = measureBlock(line.lineIndex, measureIndex)
                    return (
                      <div
                        key={`${measure.id}-lyrics`}
                        className={`score-preview__sheet-cell score-preview__sheet-cell--lyrics${b.meta?.fine ? ' score-preview__sheet-cell--has-fine' : ''}${b.cellSel}`}
                        style={{ gridColumn: measureIndex + 1, gridRow: 3 }}
                        role="presentation"
                        {...(interactive ? { onClick: b.activate } : {})}
                      >
                        {b.meta?.fine ? (
                          <span className="score-preview__corner-fine" title="Fine" aria-label="피네">
                            Fine
                          </span>
                        ) : null}
                        {measure.lyrics.map((lyricSlot, slotIndex) => (
                          <div
                            key={`${measure.id}-${lyricSlot.verseId}`}
                            className={`score-preview__lyric-slot${slotIndex > 0 ? ' score-preview__lyric-slot--extra' : ''}`}
                          >
                            <LyricFitText
                              text={lyricSlot.text}
                              className={
                                lyricSlot.text.length > 0
                                  ? undefined
                                  : 'score-preview__measure-empty'
                              }
                              emptyLabel={`${lyricSlot.label} 빈 마디`}
                            />
                          </div>
                        ))}
                      </div>
                    )
                  })}
                  {line.measures.map((measure, measureIndex) => {
                    const b = measureBlock(line.lineIndex, measureIndex)
                    return (
                      <div
                        key={`${measure.id}-jump`}
                        className={`score-preview__sheet-cell score-preview__sheet-cell--jump${b.cellSel}`}
                        style={{ gridColumn: measureIndex + 1, gridRow: 4 }}
                        role="presentation"
                        {...(interactive ? { onClick: b.activate } : {})}
                      >
                        <div className="score-preview__jump-slot">
                          {b.meta?.jumpDirective ? (
                            <div
                              className="score-preview__jump-inline"
                              aria-label={JUMP_LABELS[b.meta.jumpDirective]}
                            >
                              {(() => {
                                const { lead, tail } = jumpLeadAndTail(b.meta.jumpDirective)
                                const tailTrim = tail.trim()
                                return (
                                  <>
                                    <span className="score-preview__jump-lead-part">{lead}</span>
                                    {tailTrim ? (
                                      <span className="score-preview__jump-tail-part">{tailTrim}</span>
                                    ) : null}
                                  </>
                                )
                              })()}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </>
              ) : (
                <>
                  <div
                    className="score-preview__sheet-cell score-preview__sheet-cell--chords"
                    style={{ gridColumn: 1, gridRow: 1 }}
                  >
                    <div className="score-preview__chord-row">
                      <div className="score-preview__chord-slot" aria-hidden="true" />
                    </div>
                  </div>
                  <div
                    className="score-preview__staff-seg"
                    style={{ gridColumn: 1, gridRow: 2 }}
                    aria-hidden="true"
                  />
                  <div
                    className="score-preview__staff score-preview__staff--underlays"
                    style={{ gridColumn: '1 / -1', gridRow: 2 }}
                  >
                    <div className="score-preview__staff-hline" aria-hidden="true" />
                    <StaffMeasureTick leftPct={0} tickKind="start" />
                    <StaffMeasureTick leftPct={100} tickKind="end" />
                  </div>
                  <div
                    className="score-preview__sheet-cell score-preview__sheet-cell--lyrics"
                    style={{ gridColumn: 1, gridRow: 3 }}
                  >
                    <div className="score-preview__lyric-slot">
                      <span className="score-preview__measure-empty" aria-label="빈 줄">
                        {'\u00A0'}
                      </span>
                    </div>
                  </div>
                  <div
                    className="score-preview__sheet-cell score-preview__sheet-cell--jump"
                    style={{ gridColumn: 1, gridRow: 4 }}
                  >
                    <div className="score-preview__jump-slot" />
                  </div>
                </>
              )}
              </div>
            </div>
            </div>
          </div>
        )
      })}
      <footer className="score-preview__brand-footer" aria-label="브랜드 표식">
        <img
          className="score-preview__brand-footer-logo"
          src="/brand_images/images/logo.png"
          alt="후이코드 로고"
        />
        <span className="score-preview__brand-footer-sep" aria-hidden="true">
          ·
        </span>
        <span className="score-preview__brand-footer-text">#후이후이카이 우쿨렐레</span>
        <span className="score-preview__brand-footer-sep" aria-hidden="true">
          ·
        </span>
        <span className="score-preview__brand-footer-insta" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img">
            <defs>
              <radialGradient id="score-preview-ig-grad" cx="30%" cy="107%" r="130%">
                <stop offset="0%" stopColor="#fdf497" />
                <stop offset="30%" stopColor="#fd5949" />
                <stop offset="60%" stopColor="#d6249f" />
                <stop offset="100%" stopColor="#285AEB" />
              </radialGradient>
            </defs>
            <rect x="2.8" y="2.8" width="18.4" height="18.4" rx="5.6" fill="url(#score-preview-ig-grad)" />
            <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.9" />
            <circle cx="17.7" cy="6.8" r="1.25" fill="#fff" />
          </svg>
        </span>
        <span className="score-preview__brand-footer-text">huihui_kai</span>
      </footer>
    </div>
  )
}
