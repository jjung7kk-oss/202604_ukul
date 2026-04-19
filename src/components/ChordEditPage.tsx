import { useCallback, useEffect, useState } from 'react'
import { fetchChordDetail, saveChordDetail } from '../api/chordsApi'
import { useAdminAuth } from '../hooks/useAdminAuth'
import {
  CANONICAL_ROOTS,
  getChordReadingLabel,
  QUALITY_ORDER,
} from '../data/chordData'
import type { CanonicalRootName, ChordQuality, RootName } from '../types/chord'
import { parseFretsInput } from '../utils/fretsInput'
import { QualityTabs } from './QualityTabs'
import { RootTabs } from './RootTabs'

const ROOTS_FOR_TABS = [...CANONICAL_ROOTS] as readonly RootName[]

export function ChordEditPage() {
  const { token } = useAdminAuth()
  const [root, setRoot] = useState<CanonicalRootName>('C')
  const [quality, setQuality] = useState<ChordQuality>('major')
  const [inputs, setInputs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<number, string>>({})
  const [saveOk, setSaveOk] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setLoadError(null)
    setSaveOk(false)
    try {
      const { shapes } = await fetchChordDetail(root, quality, {
        authToken: token,
      })
      setInputs(
        shapes.length > 0
          ? shapes.map((s) => s.frets.join(','))
          : [],
      )
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

  const updateLine = (index: number, value: string) => {
    setInputs((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
    setFieldErrors((prev) => {
      const n = { ...prev }
      delete n[index]
      return n
    })
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
      const next = [...prev]
      ;[next[index], next[j]] = [next[j]!, next[index]!]
      return next
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
                  <p className="chord-edit__error" role="alert">
                    {loadError}
                  </p>
                ) : null}
                {saveError ? (
                  <p className="chord-edit__error" role="alert">
                    {saveError}
                  </p>
                ) : null}
                {saveOk ? (
                  <p className="chord-edit__ok" role="status">
                    저장했습니다.
                  </p>
                ) : null}
                {!loading && !loadError && inputs.length === 0 ? (
                  <p className="chord-edit__hint">
                    등록된 운지방법이 없습니다. 아래에서 추가해 주세요.
                  </p>
                ) : null}
              </div>

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

              <div className="chord-edit__footer">
                <button
                  type="button"
                  className="chord-edit__btn chord-edit__btn--secondary"
                  onClick={addShape}
                  disabled={inputs.length >= 4}
                >
                  운지방법 추가
                </button>
                <button
                  type="button"
                  className="chord-edit__btn chord-edit__btn--primary"
                  onClick={() => void apply()}
                  disabled={loading}
                >
                  적용 / 저장
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  )
}
