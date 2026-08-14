import { useState } from 'react'
import {
  useIAW,
  useBill,
  usePension,
  useGem,
  useAutoRefresh,
  useLastUpdated,
  useTriggerRefresh,
} from './api/client'
import Sidebar from './components/Sidebar'
import PulseLine from './components/PulseLine'
import LoginPage from './components/LoginPage'
import IAWDashboard from './components/iaw/IAWDashboard'
import BillDashboard from './components/bill/BillDashboard'
import ScorecardDashboard from './components/bill/ScorecardDashboard'
import PensionDashboard from './components/pension/PensionDashboard'
import GemDuesDashboard from './components/gem/GemDuesDashboard'
import { RefreshCw, LogOut, CheckCircle2, AlertTriangle, Shield } from 'lucide-react'

function Spinner({ text = 'Syncing latest data from Google Drive…' }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#070D18]">
      <div className="relative flex items-center justify-center mb-4">
        <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-amber-400 animate-spin" />
        <RefreshCw size={20} className="text-amber-400 absolute" />
      </div>
      <p className="font-mono text-xs text-slate-400 tracking-wider animate-pulse">{text}</p>
    </div>
  )
}

function ErrorMsg({ msg }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-[#070D18]">
      <div className="max-w-md p-6 rounded-2xl bg-rose-950/40 border border-rose-500/30 backdrop-blur-md text-center">
        <AlertTriangle size={32} className="text-rose-400 mx-auto mb-3" />
        <h3 className="font-display text-lg font-bold text-white mb-1">Data Ingestion Notice</h3>
        <p className="font-body text-xs text-rose-200/80 mb-4">{msg || 'Unable to parse spreadsheet files from Drive.'}</p>
        <p className="font-mono text-[11px] text-slate-400">Please verify Google Drive permissions or file structures.</p>
      </div>
    </div>
  )
}

function Dashboard({ onLogout }) {
  const [active, setActive] = useState('bill')
  const iaw     = useIAW()
  const bill    = useBill()
  const pension = usePension()
  const gem     = useGem()
  const { data: updateData } = useLastUpdated()
  const triggerRefresh = useTriggerRefresh()
  useAutoRefresh()

  const lastUpdatedTs = updateData?.timestamp || iaw.dataUpdatedAt
  const lastUpdated = lastUpdatedTs ? new Date(lastUpdatedTs).toLocaleTimeString() : null

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#070D18] text-slate-100">
      {/* ── Top Executive Header ───────────────────────────────────────── */}
      <header className="px-6 pt-3.5 pb-2.5 shrink-0 relative bg-gradient-to-r from-[#0B152A] via-[#102042] to-[#0B152A] border-b border-white/10 shadow-lg z-20">
        {/* Top-right Status Bar */}
        <div className="absolute top-3.5 right-6 flex items-center gap-3">
          {/* Live Sync Badge */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25">
            <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-beacon" />
            <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-emerald-300">
              Live Sync
            </span>
          </div>

          {/* Last updated timestamp */}
          {lastUpdated && (
            <span className="hidden md:inline-block font-mono text-xs text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-white/5">
              Sync: <strong className="text-slate-200 font-semibold">{lastUpdated}</strong>
            </span>
          )}

          {/* Instant Manual Sync with Drive button */}
          <button
            onClick={() => triggerRefresh.mutate()}
            disabled={triggerRefresh.isPending}
            title="Fetch latest updates from Google Drive immediately"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={triggerRefresh.isPending ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">
              {triggerRefresh.isPending ? 'Syncing…' : 'Sync Now'}
            </span>
          </button>

          {/* Sign Out Button */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 font-mono text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-2.5 py-1 rounded-lg border border-white/10 transition-all cursor-pointer"
          >
            <LogOut size={12} className="text-rose-400" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>

        {/* Centered Title Block */}
        <div className="flex flex-col items-center gap-0">
          <div className="flex items-center gap-3.5">
            <img
              src="/Indian_emblem.png"
              alt="Emblem of India"
              className="w-8 h-8 object-contain filter drop-shadow-[0_0_8px_rgba(249,165,90,0.5)]"
              style={{ filter: 'brightness(1.2)' }}
            />
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-[0.18em] uppercase leading-none text-white">
              Dash Board, <span className="text-[#F9A55A] drop-shadow-[0_0_12px_rgba(249,165,90,0.5)]">MoHuA</span>
            </h1>
            <img
              src="/Indian_emblem.png"
              alt=""
              className="w-8 h-8 object-contain filter drop-shadow-[0_0_8px_rgba(249,165,90,0.5)]"
              style={{ filter: 'brightness(1.2)' }}
            />
          </div>

          <div className="w-64 my-0.5">
            <PulseLine />
          </div>

          <div className="flex flex-col items-center leading-tight">
            <span className="font-body text-[10px] tracking-widest text-slate-400 uppercase">
              by <strong className="text-slate-200 font-display text-xs tracking-[0.15em] font-bold">P. Deepak</strong>
              &nbsp;·&nbsp; Controller of Accounts, <span className="text-[#F9A55A] font-semibold">MoHuA</span>
            </span>
          </div>
        </div>
      </header>

      {/* ── Main Content Area: Sidebar + Dashboard Panels ────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={active} onSelect={setActive} />

        <main className="flex-1 flex flex-col overflow-hidden bg-[#070D18] relative">
          {/* Subtle background gradient lighting */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          {active === 'iaw' && (
            iaw.isLoading ? <Spinner text="Loading IAW Paras data from Drive…" /> :
            iaw.isError   ? <ErrorMsg msg={iaw.error?.message} /> :
            <IAWDashboard data={iaw.data} />
          )}

          {active === 'bill' && (
            bill.isLoading ? <Spinner text="Loading Bill Monitoring data from Drive…" /> :
            bill.isError   ? <ErrorMsg msg={bill.error?.message} /> :
            <BillDashboard data={bill.data} />
          )}

          {active === 'scorecard' && (
            bill.isLoading ? <Spinner text="Calculating B4 Scorecard from Drive…" /> :
            bill.isError   ? <ErrorMsg msg={bill.error?.message} /> :
            <ScorecardDashboard data={bill.data} />
          )}

          {active === 'pension' && (
            pension.isLoading ? <Spinner text="Loading Pension Cases from Drive…" /> :
            pension.isError   ? <ErrorMsg msg={pension.error?.message} /> :
            <PensionDashboard data={pension.data} />
          )}

          {(active === 'gem' || active === 'gem-offices' || active === 'gem-aging') && (
            gem.isLoading ? <Spinner text="Loading GeM Dues & Agewise data from Drive…" /> :
            gem.isError   ? <ErrorMsg msg={gem.error?.message} /> :
            <GemDuesDashboard
              data={gem.data}
              initialTab={
                active === 'gem-offices' ? 'offices' : active === 'gem-aging' ? 'aging' : 'overview'
              }
            />
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
