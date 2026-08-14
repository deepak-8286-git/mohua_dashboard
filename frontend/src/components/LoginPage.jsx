import { useState } from 'react'
import { Shield, Lock, User, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'
import PulseLine from './PulseLine'

const VALID_USER = 'deepak.p'
const VALID_PASS = 'deepak.p@1234'

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  function fillDemo() {
    setUsername(VALID_USER)
    setPassword(VALID_PASS)
    setError('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    setTimeout(() => {
      if (username === VALID_USER && password === VALID_PASS) {
        onLogin()
      } else {
        setError('Invalid username or password. Please verify credentials.')
        setLoading(false)
      }
    }, 400)
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 py-8 overflow-hidden bg-[#070D18]">
      {/* Dynamic ambient background glow meshes */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none ambient-glow" />
      <div className="absolute bottom-[-10%] right-[20%] w-[450px] h-[450px] bg-amber-500/10 rounded-full blur-[130px] pointer-events-none ambient-glow" style={{ animationDelay: '-4s' }} />
      <div className="absolute top-[40%] right-[10%] w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none ambient-glow" style={{ animationDelay: '-2s' }} />

      {/* Emblem Header Block */}
      <div className="relative z-10 flex flex-col items-center mb-6">
        <div className="relative flex items-center justify-center p-3 rounded-full bg-gradient-to-b from-white/10 to-transparent border border-white/10 shadow-2xl backdrop-blur-md mb-3 group">
          <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
          <img
            src="/Indian_emblem.png"
            alt="Emblem of India"
            className="w-16 h-16 object-contain relative z-10 filter drop-shadow-[0_0_12px_rgba(249,165,90,0.4)]"
            style={{ filter: 'brightness(1.15) contrast(1.1)' }}
          />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-[11px] font-mono tracking-widest uppercase mb-1">
          <Shield size={12} className="text-cyan-400" />
          Official Executive Portal
        </div>
      </div>

      {/* Main Glass Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#0F1D38]/85 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Top Gradient Banner */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-amber-400 to-rose-500" />

        {/* Header section */}
        <div className="px-8 pt-7 pb-5 text-center border-b border-white/10">
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-wider text-white uppercase">
            Dashboard, <span className="text-[#F9A55A] drop-shadow-[0_0_15px_rgba(249,165,90,0.4)]">MoHUA</span>
          </h1>
          <PulseLine />
          <p className="font-body text-xs text-slate-400 tracking-wider mt-1">
            By <span className="text-white font-semibold">P. Deepak</span>
            <span className="text-amber-400/80 mx-1.5">✦</span>
            Controller of Accounts
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <div>
            <label className="flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider uppercase text-slate-300 mb-1.5">
              <User size={13} className="text-cyan-400" />
              Username
            </label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. deepak.p"
              required
              className="w-full rounded-lg px-3.5 py-2.5 font-mono text-sm text-slate-100 bg-slate-900/80 border border-slate-700/80 focus:border-[#F9A55A] focus:ring-2 focus:ring-[#F9A55A]/20 outline-none transition-all placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider uppercase text-slate-300 mb-1.5">
              <Lock size={13} className="text-amber-400" />
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••"
              required
              className="w-full rounded-lg px-3.5 py-2.5 font-mono text-sm text-slate-100 bg-slate-900/80 border border-slate-700/80 focus:border-[#F9A55A] focus:ring-2 focus:ring-[#F9A55A]/20 outline-none transition-all placeholder:text-slate-600"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
              <span className="text-rose-400">●</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-lg font-display font-bold tracking-widest uppercase text-sm text-slate-950 bg-gradient-to-r from-[#F9A55A] to-[#F59E0B] hover:from-[#fbaa6b] hover:to-[#f6a922] active:scale-[0.99] transition-all shadow-[0_4px_20px_rgba(249,165,90,0.35)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Verifying Access…</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {/* Quick Demo Fill Pill */}
          <div className="pt-2 flex items-center justify-center">
            <button
              type="button"
              onClick={fillDemo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono text-slate-400 hover:text-amber-300 hover:bg-amber-400/10 border border-dashed border-slate-700 hover:border-amber-400/40 transition-all cursor-pointer"
            >
              <Sparkles size={12} className="text-amber-400" />
              <span>Fill Demo Credentials</span>
            </button>
          </div>
        </form>

        {/* Footer info */}
        <div className="px-8 py-4 bg-slate-950/40 border-t border-white/5 text-center">
          <p className="font-mono text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <CheckCircle2 size={12} className="text-emerald-400" />
            Ministry of Housing &amp; Urban Affairs · Govt of India
          </p>
        </div>
      </div>

      <p className="relative z-10 mt-6 font-mono text-xs text-slate-500 text-center">
        Internal Audit Wing &amp; Monitoring Division
      </p>
    </div>
  )
}
