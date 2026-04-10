import type { RootName } from '../types/chord'

type Props = {
  roots: readonly RootName[]
  selected: RootName
  onSelect: (root: RootName) => void
  /** 모바일 코드찾기 3열 등: 세로 스크롤 리스트. 데스크톱은 CSS로 가로 탭 복원 */
  layout?: 'horizontal' | 'vertical'
}

export function RootTabs({
  roots,
  selected,
  onSelect,
  layout = 'horizontal',
}: Props) {
  const stripClass =
    layout === 'vertical'
      ? 'tab-strip tab-strip--vertical'
      : 'tab-strip'

  return (
    <div className={stripClass} role="tablist" aria-label="루트음">
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
