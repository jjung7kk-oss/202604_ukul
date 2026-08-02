import { useCallback, useEffect, useState } from 'react'
import { fetchChordDetail, saveChordDetail, createChordType } from '../api/chordsApi'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { useChordTypes } from '../hooks/useChordTypes'
import {
  CANONICAL_ROOTS,
  getChordReadingLabel,
} from '../data/chordData'
import type { CanonicalRootName, RootName } from '../types/chord'
import { parseFretsInput } from '../utils/fretsInput'
import { QualityTabs } from './QualityTabs'
import { RootTabs } from './RootTabs'

const ROOTS_FOR_TABS = [...CANONICAL_ROOTS] as readonly RootName[]

export function ChordEditPage() {
  const { token } = useAdminAuth()

  // 선택된 루트·타입
  const [root, setRoot] = useState<CanonicalRootName>('C')
  const [quality, setQuality] = useState<string>('major')

  // 운지 편집 상태
  const [inputs, setInputs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<number, string>>({})
  const [saveOk, setSaveOk] = useState(false)

  // 코드 타입 목록 (DB 기반)
  const { types: qualityItems, reload: reloadTypes } = useChordTypes()

  // 코드 타입 추가 폼 상태
  const [showAddType, setShowAddType] = useState(false)
  const [addKey, setAddKey] = useState('')
  const [addLabel, setAddLabel] = useState('')
  const [addOrder, setAddOrder] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)

  // ── 운지 로드 ────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setLoadError(null)
    setSaveOk(false)
    try {
      const { shapes } = await fetchChordDetail(root, quality, { authToken: token })
      setInputs(shapes.length > 0 ? shapes.map((s) => s.frets.join(',')) : [])
      setFieldErrors({})
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '불러오기 실패')
      setInputs([])
    } finally {
      setLoading(false)
    }
  }, [root, quality, token])

  useEffect(() => {
    void load()
  }, [load])

  const readingLabel = getChordReadingLabel(root as RootName, quality)

  // ── 운지 편집 핸들러 ─────────────────────────────────────────────────────

  const updateLine = (index: number, value: string) => {
    setInputs((prev) => { const n = [...prev]; n[index] = value; return n })
    setFieldErrors((prev) => { const n = { ...prev }; delete n[index]; return n })
    setSaveOk(false)
  }

  const removeShape = (index: number) => {
    setInputs((prev) => prev.filter((_, i) => i !== index))
    setFieldErrors({})
    setSaveOk(false)
  }

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir
    if (j < 0 || j >= inputs.length) return
    setInputs((prev) => {
      const n = [...prev]
      ;[n[index], n[j]] = [n[j]!, n[index]!]
      return n
    })
    setFieldErrors({})
    setSaveOk(false)
  }

  const addShape = () => {
    if (inputs.length >= 4) return
    setInputs((prev) => [...prev, '0,0,0,0'])
    setSaveOk(false)
  }

  const apply = async () => {
    setSaveError(null)
    setFieldErrors({})
    const nextErrors: Record<number, string> = {}
    const fretsList: { frets: [number, number, number, number] }[] = []

    for (let i = 0; i < inputs.length; i++) {
      const parsed = parseFretsInput(inputs[i] ?? '')
      if (!parsed.ok) {
        nextErrors[i] = parsed.message
      } else {
        fretsList.push({ frets: parsed.frets })
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setSaveError('입력값을 확인해주세요.')
      return
    }

    try {
      if (!token) return
      await saveChordDetail(root, quality, fretsList, token)
      setSaveOk(true)
      await load()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '저장 실패')
    }
  }

  // ── 코드 타입 추가 핸들러 ────────────────────────────────────────────────

  const openAddTypeForm = () => {
    setAddKey('')
    setAddLabel('')
    const nextOrder = qualityItems.length > 0
      ? Math.max(...qualityItems.map((_, i) => i)) + 1
      : 0
    setAddOrder(String(nextOrder))
    setAddError(null)
    setShowAddType(true)
  }

  const cancelAddType = () => {
    setShowAddType(false)
    setAddError(null)
  }

  const submitAddType = async () => {
    const key = addKey.trim()
    if (!key) { setAddError('코드 타입 키를 입력해주세요.'); return }
    if (/[\s,;]/.test(key)) { setAddError('공백, 쉼표, 세미콜론은 사용할 수 없습니다.'); return }
    if (key.length > 32) { setAddError('32자 이하로 입력해주세요.'); return }

    const label = addLabel.trim() || key
    const orderIndex = addOrder !== '' ? Number(addOrder) : qualityItems.length

    setAddLoading(true)
    setAddError(null)
    try {
      if (!token) return
      const created = await createChordType(
        { key, label, orderIndex, aliases: [] },
        token,
      )
      await reloadTypes()
      setQuality(created.key)
      setShowAddType(false)
    } catch (e) {
      setAddError(e instanceof Error ? e.message : '등록 실패')
    } finally {
      setAddLoading(false)
    }
  }

  // ── JSX ─────────────────────────────────────────────────────────────────

  const hasInputs = inputs.length > 0

  return (
    <section className="chord-edit chord-finder" aria-labelledby="chord-edit-title">
      <div className="chord-finder__hero chord-finder__hero--compact chord-edit__hero">
        <h1 id="chord-edit-title" className="chord-finder__hero-title">
          코드 수정
        </h1>
        <p className="chord-finder__hero-desc">
          코드 모양을 직접 바꾸고 저장할 수 있어요.
        </p>
      </div>

      <div className="chord-finder__workspace chord-edit__workspace">
        <div className="chord-finder__body">
          <div className="chord-finder__pick-shell">

            {/* 루트음 탭 */}
            <div className="chord-finder__rail chord-finder__rail--root">
              <h2 className="chord-finder__rail-heading">
                루트음{' '}
                <span className="chord-edit__rail-sub">(표준)</span>
              </h2>
              <RootTabs
                layout="vertical"
                roots={ROOTS_FOR_TABS}
                selected={root}
                onSelect={(r) => setRoot(r as CanonicalRootName)}
              />
            </div>

            {/* 코드 타입 탭 */}
            <div className="chord-finder__rail chord-finder__rail--qual">
              <div className="chord-edit__type-head">
                <h2 className="chord-finder__rail-heading">코드 타입</h2>
                <button
                  type="button"
                  className="chord-edit__type-add-btn"
                  onClick={openAddTypeForm}
                  aria-expanded={showAddType}
                >
                  + 추가
                </button>
              </div>

              <QualityTabs
                layout="vertical"
                items={qualityItems}
                selected={quality}
                onSelect={setQuality}
              />

              {/* 코드 타입 추가 폼 */}
              {showAddType ? (
                <div className="chord-edit__type-form">
                  <p className="chord-edit__type-form-title">새 코드 타입 등록</p>

                  <label className="chord-edit__type-form-row">
                    <span className="chord-edit__type-form-label">타입 키 <span aria-hidden="true">*</span></span>
                    <input
                      type="text"
                      className="chord-edit__type-form-input"
                      value={addKey}
                      onChange={(e) => setAddKey(e.target.value)}
                      placeholder="예: mM7, dim7, 13"
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={32}
                    />
                  </label>
                  <p className="chord-edit__type-form-hint">DB에 저장되는 고유 식별자</p>

                  <label className="chord-edit__type-form-row">
                    <span className="chord-edit__type-form-label">표시 레이블</span>
                    <input
                      type="text"
                      className="chord-edit__type-form-input"
                      value={addLabel}
                      onChange={(e) => setAddLabel(e.target.value)}
                      placeholder="비워두면 키와 동일"
                      autoComplete="off"
                      maxLength={32}
                    />
                  </label>

                  <label className="chord-edit__type-form-row">
                    <span className="chord-edit__type-form-label">표시 순서</span>
                    <input
                      type="number"
                      className="chord-edit__type-form-input chord-edit__type-form-input--short"
                      value={addOrder}
                      onChange={(e) => setAddOrder(e.target.value)}
                      min={0}
                      step={1}
                    />
                  </label>

                  {addError ? (
                    <p className="chord-edit__error" role="alert">{addError}</p>
                  ) : null}

                  <div className="chord-edit__type-form-actions">
                    <button
                      type="button"
                      className="chord-edit__btn chord-edit__btn--primary"
                      onClick={() => void submitAddType()}
                      disabled={addLoading}
                    >
                      {addLoading ? '등록 중…' : '등록'}
                    </button>
                    <button
                      type="button"
                      className="chord-edit__btn chord-edit__btn--ghost"
                      onClick={cancelAddType}
                      disabled={addLoading}
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* 운지 편집 패널 */}
          <div className="chord-finder__rail chord-finder__rail--out">
            <div
              className="chord-finder__current"
              aria-live="polite"
              aria-label={`수정 중인 코드 ${readingLabel}`}
            >
              <span className="chord-finder__current-name">{readingLabel}</span>
            </div>

            <div className="section-card section-card--flush chord-finder__fingerings-card chord-edit__fingerings">
              <h2 className="chord-finder__heading chord-finder__fingerings-heading">
                운지방법
              </h2>

              <div className="chord-edit__status" aria-live="polite">
                {loading ? (
                  <p className="chord-edit__hint">불러오는 중…</p>
                ) : null}
                {loadError ? (
                  <p className="chord-edit__error" role="alert">{loadError}</p>
                ) : null}
                {saveError ? (
                  <p className="chord-edit__error" role="alert">{saveError}</p>
                ) : null}
                {saveOk ? (
                  <p className="chord-edit__ok" role="status">저장했습니다.</p>
                ) : null}
              </div>

              {/* 운지 없음 빈 상태 */}
              {!loading && !loadError && !hasInputs ? (
                <div className="chord-edit__empty-state">
                  <p className="chord-edit__empty-text">
                    등록된 운지가 없습니다.
                  </p>
                  <button
                    type="button"
                    className="chord-edit__btn chord-edit__btn--secondary chord-edit__empty-add-btn"
                    onClick={addShape}
                  >
                    + 운지 추가
                  </button>
                </div>
              ) : null}

              <ul className="chord-edit__list">
                {inputs.map((line, index) => (
                  <li key={index} className="chord-edit__card">
                    <div className="chord-edit__card-head">
                      <span className="chord-edit__card-label">
                        운지방법 {index + 1}
                      </span>
                      <div className="chord-edit__card-actions">
                        <button
                          type="button"
                          className="chord-edit__btn chord-edit__btn--ghost"
                          onClick={() => move(index, -1)}
                          disabled={index === 0}
                        >
                          위로
                        </button>
                        <button
                          type="button"
                          className="chord-edit__btn chord-edit__btn--ghost"
                          onClick={() => move(index, 1)}
                          disabled={index === inputs.length - 1}
                        >
                          아래로
                        </button>
                        <button
                          type="button"
                          className="chord-edit__btn chord-edit__btn--danger"
                          onClick={() => removeShape(index)}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                    <label className="chord-edit__label">
                      <span className="chord-edit__label-text">Frets (G,C,E,A)</span>
                      <input
                        type="text"
                        className={`chord-edit__input${fieldErrors[index] ? ' chord-edit__input--error' : ''}`}
                        value={line}
                        onChange={(e) => updateLine(index, e.target.value)}
                        placeholder="0,2,0,2"
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </label>
                    <p className="chord-edit__micro">
                      G,C,E,A 순서로 쉼표 입력 · 예: 0,2,0,2
                    </p>
                    {fieldErrors[index] ? (
                      <p className="chord-edit__field-error" role="alert">
                        {fieldErrors[index]}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>

              {/* 운지가 하나 이상 있을 때 하단 버튼 */}
              {!loading ? (
                <div className="chord-edit__footer">
                  {hasInputs ? (
                    <button
                      type="button"
                      className="chord-edit__btn chord-edit__btn--secondary"
                      onClick={addShape}
                      disabled={inputs.length >= 4}
                    >
                      운지방법 추가
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="chord-edit__btn chord-edit__btn--primary"
                    onClick={() => void apply()}
                    disabled={loading || !hasInputs}
                  >
                    적용 / 저장
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
