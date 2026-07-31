import type { ChordShape } from '../types/chord'
import { HorizontalChordDiagram } from './HorizontalChordDiagram'

type Props = {
  shapes: ChordShape[]
}

export function ChordShapeGrid({ shapes }: Props) {
  if (shapes.length === 0) {
    return (
      <p className="chord-grid__empty">
        이 조합에 대한 코드표가 아직 없습니다.
      </p>
    )
  }

  return (
    <div className="chord-grid">
      {shapes.map((shape, idx) => (
        <div
          key={`${shape.frets.join('-')}-${idx}`}
          className="chord-card"
        >
          <div className="chord-card__diagram">
            <HorizontalChordDiagram shape={shape} />
          </div>
        </div>
      ))}
    </div>
  )
}
