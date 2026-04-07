import type { ChordShape } from '../types/chord'

const STRING_LABELS_AECG = ['A', 'E', 'C', 'G'] as const

type Props = {
  shape: ChordShape
  className?: string
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

export function HorizontalChordDiagram({ shape, className }: Props) {
  const displayFrets = toDisplayFrets(shape.frets)
  const numFrets = computeFretSpan(displayFrets)

  const leftLabelW = 22
  const nutLineX = leftLabelW + 10
  const cellW = 30
  const stringGap = 16
  const topPad = 14
  const rightPad = 12
  const bottomPad = 14

  const boardRight = nutLineX + numFrets * cellW
  const width = boardRight + rightPad
  const height = topPad + stringGap * 3 + stringGap + bottomPad

  const stringYs = [0, 1, 2, 3].map((i) => topPad + i * stringGap)
  const yTop = stringYs[0]!
  const yBottom = stringYs[3]!

  /** fret 0 = 오픈(너트 왼쪽), fret k≥1 = k번째 프렛 칸 중앙 */
  const dotCenterX = (fret: number) => {
    if (fret <= 0) return nutLineX - 8
    return nutLineX + (fret - 0.5) * cellW
  }

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

      {STRING_LABELS_AECG.map((label, i) => (
        <text
          key={label}
          x={leftLabelW - 4}
          y={stringYs[i] + 5}
          textAnchor="end"
          fontSize="12"
          fill="var(--color-text-main, #1f2d3d)"
          fontFamily="var(--font-family, system-ui, sans-serif)"
        >
          {label}
        </text>
      ))}

      {/* 너트 (왼쪽 굵은 세로선) — 가로줄 범위 안에서만 */}
      <line
        x1={nutLineX}
        y1={yTop}
        x2={nutLineX}
        y2={yBottom}
        stroke="var(--color-text-main, #1f2d3d)"
        strokeWidth={5}
        strokeLinecap="butt"
      />

      {/* 줄 (가로선, 너트 오른쪽) */}
      {stringYs.map((y) => (
        <line
          key={y}
          x1={nutLineX}
          y1={y}
          x2={boardRight}
          y2={y}
          stroke="var(--color-text-main, #1f2d3d)"
          strokeWidth={1.25}
          strokeLinecap="butt"
        />
      ))}

      {/* 프렛 세로 구분선 — 가로줄 밖으로 나가지 않음 */}
      {Array.from({ length: numFrets }, (_, j) => j + 1).map((k) => (
        <line
          key={k}
          x1={nutLineX + k * cellW}
          y1={yTop}
          x2={nutLineX + k * cellW}
          y2={yBottom}
          stroke="var(--color-text-main, #1f2d3d)"
          strokeWidth={1}
          strokeLinecap="butt"
        />
      ))}

      {displayFrets.map((f, i) => {
        const cx = dotCenterX(f)
        const cy = stringYs[i]
        if (f <= 0) {
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={5}
              fill="none"
              stroke="var(--color-text-main, #1f2d3d)"
              strokeWidth={2}
            />
          )
        }
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={6}
            fill="var(--color-primary, #2f80ed)"
          />
        )
      })}
    </svg>
  )
}
