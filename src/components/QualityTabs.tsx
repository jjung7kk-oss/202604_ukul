type Props = {
  items: { key: string; label: string }[]
  selected: string
  onSelect: (q: string) => void
  layout?: 'horizontal' | 'vertical'
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
        // label이 빈 문자열이면 (major) 'major'로 표시
        const tabText = label !== '' ? label : 'major'
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
