import { NavLink, Outlet, Route, Routes } from 'react-router-dom'
import { ChordEditPage } from './components/ChordEditPage'
import { ChordFinderSection } from './components/ChordFinderSection'
import './App.css'

function AppLayout() {
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
            <NavLink
              to="/"
              className={({ isActive }) =>
                `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
              }
              end
            >
              코드찾기
            </NavLink>
            <NavLink
              to="/edit"
              className={({ isActive }) =>
                `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
              }
            >
              코드수정
            </NavLink>
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
        <Route path="edit" element={<ChordEditPage />} />
      </Route>
    </Routes>
  )
}

export default App
