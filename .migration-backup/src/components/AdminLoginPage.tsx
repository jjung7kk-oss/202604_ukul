import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../hooks/useAdminAuth'

export function AdminLoginPage() {
  const { login, isAuthenticated } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fromPath =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? '/edit'

  if (isAuthenticated) {
    return <Navigate to={fromPath} replace />
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username, password)
      navigate(fromPath, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="admin-login" aria-labelledby="admin-login-title">
      <div className="chord-finder__hero chord-finder__hero--compact">
        <h1 id="admin-login-title" className="chord-finder__hero-title">
          관리자 로그인
        </h1>
        <p className="chord-finder__hero-desc">
          코드 수정 화면은 로그인 후에 이용할 수 있어요.
        </p>
      </div>

      <div className="admin-login__card section-card">
        <form className="admin-login__form" onSubmit={(e) => void onSubmit(e)}>
          {error ? (
            <p className="chord-edit__error" role="alert">
              {error}
            </p>
          ) : null}
          <label className="chord-edit__label">
            <span className="chord-edit__label-text">아이디</span>
            <input
              type="text"
              className="chord-edit__input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={submitting}
              required
            />
          </label>
          <label className="chord-edit__label">
            <span className="chord-edit__label-text">비밀번호</span>
            <input
              type="password"
              className="chord-edit__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={submitting}
              required
            />
          </label>
          <div className="admin-login__actions">
            <button
              type="submit"
              className="chord-edit__btn chord-edit__btn--primary"
              disabled={submitting}
            >
              {submitting ? '확인 중…' : '로그인'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
