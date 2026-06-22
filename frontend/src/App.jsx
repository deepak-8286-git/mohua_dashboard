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
      <div className="text-slate-500 font-mono text-sm animate-pulse">Loading from Google Drive…</div>
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
    <div className="h-screen flex flex-col overflow-hidden bg-navy">

      {/* ── Top header ───────────────────────────────────────────────── */}
      <header className="px-6 pt-5 pb-3 bg-navy-800 border-b border-navy-400 shrink-0">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <img
              src="/Indian_emblem.png"
              alt="Emblem of India"
              className="w-9 h-9 object-contain opacity-90"
            />
            <h1 className="font-display text-3xl font-bold tracking-wide text-slate-100 leading-none">
              Dashboard, <span style={{ color: '#E8813A' }}>MOHUA</span>
            </h1>
          </div>
          <div className="flex items-center gap-4 mt-1">
            {lastUpdated && (
              <span className="font-mono text-xs text-slate-700">
                Last updated: {lastUpdated}
              </span>
            )}
            <button
              onClick={onLogout}
              className="font-mono text-xs text-slate-600 hover:text-slate-400 transition-colors border border-navy-400 px-2 py-1 rounded"
            >
              Sign out
            </button>
          </div>
        </div>

        <PulseLine />

        <p className="font-body text-xs text-slate-500 tracking-wider mt-0.5">
          By <span className="text-slate-400 font-medium">P.Deepak</span>
          &nbsp;·&nbsp; Controller Of Accounts
        </p>
      </header>

      {/* ── Body: sidebar + content ───────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={active} onSelect={setActive} />

        <main className="flex-1 flex flex-col overflow-hidden bg-navy">
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
