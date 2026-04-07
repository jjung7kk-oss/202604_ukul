import type { RootName } from '../types/chord'

type Props = {
  roots: readonly RootName[]
  selected: RootName
  onSelect: (root: RootName) => void
}

export function RootTabs({ roots, selected, onSelect }: Props) {
  return (
    <div className="tab-strip" role="tablist" aria-label="루트음">
      {roots.map((root) => {
        const isActive = root === selected
        return (
          <button
            key={root}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`tab-strip__btn${isActive ? ' tab-strip__btn--active' : ''}`}
            onClick={(e) => {
              onSelect(root)
              /* 마우스 클릭만: 포커스가 남으면 아래 영역(SVG)이 다시 그려지지 않는 경우가 있어 blur */
              if (e.detail > 0) e.currentTarget.blur()
            }}
          >
            {root}
          </button>
        )
      })}
    </div>
  )
}
