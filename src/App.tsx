import { NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AdminLoginPage } from './components/AdminLoginPage'
import { ChordEditPage } from './components/ChordEditPage'
import { ChordFinderSection } from './components/ChordFinderSection'
import { RequireAdmin } from './components/RequireAdmin'
import { TransposePage } from './components/TransposePage'
import { useAdminAuth } from './hooks/useAdminAuth'
import './App.css'

function AppLayout() {
  const { pathname } = useLocation()
  const { isAuthenticated } = useAdminAuth()
  const finderNavActive =
    pathname === '/' || pathname === '/finder'
  const editNavActive =
    pathname === '/edit' || pathname === '/admin/chords'

  return (
    <div className="app-shell">
      <header className="app-header" role="banner">
        <div className="app-header__inner">
          <NavLink to="/" className="app-header__brand" end>
            <img
              className="app-header__logo"
              src="/brand_images/images/logo.png"
              alt="후이코드"
              decoding="async"
            />
          </NavLink>
          <nav className="app-nav" aria-label="주요 메뉴">
            <ul className="app-nav__list">
              <li className="app-nav__item">
                <NavLink
                  to="/"
                  className={() =>
                    `app-nav__link${finderNavActive ? ' app-nav__link--active' : ''}`
                  }
                  end
                >
                  코드찾기
                </NavLink>
              </li>
              {isAuthenticated ? (
                <li className="app-nav__item">
                  <NavLink
                    to="/edit"
                    className={() =>
                      `app-nav__link${editNavActive ? ' app-nav__link--active' : ''}`
                    }
                  >
                    코드수정
                  </NavLink>
                </li>
              ) : null}
              <li className="app-nav__item">
                <NavLink
                  to="/transpose"
                  className={({ isActive }) =>
                    `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
                  }
                >
                  조변환
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<ChordFinderSection />} />
        <Route path="finder" element={<ChordFinderSection />} />
        <Route path="admin/login" element={<AdminLoginPage />} />
        <Route
          path="edit"
          element={
            <RequireAdmin>
              <ChordEditPage />
            </RequireAdmin>
          }
        />
        <Route
          path="admin/chords"
          element={
            <RequireAdmin>
              <ChordEditPage />
            </RequireAdmin>
          }
        />
        <Route path="transpose" element={<TransposePage />} />
      </Route>
    </Routes>
  )
}

export default App
