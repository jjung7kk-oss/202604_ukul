import type { EndingBracket, JumpDirectiveKind } from '../lib/scoreNotation'

type ScoreNotationPanelProps = {
  disabled?: boolean
  selectionHint: string | null
  endings: EndingBracket[]
  onClearSelection: () => void
  onToggleRepeatStart: () => void
  onToggleRepeatEnd: () => void
  onToggleSegno: () => void
  onToggleCoda: () => void
  onToggleToCoda: () => void
  onToggleFine: () => void
  onSetJump: (kind: JumpDirectiveKind | null) => void
  onClearMeasureMarks: () => void
  onAddEnding1: () => void
  onAddEnding2: () => void
  onRemoveEnding: (id: string) => void
}

function btnClass(extra?: string): string {
  return `score-notation__btn chord-edit__btn chord-edit__btn--secondary${extra ? ` ${extra}` : ''}`
}

export function ScoreNotationPanel({
  disabled,
  selectionHint,
  endings,
  onClearSelection,
  onToggleRepeatStart,
  onToggleRepeatEnd,
  onToggleSegno,
  onToggleCoda,
  onToggleToCoda,
  onToggleFine,
  onSetJump,
  onClearMeasureMarks,
  onAddEnding1,
  onAddEnding2,
  onRemoveEnding,
}: ScoreNotationPanelProps) {
  return (
    <div className="section-card score-notation-panel">
      <h2 className="chord-finder__heading">악보 기호</h2>
      <p className="score-notation__lead">
        미리보기에서 마디를 눌러 선택한 뒤, 아래에서 기호를 붙이거나 뺍니다. 같은 버튼을 다시 누르면
        해제됩니다.
      </p>
      {selectionHint ? (
        <p className="score-notation__hint" role="status">
          {selectionHint}
        </p>
      ) : null}
      <div className="score-notation__actions">
        <button
          type="button"
          className={btnClass()}
          onClick={onClearSelection}
          disabled={disabled}
        >
          선택 비우기
        </button>
        <button
          type="button"
          className={btnClass('score-notation__btn--ghost')}
          onClick={onClearMeasureMarks}
          disabled={disabled}
        >
          선택 마디 기호 전부 제거
        </button>
      </div>

      <h3 className="score-notation__subhead">1차 · 반복</h3>
      <div className="score-notation__btn-row">
        <button type="button" className={btnClass()} onClick={onToggleRepeatStart} disabled={disabled}>
          되돌이표 시작 |:
        </button>
        <button type="button" className={btnClass()} onClick={onToggleRepeatEnd} disabled={disabled}>
          되돌이표 끝 :|
        </button>
      </div>
      <div className="score-notation__btn-row">
        <button type="button" className={btnClass()} onClick={onAddEnding1} disabled={disabled}>
          1번 괄호 (구간)
        </button>
        <button type="button" className={btnClass()} onClick={onAddEnding2} disabled={disabled}>
          2번 괄호 (구간)
        </button>
      </div>

      <h3 className="score-notation__subhead">2차 · 표지</h3>
      <div className="score-notation__btn-row score-notation__btn-row--wrap">
        <button type="button" className={btnClass()} onClick={onToggleSegno} disabled={disabled}>
          세뇨
        </button>
        <button type="button" className={btnClass()} onClick={onToggleCoda} disabled={disabled}>
          코다
        </button>
        <button type="button" className={btnClass()} onClick={onToggleToCoda} disabled={disabled}>
          To Coda
        </button>
        <button type="button" className={btnClass()} onClick={onToggleFine} disabled={disabled}>
          Fine
        </button>
      </div>

      <h3 className="score-notation__subhead">3차 · 진행 지시</h3>
      <div className="score-notation__btn-row score-notation__btn-row--wrap">
        <button
          type="button"
          className={btnClass()}
          onClick={() => onSetJump('DS_AL_CODA')}
          disabled={disabled}
        >
          D.S. al Coda
        </button>
        <button
          type="button"
          className={btnClass()}
          onClick={() => onSetJump('DS_AL_FINE')}
          disabled={disabled}
        >
          D.S. al Fine
        </button>
        <button
          type="button"
          className={btnClass()}
          onClick={() => onSetJump('DC_AL_CODA')}
          disabled={disabled}
        >
          D.C. al Coda
        </button>
        <button
          type="button"
          className={btnClass()}
          onClick={() => onSetJump('DC_AL_FINE')}
          disabled={disabled}
        >
          D.C. al Fine
        </button>
        <button type="button" className={btnClass()} onClick={() => onSetJump(null)} disabled={disabled}>
          지시문 해제
        </button>
      </div>

      {endings.length > 0 ? (
        <div className="score-notation__endings">
          <h3 className="score-notation__subhead">괄호 구간 목록</h3>
          <ul className="score-notation__ending-list">
            {endings.map((e) => (
              <li key={e.id} className="score-notation__ending-item">
                <span className="score-notation__ending-label">
                  {e.type}번 괄호 — {e.lineIndex + 1}줄, 마디 {e.startMeasureIndex + 1}~{e.endMeasureIndex + 1}
                </span>
                <button
                  type="button"
                  className="score-notation__ending-remove chord-edit__btn chord-edit__btn--ghost"
                  onClick={() => onRemoveEnding(e.id)}
                  disabled={disabled}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
