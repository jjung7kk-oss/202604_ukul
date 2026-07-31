import type { ChordShape } from '../types/chord'

const STRING_LABELS_AECG = ['A', 'E', 'C', 'G'] as const

type Props = {
  shape: ChordShape
  className?: string
  /** 악보 미리보기 등 — 선·점 대비를 조금 높임 */
  variant?: 'default' | 'preview'
}

/** 저장 순서 GCEA → 화면은 위에서 아래 AECG */
function toDisplayFrets(gcea: [number, number, number, number]): number[] {
  const [g, c, e, a] = gcea
  return [a, e, c, g]
}

function computeFretSpan(frets: number[]): number {
  const maxF = Math.max(0, ...frets)
  return Math.max(4, maxF)
}

export function HorizontalChordDiagram({ shape, className, variant = 'default' }: Props) {
  const displayFrets = toDisplayFrets(shape.frets)
  const numFrets = computeFretSpan(displayFrets)
  const isPreview = variant === 'preview'

  /** 칸은 가로로 조금 더 긴 직사각형, 전체는 가로:세로 ≈ 1.5 : 1 부근 */
  const leftLabelW = isPreview ? 0 : 11
  const nutLineX = isPreview ? 3 : leftLabelW + 5
  const cellW = 24
  const stringGap = 16
  const topPad = 8
  const bottomPad = 8
  const rightPad = 9

  const boardRight = nutLineX + numFrets * cellW
  const width = boardRight + rightPad
  const height = topPad + 4 * stringGap + bottomPad

  const stringYs = [0, 1, 2, 3].map((i) => topPad + i * stringGap)
  const yTop = stringYs[0]!
  const yBottom = stringYs[3]!

  /** fret k≥1 = k번째 프렛 칸 중앙. 0(오픈)은 별도 영역에 표시하지 않음 */
  const dotCenterX = (fret: number) => {
    if (fret <= 0) return null
    return nutLineX + (fret - 0.5) * cellW
  }

  const lineMuted = isPreview ? '#444444' : '#94a3b8'
  const lineStrong = isPreview ? '#111111' : '#475569'
  const nutStroke = isPreview ? '#050505' : '#334155'
  const stringStrokeWidth = isPreview ? 1.5 : 1.1
  const fretStrokeWidth = isPreview ? 1.35 : 1
  const nutStrokeWidth = isPreview ? 2.75 : 2.5
  const dotRadius = isPreview ? 8 : 6

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`코드 운지 ${shape.frets.join('-')}`}
    >
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="var(--color-bg-card, #ffffff)"
      />

      {!isPreview
        ? STRING_LABELS_AECG.map((label, i) => (
            <text
              key={label}
              x={leftLabelW}
              y={stringYs[i]! + 3.5}
              textAnchor="end"
              fontSize="8"
              fontWeight="500"
              fill="#94a3b8"
              fontFamily="var(--font-family, system-ui, sans-serif)"
            >
              {label}
            </text>
          ))
        : null}

      <line
        x1={nutLineX}
        y1={yTop}
        x2={nutLineX}
        y2={yBottom}
        stroke={nutStroke}
        strokeWidth={nutStrokeWidth}
        strokeLinecap="butt"
      />

      {stringYs.map((y) => (
        <line
          key={y}
          x1={nutLineX}
          y1={y}
          x2={boardRight}
          y2={y}
          stroke={lineStrong}
          strokeWidth={stringStrokeWidth}
          strokeLinecap="butt"
        />
      ))}

      {Array.from({ length: numFrets }, (_, j) => j + 1).map((k) => (
        <line
          key={k}
          x1={nutLineX + k * cellW}
          y1={yTop}
          x2={nutLineX + k * cellW}
          y2={yBottom}
          stroke={lineMuted}
          strokeWidth={fretStrokeWidth}
          strokeLinecap="butt"
        />
      ))}

      {displayFrets.map((f, i) => {
        if (f <= 0) return null
        const cx = dotCenterX(f)
        if (cx == null) return null
        const cy = stringYs[i]!
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={dotRadius}
            fill="var(--color-primary, #2f80ed)"
          />
        )
      })}
    </svg>
  )
}
