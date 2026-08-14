import { useState, useMemo } from 'react'
import { Award, Target, CheckCircle2, AlertCircle, TrendingUp, Layers } from 'lucide-react'

const SLATE  = '#94A3B8'
const ALL    = '__all__'
const BUCKETS = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T5Plus']

function pct2(n, d) { return d > 0 ? +(n / d * 100).toFixed(2) : 0 }
function fmt(n)  { return n != null ? Number(n).toLocaleString('en-IN') : '—' }
function fmtCr(n) {
  if (n == null) return '—'
  if (n === 0) return '₹0.00 Cr'
  return `₹${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} Cr`
}
function getMonth(period) {
  const m = period?.match(/^([A-Za-z]+)\s+[\d\s–\-]+,?\s*(\d{4})/)
  return m ? `${m[1]} ${m[2]}` : (period?.split(' ')[0] ?? '')
}

// ── Aggregation ───────────────────────────────────────────────────────────────

function aggregateScorecard(weeksList) {
  let totalBills = 0, lt3Bills = 0, totalAmount = 0, lt3Amount = 0
  for (const w of weeksList) {
    for (const type of ['delay_normal', 'delay_ebill']) {
      for (const p of (w[type]?.paos ?? [])) {
        totalBills  += BUCKETS.reduce((s, b) => s + (p[`${b}_bills`] || 0), 0)
        lt3Bills    += (p.T0_bills || 0) + (p.T1_bills || 0) + (p.T2_bills || 0)
        totalAmount += BUCKETS.reduce((s, b) => s + (p[`${b}_amount`] || 0), 0)
        lt3Amount   += (p.T0_amount || 0) + (p.T1_amount || 0) + (p.T2_amount || 0)
      }
    }
  }
  const billsPct  = pct2(lt3Bills, totalBills)
  const amountPct = pct2(lt3Amount, totalAmount)
  return {
    totalBills, lt3Bills, billsPct,
    totalAmount, lt3Amount, amountPct,
    b41: billsPct  >= 95 ? 2 : 0,
    b42: amountPct >= 95 ? 2 : 0,
  }
}

function aggregatePaoScores(weeksList) {
  const map = {}
  for (const w of weeksList) {
    for (const type of ['delay_normal', 'delay_ebill']) {
      for (const p of (w[type]?.paos ?? [])) {
        const key = p.pao_code || p.pao
        if (!map[key]) map[key] = { pao: p.pao, pao_code: p.pao_code,
          totalBills: 0, lt3Bills: 0, totalAmount: 0, lt3Amount: 0 }
        map[key].totalBills  += BUCKETS.reduce((s, b) => s + (p[`${b}_bills`] || 0), 0)
        map[key].lt3Bills    += (p.T0_bills || 0) + (p.T1_bills || 0) + (p.T2_bills || 0)
        map[key].totalAmount += BUCKETS.reduce((s, b) => s + (p[`${b}_amount`] || 0), 0)
        map[key].lt3Amount   += (p.T0_amount || 0) + (p.T1_amount || 0) + (p.T2_amount || 0)
      }
    }
  }
  return Object.values(map)
    .filter(p => p.totalBills > 0)
    .map(p => ({
      ...p,
      billsPct:  pct2(p.lt3Bills, p.totalBills),
      amountPct: pct2(p.lt3Amount, p.totalAmount),
    }))
}

// ── UI Components ─────────────────────────────────────────────────────────────

function SectionDivider({ children, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 mb-3.5 select-none">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className="text-[#F9A55A]" />}
        <span className="section-label">{children}</span>
      </div>
      <div className="flex-1 h-[1px] bg-gradient-to-r from-white/10 to-transparent" />
    </div>
  )
}

function TotalScoreBanner({ score, max }) {
  const ratio  = score / max
  const color  = ratio === 1 ? '#10B981' : ratio >= 0.5 ? '#F59E0B' : '#F43F5E'
  const label  = ratio === 1 ? 'Full Target Achieved' : ratio >= 0.5 ? 'Partial Compliance' : 'Below Benchmark'
  
  return (
    <div
      className="p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-[#0F1E3C] to-[#0A1428] shadow-2xl flex items-center gap-6 shrink-0 relative overflow-hidden"
      style={{ borderLeft: `5px solid ${color}` }}
    >
      <div className="flex items-baseline gap-1">
        <span className="font-display text-6xl font-black leading-none drop-shadow-md" style={{ color }}>{score}</span>
        <span className="font-display text-2xl font-bold text-slate-400">/{max}</span>
      </div>
      <div>
        <p className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">B4 Score Total</p>
        <p className="font-display text-xl font-bold mt-0.5" style={{ color }}>{label}</p>
        <p className="font-mono text-[11px] text-slate-300 mt-1 flex items-center gap-1.5">
          <Target size={12} className="text-amber-400" />
          Target: &ge; 95% &lt;3 Days
        </p>
      </div>
    </div>
  )
}

function MetricCell({ label, value, highlightColor }) {
  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3.5">
      <p className="font-mono text-[10px] text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="font-display text-2xl font-bold leading-none" style={{ color: highlightColor || '#FFFFFF' }}>
        {value}
      </p>
    </div>
  )
}

function B4ScoreCard({ title, totalLabel, totalValue, lt3Label, lt3Value, percentage, score, maxScore }) {
  const passed = percentage >= 95
  const clr    = passed ? '#10B981' : '#F43F5E'

  return (
    <div className="kpi-card" style={{ '--kpi-accent': clr }}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider mb-1 inline-block" style={{ color: clr, background: clr + '22', border: `1px solid ${clr}44` }}>
            {passed ? 'Target Passed (2/2)' : 'Target Lagging (0/2)'}
          </span>
          <p className="font-display text-base font-bold text-white leading-tight">{title}</p>
        </div>

        <div className="w-14 h-14 rounded-2xl border-2 flex flex-col items-center justify-center shadow-lg" style={{ borderColor: clr, background: clr + '15' }}>
          <span className="font-display text-2xl font-extrabold leading-none" style={{ color: clr }}>{score}</span>
          <span className="font-mono text-[9px] text-slate-400">/{maxScore}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <MetricCell label={totalLabel} value={totalValue} />
        <MetricCell label={lt3Label}   value={lt3Value} highlightColor="#38BDF8" />
        <div className="p-3.5 rounded-xl text-center flex flex-col justify-center border" style={{ background: clr + '15', borderColor: clr + '35' }}>
          <p className="font-mono text-[10px] uppercase font-semibold text-slate-300 mb-1">Disposal Rate</p>
          <p className="font-display text-2xl font-black leading-none" style={{ color: clr }}>{percentage}%</p>
        </div>
      </div>
    </div>
  )
}

// ── PAO Scorecard Table ───────────────────────────────────────────────────────

const GRID = '32px 1fr 90px 90px 75px 44px 115px 115px 75px 44px 60px'

function PaoScorecardTable({ paos }) {
  const sorted = useMemo(() =>
    [...paos].sort((a, b) => {
      const sa = (a.billsPct >= 95 ? 2 : 0) + (a.amountPct >= 95 ? 2 : 0)
      const sb = (b.billsPct >= 95 ? 2 : 0) + (b.amountPct >= 95 ? 2 : 0)
      return sb - sa || b.billsPct - a.billsPct
    }),
  [paos])

  if (!sorted.length) return (
    <p className="font-body text-xs text-slate-400 text-center py-6">No data available for this period.</p>
  )

  const subHdrs = ['#', 'PAO Unit', 'Total Bills', '< 3 Days', 'Rate %', 'Score', 'Total Value', '< 3 Days Value', 'Rate %', 'Score', 'Total']

  return (
    <div className="table-container">
      {/* Group header */}
      <div className="grid grid-cols-[32px_1fr_300px_350px_60px] bg-[#070E1C] px-4 py-2.5 border-b border-white/10 text-[11px] font-mono font-bold tracking-wider uppercase">
        <span />
        <span className="text-slate-400">Unit Identification</span>
        <span className="text-sky-300 text-center">B4.1 — Bill Count (&lt;3 Days)</span>
        <span className="text-emerald-300 text-center">B4.2 — Value Disposed (&lt;3 Days)</span>
        <span className="text-amber-300 text-center">Score</span>
      </div>

      {/* Sub header */}
      <div style={{ display: 'grid', gridTemplateColumns: GRID }} className="bg-[#0B152A] px-4 py-2 border-b border-white/10 text-[10px] font-mono uppercase text-slate-400">
        {subHdrs.map((h, i) => (
          <span key={i} className={i < 2 ? 'text-left' : 'text-right'}>{h}</span>
        ))}
      </div>

      {/* Table rows */}
      <div className="max-h-[460px] overflow-y-auto divide-y divide-white/5">
        {sorted.map((p, i) => {
          const b41    = p.billsPct  >= 95 ? 2 : 0
          const b42    = p.amountPct >= 95 ? 2 : 0
          const total  = b41 + b42
          const tColor = total === 4 ? '#10B981' : total === 2 ? '#F59E0B' : '#F43F5E'

          return (
            <div
              key={p.pao_code || p.pao}
              style={{ display: 'grid', gridTemplateColumns: GRID }}
              className="px-4 py-2.5 items-center hover:bg-white/[0.04] transition-colors text-xs"
            >
              <span className="font-mono text-slate-400">{i + 1}</span>

              <span className="font-body font-semibold text-slate-200 pr-2 truncate">
                {p.pao}
              </span>

              {/* B4.1 */}
              <span className="font-mono text-slate-400 text-right pr-2">{fmt(p.totalBills)}</span>
              <span className="font-mono text-sky-400 text-right pr-2">{fmt(p.lt3Bills)}</span>
              <span className={`font-mono font-semibold text-right pr-2 ${p.billsPct >= 95 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {p.billsPct}%
              </span>
              <div className="flex justify-end">
                <span className="font-display font-bold px-1.5 py-0.5 rounded text-xs" style={{ color: b41 === 2 ? '#10B981' : '#F43F5E', background: (b41 === 2 ? '#10B981' : '#F43F5E') + '22' }}>
                  {b41}
                </span>
              </div>

              {/* B4.2 */}
              <span className="font-mono text-slate-400 text-right pr-2">{fmtCr(p.totalAmount)}</span>
              <span className="font-mono text-emerald-400 text-right pr-2">{fmtCr(p.lt3Amount)}</span>
              <span className={`font-mono font-semibold text-right pr-2 ${p.amountPct >= 95 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {p.amountPct}%
              </span>
              <div className="flex justify-end">
                <span className="font-display font-bold px-1.5 py-0.5 rounded text-xs" style={{ color: b42 === 2 ? '#10B981' : '#F43F5E', background: (b42 === 2 ? '#10B981' : '#F43F5E') + '22' }}>
                  {b42}
                </span>
              </div>

              {/* Total score */}
              <div className="flex justify-end">
                <span className="font-display font-extrabold text-sm px-2 py-0.5 rounded-md" style={{ color: tColor, background: tColor + '25', border: `1px solid ${tColor}44` }}>
                  {total}/4
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ScorecardDashboard({ data }) {
  const weeks = useMemo(() => data?.weeks ?? [], [data])

  const months = useMemo(() => {
    const seen = new Set(); const out = []
    ;[...weeks].reverse().forEach(w => {
      const m = getMonth(w.period)
      if (!seen.has(m)) { seen.add(m); out.push(m) }
    })
    return out
  }, [weeks])

  const [selMonth, setSelMonth] = useState(() => months[0] ?? '')
  const [selWeek,  setSelWeek]  = useState(ALL)

  const monthWeeks = useMemo(
    () => [...weeks].reverse().filter(w => getMonth(w.period) === selMonth),
    [weeks, selMonth]
  )

  const activePeriod = useMemo(
    () => selWeek === ALL ? monthWeeks : monthWeeks.filter(w => w.period === selWeek),
    [monthWeeks, selWeek]
  )

  const sc        = useMemo(() => aggregateScorecard(activePeriod), [activePeriod])
  const paoScores = useMemo(() => aggregatePaoScores(activePeriod), [activePeriod])
  const total     = sc.b41 + sc.b42

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Filters Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 p-4 rounded-xl glass-card">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="filter-label">Month:</span>
            <select className="filter-select font-mono" value={selMonth} onChange={e => { setSelMonth(e.target.value); setSelWeek(ALL) }}>
              {months.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="filter-label">Week:</span>
            <select className="filter-select font-mono" value={selWeek} onChange={e => setSelWeek(e.target.value)}>
              <option value={ALL}>All Weeks (Month Aggregated)</option>
              {monthWeeks.map(w => <option key={w.period} value={w.period}>{w.period}</option>)}
            </select>
          </div>
        </div>

        {selWeek === ALL && (
          <span className="font-mono text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-white/5">
            {monthWeeks.length} week{monthWeeks.length !== 1 ? 's' : ''} aggregated
          </span>
        )}
      </div>

      {/* B4 Score Overview */}
      <div>
        <SectionDivider icon={Award}>B4 Milestone — Disposal of Bills in &lt; 3 Days</SectionDivider>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
          <TotalScoreBanner score={total} max={4} />
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <B4ScoreCard
              title="B4.1: Volume Disposed &lt; 3 Days"
              totalLabel="Total Bills Disposed"
              totalValue={fmt(sc.totalBills)}
              lt3Label="Disposed < 3 Days"
              lt3Value={fmt(sc.lt3Bills)}
              percentage={sc.billsPct}
              score={sc.b41}
              maxScore={2}
            />
            <B4ScoreCard
              title="B4.2: Amount Disposed &lt; 3 Days"
              totalLabel="Total Amount Disposed"
              totalValue={fmtCr(sc.totalAmount)}
              lt3Label="Disposed < 3 Days"
              lt3Value={fmtCr(sc.lt3Amount)}
              percentage={sc.amountPct}
              score={sc.b42}
              maxScore={2}
            />
          </div>
        </div>
      </div>

      {/* PAO-Wise Scorecard Table */}
      <div>
        <SectionDivider icon={Layers}>PAO-Wise Scorecard League Table</SectionDivider>
        <PaoScorecardTable paos={paoScores} />
      </div>
    </div>
  )
}
