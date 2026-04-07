import { ChordFinderSection } from './components/ChordFinderSection'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <header className="app-header" role="banner">
        <div className="app-header__inner">
          <img
            className="app-header__logo"
            src="/brand_images/images/logo.png"
            alt="후이코드"
            decoding="async"
          />
        </div>
      </header>
      <main className="app-main">
        <ChordFinderSection />
      </main>
    </div>
  )
}

export default App
