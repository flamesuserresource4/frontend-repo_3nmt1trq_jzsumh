import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import App from './App'
import Test from './Test'
import Playback from './pages/Playback'
import './index.css'

function Nav() {
  return (
    <nav className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/80 px-3 py-2 shadow-lg backdrop-blur">
      <Link className="text-sm text-slate-200 hover:text-white px-3 py-1" to="/">Home</Link>
      <span className="text-slate-600">/</span>
      <Link className="text-sm text-slate-200 hover:text-white px-3 py-1" to="/playback">Playback</Link>
      <span className="text-slate-600">/</span>
      <Link className="text-sm text-slate-200 hover:text-white px-3 py-1" to="/test">Test</Link>
    </nav>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/test" element={<Test />} />
        <Route path="/playback" element={<Playback />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
