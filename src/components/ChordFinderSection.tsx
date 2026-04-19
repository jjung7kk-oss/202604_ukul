import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchChordLibrary,
  type ChordLibraryLoadInfo,
} from '../api/chordsApi'
import { ChordDataFallbackBanner } from './ChordDataFallbackBanner'
import {
  getChordReadingLabel,
  getChordShapesFromLibrary,
  QUALITY_ORDER,
  ROOT_ORDER,
} from '../data/chordData'
import type { ChordLibrary, ChordQuality, RootName } from '../types/chord'
import { ChordShapeGrid } from './ChordShapeGrid'
import { QualityTabs } from './QualityTabs'
import { RootTabs } from './RootTabs'
import { useAdminAuth } from '../hooks/useAdminAuth'

export function ChordFinderSection() {
  const { isAuthenticated } = useAdminAuth()
  const [root, setRoot] = useState<RootName>('C')
  const [quality, setQuality] = useState<ChordQuality>('major')
  const [library, setLibrary] = useState<ChordLibrary | null>(null)
  const [libraryLoadInfo, setLibraryLoadInfo] =
    useState<ChordLibraryLoadInfo | null>(null)
  const [loading, setLoading] = useState(true)

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

  const shapes = useMemo(
    () => getChordShapesFromLibrary(library, root, quality),
    [library, root, quality],
  )

  const readingLabel = getChordReadingLabel(root, quality)

  return (
    <section className="chord-finder" aria-labelledby="chord-finder-title">
      <div className="chord-finder__hero">
        <h1 id="chord-finder-title" className="chord-finder__hero-title">
          우쿨렐레 코드 찾기
        </h1>
        <p className="chord-finder__hero-desc">
          루트와 코드 타입을 고르면 운지를 바로 확인할 수 있어요.
        </p>
        {isAuthenticated ? (
          <p className="chord-finder__hero-auth-tools">
            <Link to="/sheet/create" className="chord-finder__hero-auth-link">
              악보 만들기
            </Link>
            <span aria-hidden="true" className="chord-finder__hero-auth-sep">
              ·
            </span>
            <Link to="/edit" className="chord-finder__hero-auth-link">
              코드 수정
            </Link>
          </p>
        ) : null}
      </div>

      <div className="chord-finder__workspace">
        {loading ? (
          <p className="chord-finder__load-hint" aria-live="polite">
            코드 데이터를 불러오는 중…
          </p>
        ) : (
          <div className="chord-finder__body">
            <div className="chord-finder__pick-shell">
              <div className="chord-finder__rail chord-finder__rail--root">
                <h2 className="chord-finder__rail-heading">루트음</h2>
                <RootTabs
                  layout="vertical"
                  roots={ROOT_ORDER}
                  selected={root}
                  onSelect={setRoot}
                />
              </div>
              <div className="chord-finder__rail chord-finder__rail--qual">
                <h2 className="chord-finder__rail-heading">코드 타입</h2>
                <QualityTabs
                  layout="vertical"
                  items={QUALITY_ORDER}
                  selected={quality}
                  onSelect={setQuality}
                />
              </div>
            </div>

            <div className="chord-finder__rail chord-finder__rail--out">
              <div
                className="chord-finder__current"
                aria-live="polite"
                aria-label={`선택한 코드 ${readingLabel}`}
              >
                <span className="chord-finder__current-name">{readingLabel}</span>
              </div>
              <div className="section-card section-card--flush chord-finder__fingerings-card">
                <h2 className="chord-finder__heading chord-finder__fingerings-heading">
                  운지방법
                </h2>
                <ChordShapeGrid shapes={shapes} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="chord-finder__tail">
        {!loading &&
        library &&
        libraryLoadInfo?.source === 'fallback' ? (
          <div className="chord-finder__fallback-slot">
            <ChordDataFallbackBanner info={libraryLoadInfo} />
          </div>
        ) : null}
      </div>
    </section>
  )
}
