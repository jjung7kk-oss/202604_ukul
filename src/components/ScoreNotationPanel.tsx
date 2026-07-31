import type { EndingBracket, JumpDirectiveKind } from '../lib/scoreNotation'

type ScoreNotationPanelProps = {
  disabled?: boolean
  selectionSummary: string
  endings: EndingBracket[]
  onClearSelection: () => void
  onToggleRepeatStart: () => void
  onToggleRepeatEnd: () => void
  onToggleSegno: () => void
  onToggleCoda: () => void
  onToggleToCoda: () => void
  onToggleFine: () => void
  onSetJump: (kind: JumpDirectiveKind) => void
  onClearMeasureMarks: () => void
  onAddEnding1: () => void
  onAddEnding2: () => void
  onRemoveEnding: (id: string) => void
}

function SymbolBtn({
  label,
  tip,
  onClick,
  disabled,
}: {
  label: string
  tip: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <div className="score-notation__symbol-cell">
      <button
        type="button"
        className="score-notation__symbol-btn chord-edit__btn chord-edit__btn--secondary"
        title={tip}
        onClick={onClick}
        disabled={disabled}
      >
        {label}
      </button>
      <p className="score-notation__symbol-tip">{tip}</p>
    </div>
  )
}

export function ScoreNotationPanel({
  disabled,
  selectionSummary,
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
      <div className="score-notation-panel__pin-actions">
        <div className="score-notation__action-row score-notation__action-row--pinned">
          <button
            type="button"
            className="score-notation__btn-select-clear chord-edit__btn chord-edit__btn--primary"
            onClick={onClearSelection}
            disabled={disabled}
          >
            선택 해제
          </button>
          <button
            type="button"
            className="score-notation__btn-marks-clear chord-edit__btn chord-edit__btn--secondary"
            onClick={onClearMeasureMarks}
            disabled={disabled}
          >
            기호 삭제
          </button>
        </div>
      </div>

      <h2 className="score-notation-panel__title chord-finder__heading">기호 넣기</h2>
      <p className="score-notation__status" role="status">
        {selectionSummary}
      </p>
      <p className="score-notation__micro-hint">미리보기에서 마디를 선택한 뒤 기호를 넣어주세요.</p>

      <div className="score-notation__symbol-grid" role="group" aria-label="반복·괄호">
        <SymbolBtn label="|:" tip="반복 시작" onClick={onToggleRepeatStart} disabled={disabled} />
        <SymbolBtn label=":|" tip="반복 끝" onClick={onToggleRepeatEnd} disabled={disabled} />
        <SymbolBtn label="1." tip="첫 번째 반복 구간" onClick={onAddEnding1} disabled={disabled} />
        <SymbolBtn label="2." tip="두 번째 반복 구간" onClick={onAddEnding2} disabled={disabled} />
      </div>

      <hr className="score-notation__rule" />

      <div className="score-notation__symbol-grid" role="group" aria-label="표지">
        <SymbolBtn label="Segno" tip="돌아갈 기준 표시" onClick={onToggleSegno} disabled={disabled} />
        <SymbolBtn label="Coda" tip="코다 구간 시작" onClick={onToggleCoda} disabled={disabled} />
        <SymbolBtn label="To Coda" tip="여기서 코다로 이동" onClick={onToggleToCoda} disabled={disabled} />
        <SymbolBtn label="Fine" tip="여기서 끝" onClick={onToggleFine} disabled={disabled} />
      </div>

      <hr className="score-notation__rule" />

      <div className="score-notation__symbol-grid score-notation__symbol-grid--jump" role="group" aria-label="진행">
        <SymbolBtn
          label="D.S. al Coda"
          tip="Segno로 돌아간 뒤 To Coda에서 Coda로 이동"
          onClick={() => onSetJump('DS_AL_CODA')}
          disabled={disabled}
        />
        <SymbolBtn
          label="D.S. al Fine"
          tip="Segno로 돌아간 뒤 Fine에서 끝"
          onClick={() => onSetJump('DS_AL_FINE')}
          disabled={disabled}
        />
        <SymbolBtn
          label="D.C. al Coda"
          tip="처음으로 돌아간 뒤 To Coda에서 Coda로 이동"
          onClick={() => onSetJump('DC_AL_CODA')}
          disabled={disabled}
        />
        <SymbolBtn
          label="D.C. al Fine"
          tip="처음으로 돌아간 뒤 Fine에서 끝"
          onClick={() => onSetJump('DC_AL_FINE')}
          disabled={disabled}
        />
      </div>

      {endings.length > 0 ? (
        <details className="score-notation__applied">
          <summary className="score-notation__applied-summary">적용된 구간</summary>
          <ul className="score-notation__ending-list">
            {endings.map((e) => (
              <li key={e.id} className="score-notation__ending-item">
                <span className="score-notation__ending-label">
                  {e.type}. — {e.lineIndex + 1}행{' '}
                  {e.startMeasureIndex === e.endMeasureIndex
                    ? `${e.startMeasureIndex + 1}마디`
                    : `${e.startMeasureIndex + 1}~${e.endMeasureIndex + 1}마디`}
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
        </details>
      ) : null}
    </div>
  )
}
