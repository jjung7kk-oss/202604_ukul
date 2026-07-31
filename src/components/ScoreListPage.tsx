import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteMyScore, duplicateMyScore, fetchMyScores, type ScoreDto } from '../api/scoresApi'
import { useAdminAuth } from '../hooks/useAdminAuth'

function formatUpdatedAt(dateString: string): string {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '-'
  try {
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return date.toISOString()
  }
}

export function ScoreListPage() {
  const { token } = useAdminAuth()
  const navigate = useNavigate()
  const [scores, setScores] = useState<ScoreDto[]>([])
  const [loading, setLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionOk, setActionOk] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const loadScores = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setActionError(null)
    try {
      const data = await fetchMyScores(token)
      setScores(data)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '악보 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadScores()
  }, [loadScores])

  const handleOpen = useCallback(
    (score: ScoreDto) => {
      navigate('/sheet/create', { state: { scoreToLoad: score } })
    },
    [navigate],
  )

  const handleNewScore = useCallback(() => {
    navigate('/sheet/create')
  }, [navigate])

  const handleDuplicate = useCallback(
    async (score: ScoreDto) => {
      if (!token) return
      setDuplicatingId(score.id)
      setActionError(null)
      setActionOk(null)
      try {
        await duplicateMyScore(score, token)
        setActionOk(`"${score.title}" 악보를 복제했습니다.`)
        await loadScores()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : '복제에 실패했습니다.')
      } finally {
        setDuplicatingId(null)
      }
    },
    [token, loadScores],
  )

  const handleDeleteConfirm = useCallback(
    async (scoreId: string) => {
      if (!token) return
      setDeletingId(scoreId)
      setActionError(null)
      setActionOk(null)
      try {
        await deleteMyScore(scoreId, token)
        setActionOk('악보를 삭제했습니다.')
        setConfirmDeleteId(null)
        await loadScores()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : '삭제에 실패했습니다.')
      } finally {
        setDeletingId(null)
      }
    },
    [token, loadScores],
  )

  return (
    <section className="score-list-page" aria-labelledby="score-list-title">
      <div className="chord-finder__hero chord-finder__hero--compact">
        <h1 id="score-list-title" className="chord-finder__hero-title">
          내 악보 목록
        </h1>
        <p className="chord-finder__hero-desc">
          저장된 악보를 관리하고, 편집하려면 열기를 누르세요.
        </p>
      </div>

      <div className="score-list-page__body">
        <div className="section-card score-list-page__card">
          <div className="score-list-page__header">
            <div className="score-list-page__header-left">
              <h2 className="chord-finder__heading">악보 목록</h2>
              {!loading && (
                <span className="score-create-page__saved-meta">{scores.length}개</span>
              )}
              {loading && (
                <span className="score-create-page__saved-meta">불러오는 중…</span>
              )}
            </div>
            <button
              type="button"
              className="chord-edit__btn chord-edit__btn--primary"
              onClick={handleNewScore}
            >
              + 새 악보 만들기
            </button>
          </div>

          {actionError && (
            <p className="chord-edit__error" role="alert">
              {actionError}
            </p>
          )}
          {actionOk && (
            <p className="chord-edit__ok" role="status">
              {actionOk}
            </p>
          )}

          {!loading && scores.length === 0 && (
            <div className="score-list-page__empty">
              <p className="chord-finder__load-hint">저장된 악보가 아직 없습니다.</p>
              <button
                type="button"
                className="chord-edit__btn chord-edit__btn--primary"
                onClick={handleNewScore}
              >
                첫 악보 만들기
              </button>
            </div>
          )}

          {scores.length > 0 && (
            <div className="score-list-page__table-wrap">
              <table className="score-list-page__table">
                <thead>
                  <tr>
                    <th className="score-list-page__th score-list-page__th--title">제목</th>
                    <th className="score-list-page__th score-list-page__th--artist">아티스트</th>
                    <th className="score-list-page__th score-list-page__th--date">최근 수정</th>
                    <th className="score-list-page__th score-list-page__th--actions">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((score) => (
                    <tr key={score.id} className="score-list-page__row">
                      <td className="score-list-page__td score-list-page__td--title">
                        <button
                          type="button"
                          className="score-list-page__title-btn"
                          onClick={() => handleOpen(score)}
                        >
                          {score.title}
                        </button>
                      </td>
                      <td className="score-list-page__td score-list-page__td--artist">
                        {score.artist || <span className="score-list-page__empty-cell">—</span>}
                      </td>
                      <td className="score-list-page__td score-list-page__td--date">
                        {formatUpdatedAt(score.updatedAt)}
                      </td>
                      <td className="score-list-page__td score-list-page__td--actions">
                        {confirmDeleteId === score.id ? (
                          <div className="score-list-page__confirm-row">
                            <span className="score-list-page__confirm-label">정말 삭제할까요?</span>
                            <button
                              type="button"
                              className="chord-edit__btn chord-edit__btn--danger score-list-page__action-btn"
                              onClick={() => void handleDeleteConfirm(score.id)}
                              disabled={deletingId === score.id}
                            >
                              {deletingId === score.id ? '삭제 중…' : '삭제'}
                            </button>
                            <button
                              type="button"
                              className="chord-edit__btn chord-edit__btn--secondary score-list-page__action-btn"
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={deletingId === score.id}
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <div className="score-list-page__action-row">
                            <button
                              type="button"
                              className="chord-edit__btn chord-edit__btn--primary score-list-page__action-btn"
                              onClick={() => handleOpen(score)}
                            >
                              열기
                            </button>
                            <button
                              type="button"
                              className="chord-edit__btn chord-edit__btn--secondary score-list-page__action-btn"
                              onClick={() => void handleDuplicate(score)}
                              disabled={duplicatingId === score.id}
                            >
                              {duplicatingId === score.id ? '복제 중…' : '복제'}
                            </button>
                            <button
                              type="button"
                              className="chord-edit__btn chord-edit__btn--danger score-list-page__action-btn"
                              onClick={() => setConfirmDeleteId(score.id)}
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
