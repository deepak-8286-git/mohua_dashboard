import { useState } from 'react'
import { useIAW, useBill, useAutoRefresh } from './api/client'
import Sidebar from './components/Sidebar'
import PulseLine from './components/PulseLine'
import LoginPage from './components/LoginPage'
import IAWDashboard from './components/iaw/IAWDashboard'
import BillDashboard from './components/bill/BillDashboard'

function Spinner() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-slate-500 font-mono text-sm animate-pulse" style={{ color: '#64748B' }}>Loading from Google Drive…</div>
    </div>
  )
}

function ErrorMsg({ msg }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-red-400 font-mono text-sm">Error: {msg}</p>
    </div>
  )
}

function Dashboard({ onLogout }) {
  const [active, setActive] = useState('bill')
  const iaw  = useIAW()
  const bill = useBill()
  useAutoRefresh()

  const lastUpdated = iaw.dataUpdatedAt
    ? new Date(iaw.dataUpdatedAt).toLocaleTimeString()
    : null

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-100">

      {/* ── Top header ───────────────────────────────────────────────── */}
      <header className="px-6 pt-4 pb-3 shrink-0 relative"
        style={{ background: 'linear-gradient(160deg, #1e3a8a 0%, #1d4ed8 60%, #1e40af 100%)', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>

        {/* Sign out + last updated — top right */}
        <div className="absolute top-4 right-6 flex items-center gap-4">
          {lastUpdated && (
            <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Last updated: {lastUpdated}
            </span>
          )}
          <button
            onClick={onLogout}
            className="font-mono text-xs transition-colors px-2 py-1 rounded"
            style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.2)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
          >
            Sign out
          </button>
        </div>

        {/* Centered title block */}
        <div className="flex flex-col items-center gap-0">
          <div className="flex items-center gap-4">
            <img src="/Indian_emblem.png" alt="Emblem of India" className="w-9 h-9 object-contain" style={{ filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
            <h1 className="font-display text-3xl font-bold tracking-[0.18em] uppercase leading-none" style={{ color: '#FFFFFF' }}>
              Dash Board, <span style={{ color: '#F9A55A' }}>MoHuA</span>
            </h1>
            <img src="/Indian_emblem.png" alt="" className="w-9 h-9 object-contain" style={{ filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
          </div>

          <PulseLine />

          <div className="flex flex-col items-center leading-tight mt-0.5">
            <span className="font-body text-xs tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>by</span>
            <span className="font-display text-sm font-bold tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.9)' }}>P.Deepak</span>
            <span className="font-body text-xs tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Controller of Accounts, <span style={{ color: '#F9A55A' }}>MoHuA</span>
            </span>
          </div>
        </div>
      </header>

      {/* ── Body: sidebar + content ───────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={active} onSelect={setActive} />

        <main className="flex-1 flex flex-col overflow-hidden bg-slate-100">
          {active === 'iaw' && (
            iaw.isLoading ? <Spinner /> :
            iaw.isError   ? <ErrorMsg msg={iaw.error?.message} /> :
            <IAWDashboard data={iaw.data} />
          )}
          {active === 'bill' && (
            bill.isLoading ? <Spinner /> :
            bill.isError   ? <ErrorMsg msg={bill.error?.message} /> :
            <BillDashboard data={bill.data} />
          )}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(
    () => sessionStorage.getItem('mohua_auth') === '1'
  )

  function handleLogin() {
    sessionStorage.setItem('mohua_auth', '1')
    setLoggedIn(true)
  }

  function handleLogout() {
    sessionStorage.removeItem('mohua_auth')
    setLoggedIn(false)
  }

  if (!loggedIn) return <LoginPage onLogin={handleLogin} />
  return <Dashboard onLogout={handleLogout} />
}
