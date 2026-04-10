import type { ChordQuality } from '../types/chord'

type Props = {
  items: { key: ChordQuality; label: string }[]
  selected: ChordQuality
  onSelect: (q: ChordQuality) => void
  layout?: 'horizontal' | 'vertical'
}

const QUALITY_TAB_TEXT: Record<ChordQuality, string> = {
  major: 'major',
  m: 'm',
  '7': '7',
  m7: 'm7',
  maj7: 'maj7',
  sus4: 'sus4',
  sus2: 'sus2',
  dim: 'dim',
  aug: 'aug',
  '6': '6',
  m6: 'm6',
  add9: 'add9',
  '9': '9',
}

export function QualityTabs({
  items,
  selected,
  onSelect,
  layout = 'horizontal',
}: Props) {
  const stripClass =
    layout === 'vertical'
      ? 'tab-strip tab-strip--vertical'
      : 'tab-strip tab-strip--wrap'

  return (
    <div className={stripClass} role="tablist" aria-label="코드 타입">
      {items.map(({ key, label }) => {
        const isActive = key === selected
        const tabText = label || QUALITY_TAB_TEXT[key]
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`tab-strip__btn${isActive ? ' tab-strip__btn--active' : ''}`}
            onClick={(e) => {
              onSelect(key)
              if (e.detail > 0) e.currentTarget.blur()
            }}
          >
            {tabText}
          </button>
        )
      })}
    </div>
  )
}
