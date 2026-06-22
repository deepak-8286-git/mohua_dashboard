import { useState } from 'react'
import PulseLine from './PulseLine'

const VALID_USER = 'deepak.p'
const VALID_PASS = 'deepak.p@123'

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    setTimeout(() => {
      if (username === VALID_USER && password === VALID_PASS) {
        onLogin()
      } else {
        setError('Invalid username or password.')
        setLoading(false)
      }
    }, 400)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(160deg, #0A1628 0%, #0D1B2E 60%, #111C2D 100%)' }}
    >
      {/* Emblem — outside the card with blended edges */}
      <div style={{
        width: '420px',
        maskImage: 'radial-gradient(ellipse 85% 75% at 50% 52%, black 55%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 85% 75% at 50% 52%, black 55%, transparent 100%)',
        mixBlendMode: 'screen',
      }} className="mb-6">
        <img
          src="/Indian_emblem.png"
          alt="Emblem of India"
          style={{ width: '100%', height: 'auto', filter: 'brightness(1.2) contrast(1.05)' }}
        />
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-xl border border-navy-400 shadow-2xl overflow-hidden"
        style={{ background: '#12202F' }}
      >
        {/* Header band */}
        <div className="px-8 pt-7 pb-5 flex flex-col items-center text-center"
             style={{ borderBottom: '1px solid #1A2A40' }}>
          <h1 className="font-display text-2xl font-bold tracking-wide text-slate-100 leading-tight">
            Dashboard, <span style={{ color: '#E8813A' }}>MOHUA</span>
          </h1>
          <PulseLine />
          <p className="font-body text-xs text-slate-500 tracking-wider mt-0.5">
            By <span className="text-slate-400 font-medium">P.Deepak</span>
            &nbsp;·&nbsp; Controller Of Accounts
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
          <div>
            <label className="block font-body text-xs font-semibold tracking-widest uppercase text-slate-500 mb-1.5">
              Username
            </label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="deepak.p"
              required
              className="w-full rounded px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition-colors"
              style={{ background: '#0D1B2E', border: '1px solid #2B4069' }}
              onFocus={e => (e.target.style.borderColor = '#E8813A')}
              onBlur={e  => (e.target.style.borderColor = '#2B4069')}
            />
          </div>

          <div>
            <label className="block font-body text-xs font-semibold tracking-widest uppercase text-slate-500 mb-1.5">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••"
              required
              className="w-full rounded px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition-colors"
              style={{ background: '#0D1B2E', border: '1px solid #2B4069' }}
              onFocus={e => (e.target.style.borderColor = '#E8813A')}
              onBlur={e  => (e.target.style.borderColor = '#2B4069')}
            />
          </div>

          {error && (
            <p className="font-body text-xs text-red-400 py-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded font-display font-bold tracking-widest uppercase text-sm transition-all duration-150 disabled:opacity-60"
            style={{ background: loading ? '#B06028' : '#E8813A', color: '#0A1628' }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="px-8 pb-6 text-center">
          <p className="font-mono text-xs text-slate-700">
            Ministry of Housing &amp; Urban Affairs
          </p>
        </div>
      </div>

      <p className="mt-8 font-mono text-xs text-slate-800">
        Government of India &nbsp;·&nbsp; Internal Audit Wing
      </p>
    </div>
  )
}
