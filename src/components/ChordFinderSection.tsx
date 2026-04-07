import { useMemo, useState } from 'react'
import {
  getChordDisplayName,
  getChordShapes,
  QUALITY_ORDER,
  ROOT_ORDER,
} from '../data/chordData'
import type { ChordQuality, RootName } from '../types/chord'
import { ChordShapeGrid } from './ChordShapeGrid'
import { QualityTabs } from './QualityTabs'
import { RootTabs } from './RootTabs'

export function ChordFinderSection() {
  const [root, setRoot] = useState<RootName>('C')
  const [quality, setQuality] = useState<ChordQuality>('major')

  const shapes = useMemo(() => getChordShapes(root, quality), [root, quality])

  const chordTitle = getChordDisplayName(root, quality)

  return (
    <section className="chord-finder" aria-labelledby="chord-finder-title">
      <div className="chord-finder__hero">
        <h1 id="chord-finder-title" className="chord-finder__hero-title">
          우쿨렐레 코드 찾기
        </h1>
        <p className="chord-finder__hero-desc">
          루트와 코드 타입을 고르면 운지를 바로 확인할 수 있어요.
        </p>
      </div>

      <div className="chord-finder__workspace">
        <div className="chord-finder__panel chord-finder__panel--selection">
          <div className="section-card">
            <h2 className="chord-finder__heading">루트음</h2>
            <RootTabs roots={ROOT_ORDER} selected={root} onSelect={setRoot} />
          </div>

          <div className="section-card">
            <h2 className="chord-finder__heading">코드 타입</h2>
            <QualityTabs
              items={QUALITY_ORDER}
              selected={quality}
              onSelect={setQuality}
            />
          </div>

          <div className="chord-finder__selected" aria-live="polite">
            <span className="chord-finder__selected-label">선택된 코드</span>
            <span className="chord-finder__selected-name">{chordTitle}</span>
          </div>
        </div>

        <div className="chord-finder__panel chord-finder__panel--results">
          <div className="section-card section-card--flush">
            <h2 className="chord-finder__heading">코드표</h2>
            <ChordShapeGrid shapes={shapes} />
          </div>
        </div>
      </div>
    </section>
  )
}
