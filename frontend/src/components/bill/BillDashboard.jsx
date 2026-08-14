import { useState, useMemo } from 'react'
import {
  Receipt,
  CheckCircle2,
  Clock,
  RotateCcw,
  XCircle,
  Trophy,
  AlertTriangle,
  Layers,
  Building2,
  ChevronRight,
  ChevronDown,
  Sparkles,
} from 'lucide-react'

const AMBER = '#F59E0B'
const GREEN = '#10B981'
const BLUE  = '#38BDF8'
const RED   = '#F43F5E'
const SLATE = '#94A3B8'
const ALL   = '__all__'
const TOP_N = 3

// Raw 7-bucket keys
const BUCKET_COLS = [
  { key: 'T0' }, { key: 'T1' }, { key: 'T2' },
  { key: 'T3' }, { key: 'T4' }, { key: 'T5' }, { key: 'T5Plus' },
]

// Display buckets — T0+T1+T2 merged into one "< 3 Days" entry
const DISPLAY_BUCKETS = [
  { keys: ['T0','T1','T2'], label: '< 3 Days', color: '#10B981', desc: '0-2 days fast-track' },
  { keys: ['T3'],           label: 'T3',       color: '#F59E0B', desc: '3-5 days standard' },
  { keys: ['T4'],           label: 'T4',       color: '#FB923C', desc: '6-10 days moderate' },
  { keys: ['T5'],           label: 'T5',       color: '#F43F5E', desc: '11-30 days delayed' },
  { keys: ['T5Plus'],       label: 'T5+',      color: '#E11D48', desc: '31+ days critical' },
]

function bucketVal(data, keys) {
  return keys.reduce((s, k) => s + (data?.[`${k}_bills`] || 0), 0)
}

const STATUS_META = [
  { key: 'closed',    label: 'Closed',    color: '#10B981', icon: CheckCircle2 },
  { key: 'pending',   label: 'Pending',   color: '#F59E0B', icon: Clock },
  { key: 'returned',  label: 'Returned',  color: '#F43F5E', icon: RotateCcw },
  { key: 'cancelled', label: 'Cancelled', color: '#38BDF8', icon: XCircle },
]

function pct(n, d) { return d > 0 ? +(n / d * 100).toFixed(1) : 0 }
function fmt(n)    { return n != null ? Number(n).toLocaleString('en-IN') : '—' }
function fmtAmt(n) {
  if (n == null) return '—'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  return `₹${Number(n).toLocaleString('en-IN')}`
}
function getMonth(period) {
  const m = period?.match(/^([A-Za-z]+)\s+[\d\s–\-]+,?\s*(\d{4})/)
  return m ? `${m[1]} ${m[2]}` : (period?.split(' ')[0] ?? '')
}

// ── Aggregation ───────────────────────────────────────────────────────────────

function aggregateEbm(weeksList) {
  let totalBills = 0, totalAmount = 0, normalBills = 0, normalAmount = 0,
      ebillCount = 0, ebillAmount = 0
  for (const w of weeksList) {
    for (const p of (w.ebm?.paos ?? [])) {
      totalBills   += p.total_bills   ?? 0
      totalAmount  += p.total_amount  ?? 0
      normalBills  += p.normal_bills  ?? 0
      normalAmount += p.normal_amount ?? 0
      ebillCount   += p.ebill_count   ?? 0
      ebillAmount  += p.ebill_amount  ?? 0
    }
  }
  return { totalBills, totalAmount, normalBills, normalAmount, ebillCount, ebillAmount }
}

function aggregateEbmPaos(weeksList) {
  const map = {}
  for (const w of weeksList) {
    for (const p of (w.ebm?.paos ?? [])) {
      const key = p.pao_code || p.pao_name
      if (!map[key]) map[key] = {
        pao_name: p.pao_name, pao_code: p.pao_code,
        total_bills: 0, total_amount: 0,
        normal_bills: 0, normal_amount: 0,
        ebill_count: 0, ebill_amount: 0,
      }
      map[key].total_bills   += p.total_bills   ?? 0
      map[key].total_amount  += p.total_amount  ?? 0
      map[key].normal_bills  += p.normal_bills  ?? 0
      map[key].normal_amount += p.normal_amount ?? 0
      map[key].ebill_count   += p.ebill_count   ?? 0
      map[key].ebill_amount  += p.ebill_amount  ?? 0
    }
  }
  return Object.values(map)
    .filter(p => p.total_bills > 0)
    .sort((a, b) => b.total_bills - a.total_bills)
}

function aggregateDelayPaos(weeksList, type) {
  const map = {}
  for (const w of weeksList) {
    const paos = (type === 'normal' ? w.delay_normal : w.delay_ebill)?.paos ?? []
    for (const p of paos) {
      const key = p.pao_code || p.pao
      if (!map[key]) {
        map[key] = { pao: p.pao, pao_code: p.pao_code, total_bills_token: 0,
          closed: 0, pending: 0, cancelled: 0, returned: 0 }
        BUCKET_COLS.forEach(b => { map[key][`${b.key}_bills`] = 0 })
      }
      map[key].total_bills_token += p.total_bills_token || 0
      map[key].closed    += p.closed    || 0
      map[key].pending   += p.pending   || 0
      map[key].cancelled += p.cancelled || 0
      map[key].returned  += p.returned  || 0
      BUCKET_COLS.forEach(b => { map[key][`${b.key}_bills`] += p[`${b.key}_bills`] || 0 })
    }
  }
  return Object.values(map)
}

function aggregateStatus(weeksList, paoCode = ALL) {
  let closed = 0, pending = 0, cancelled = 0, returned = 0
  for (const w of weeksList) {
    for (const p of [...(w.delay_normal?.paos ?? []), ...(w.delay_ebill?.paos ?? [])]) {
      if (paoCode !== ALL && p.pao_code !== paoCode) continue
      closed    += p.closed    ?? 0
      pending   += p.pending   ?? 0
      cancelled += p.cancelled ?? 0
      returned  += p.returned  ?? 0
    }
  }
  return { closed, pending, cancelled, returned }
}

function combinePaos(normalPaos, ebillPaos) {
  const map = {}
  const add = (p) => {
    const key = p.pao_code || p.pao
    if (!map[key]) {
      map[key] = { pao: p.pao, pao_code: p.pao_code, total_bills_token: 0,
        closed: 0, pending: 0, cancelled: 0, returned: 0 }
      BUCKET_COLS.forEach(b => { map[key][`${b.key}_bills`] = 0 })
    }
    map[key].total_bills_token += p.total_bills_token || 0
    map[key].closed    += p.closed    || 0
    map[key].pending   += p.pending   || 0
    map[key].cancelled += p.cancelled || 0
    map[key].returned  += p.returned  || 0
    BUCKET_COLS.forEach(b => { map[key][`${b.key}_bills`] += p[`${b.key}_bills`] || 0 })
  }
  normalPaos.forEach(add); ebillPaos.forEach(add)
  return Object.values(map)
}

// ── Card components ───────────────────────────────────────────────────────────

function SectionDivider({ children, onToggle, open, icon: Icon }) {
  const isCollapsible = onToggle != null
  return (
    <div
      onClick={isCollapsible ? onToggle : undefined}
      className="flex items-center gap-3 mb-3.5 select-none cursor-pointer"
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className="text-[#F9A55A]" />}
        <span className="section-label">{children}</span>
      </div>
      {isCollapsible && (
        <span className="text-slate-400 text-xs">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      )}
      <div className="flex-1 h-[1px] bg-gradient-to-r from-white/10 to-transparent" />
    </div>
  )
}

function SummaryCard({ label, count, amount, countPct, amountPct, accent }) {
  return (
    <div className="kpi-card" style={{ '--kpi-accent': accent }}>
      <p className="font-mono text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-2">{label}</p>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-3xl md:text-4xl font-bold leading-none text-white">{fmt(count)}</span>
        {countPct != null && (
          <span className="font-mono text-xs px-2.5 py-0.5 rounded-full font-bold" style={{ color: accent, background: accent + '22', border: `1px solid ${accent}44` }}>
            {countPct}%
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between border-t border-white/10 mt-3 pt-2.5">
        <span className="font-mono text-xs font-semibold text-slate-200">{fmtAmt(amount)}</span>
        {amountPct != null && <span className="font-mono text-[11px] text-slate-400">{amountPct}% amount</span>}
      </div>
    </div>
  )
}

function BillTypeCard({ label, count, amount, countPct, accent }) {
  return (
    <div className="kpi-card" style={{ '--kpi-accent': accent }}>
      <p className="font-mono text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-2">{label}</p>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-display text-2xl font-bold leading-none text-white">{fmt(count)}</p>
        {countPct != null && (
          <span className="font-mono text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ color: accent, background: accent + '22', border: `1px solid ${accent}44` }}>
            {countPct}%
          </span>
        )}
      </div>
      <p className="font-mono text-xs font-semibold text-slate-300 border-t border-white/10 mt-2.5 pt-2">{fmtAmt(amount)}</p>
    </div>
  )
}

function StatusCard({ label, count, color, icon: Icon }) {
  return (
    <div className="kpi-card" style={{ '--kpi-accent': color }}>
      <div className="flex items-center justify-between mb-1.5">
        <p className="font-mono text-[11px] font-bold tracking-wider uppercase text-slate-400">{label}</p>
        {Icon && <Icon size={16} style={{ color }} />}
      </div>
      <p className="font-display text-3xl font-bold leading-none text-white drop-shadow-sm">{fmt(count)}</p>
    </div>
  )
}

function BucketCard({ label, desc, count, total, color }) {
  const percentage = pct(count, total)
  return (
    <div
      className="p-3.5 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md relative overflow-hidden transition-all hover:border-white/20"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className="flex justify-between items-baseline mb-1">
        <span className="font-display text-base font-bold" style={{ color }}>{label}</span>
        <span className="text-[10px] font-mono text-slate-400">{desc}</span>
      </div>
      <p className="font-display text-2xl font-bold text-white leading-none mt-1">{percentage}%</p>
      <p className="font-mono text-[11px] text-slate-400 mt-1">{fmt(count)} bills</p>
      <div className="mt-2.5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, percentage)}%`, background: color }} />
      </div>
    </div>
  )
}

function PerformerCard({ rank, data, isGood }) {
  const total = data.total_bills_token || 0
  const buckets = DISPLAY_BUCKETS.map(b => ({
    ...b,
    count: bucketVal(data, b.keys),
    pct:   pct(bucketVal(data, b.keys), total),
  }))
  const accentColor = isGood ? '#10B981' : '#F43F5E'

  return (
    <div
      className="p-4 rounded-xl border border-white/10 bg-[#0F1E3C]/80 backdrop-blur-md relative overflow-hidden shadow-lg transition-all hover:border-white/20"
      style={{ borderLeft: `4px solid ${accentColor}` }}
    >
      <div className="flex items-start gap-2.5 mb-2.5">
        <span className="font-display font-bold text-lg leading-none" style={{ color: accentColor }}>#{rank}</span>
        <span className="flex-1 font-body text-xs font-semibold text-white leading-tight">{data.pao}</span>
        <span className="font-mono text-[11px] text-slate-400 whitespace-nowrap">{fmt(total)} bills</span>
      </div>

      {/* Stacked distribution bar */}
      <div className="flex h-2 rounded-full overflow-hidden mb-3 gap-0.5 bg-slate-800">
        {buckets.map((b, i) => b.pct > 0 ? (
          <div key={i} title={`${b.label}: ${b.pct}%`} style={{ width: `${b.pct}%`, background: b.color }} />
        ) : null)}
      </div>

      {/* Bucket breakdown grid */}
      <div className="grid grid-cols-5 gap-1.5">
        {buckets.map(b => (
          <div key={b.label} className="text-center p-1.5 rounded-lg" style={{ background: b.color + '15', border: `1px solid ${b.color}25` }}>
            <p className="font-mono text-[9px] font-bold" style={{ color: b.color }}>{b.label}</p>
            <p className="font-display text-sm font-bold leading-none mt-0.5" style={{ color: b.color }}>{b.pct}%</p>
            <p className="font-mono text-[9px] text-slate-400 mt-0.5">{fmt(b.count)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function PendingBreakdownTable({ paos }) {
  const sorted = useMemo(
    () => [...paos]
      .filter(p => (p.pending || 0) > 0)
      .sort((a, b) => (b.pending || 0) - (a.pending || 0)),
    [paos]
  )
  const maxPending   = sorted[0]?.pending || 1
  const totalPending = sorted.reduce((s, p) => s + (p.pending || 0), 0)
  const paosWithPending = sorted.length

  if (!sorted.length) return (
    <p className="font-body text-xs text-slate-400 text-center py-4">No pending bills logged for this selection.</p>
  )

  return (
    <div className="table-container mb-4">
      {/* Banner */}
      <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-amber-400" />
          <span className="font-display text-base font-bold text-amber-300">{fmt(totalPending)} Pending Bills</span>
        </div>
        <span className="font-mono text-xs text-slate-400">
          Across {paosWithPending} PAO{paosWithPending !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#0B152A] border-b border-white/10">
            <tr>
              <th className="px-3 py-2.5 text-left font-mono text-[10px] text-slate-400 uppercase">#</th>
              <th className="px-3 py-2.5 text-left font-mono text-[10px] text-slate-400 uppercase">PAO Name</th>
              <th className="px-3 py-2.5 text-right font-mono text-[10px] text-slate-400 uppercase">Pending</th>
              <th className="px-3 py-2.5 text-right font-mono text-[10px] text-slate-400 uppercase">% Rate</th>
              <th className="px-3 py-2.5 text-left font-mono text-[10px] text-slate-400 uppercase w-32">Share</th>
              <th className="px-3 py-2.5 text-right font-mono text-[10px] text-emerald-400 uppercase">Closed</th>
              <th className="px-3 py-2.5 text-right font-mono text-[10px] text-rose-400 uppercase">Returned</th>
              <th className="px-3 py-2.5 text-right font-mono text-[10px] text-sky-400 uppercase">Cancelled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((p, i) => {
              const pendingPct = pct(p.pending || 0, p.total_bills_token || 1)
              const barW       = ((p.pending || 0) / maxPending) * 100
              const isHighRisk = pendingPct > 25

              return (
                <tr key={p.pao_code || p.pao} className="hover:bg-white/[0.04] transition-colors">
                  <td className="px-3 py-2 font-mono text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2 text-slate-200 font-medium">{p.pao}</td>
                  <td className="px-3 py-2 text-right font-display text-sm font-bold text-amber-400">{fmt(p.pending || 0)}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    <span className={`px-1.5 py-0.5 rounded ${isHighRisk ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-300'}`}>
                      {pendingPct}%
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden w-24">
                      <div className="h-full rounded-full" style={{ width: `${barW}%`, background: isHighRisk ? '#F43F5E' : '#F59E0B' }} />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-400">{fmt(p.closed || 0)}</td>
                  <td className="px-3 py-2 text-right font-mono text-rose-400">{fmt(p.returned || 0)}</td>
                  <td className="px-3 py-2 text-right font-mono text-sky-400">{fmt(p.cancelled || 0)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function BillDashboard({ data }) {
  const weeks = useMemo(() => data?.weeks ?? [], [data])

  const months = useMemo(() => {
    const seen = new Set(); const out = []
    ;[...weeks].reverse().forEach(w => {
      const m = getMonth(w.period)
      if (!seen.has(m)) { seen.add(m); out.push(m) }
    })
    return out
  }, [weeks])

  const [selMonth,    setSelMonth]    = useState(() => months[0] ?? '')
  const [selWeek,     setSelWeek]     = useState(ALL)
  const [selPao,      setSelPao]      = useState(ALL)
  const [pendingOpen, setPendingOpen] = useState(true)

  const monthWeeks = useMemo(
    () => [...weeks].reverse().filter(w => getMonth(w.period) === selMonth),
    [weeks, selMonth]
  )

  const handleMonthChange = (m) => { setSelMonth(m); setSelWeek(ALL); setSelPao(ALL) }

  const activePeriod = useMemo(
    () => selWeek === ALL ? monthWeeks : monthWeeks.filter(w => w.period === selWeek),
    [monthWeeks, selWeek]
  )

  const isMonthView = selWeek === ALL

  // Summary totals
  const totals = useMemo(() => {
    const r = aggregateEbm(activePeriod)
    return {
      ...r,
      normalBillPct: pct(r.normalBills, r.totalBills),
      normalAmtPct:  pct(r.normalAmount, r.totalAmount),
      ebillBillPct:  pct(r.ebillCount, r.totalBills),
      ebillAmtPct:   pct(r.ebillAmount, r.totalAmount),
    }
  }, [activePeriod])

  const allEbmPaos = useMemo(() => aggregateEbmPaos(activePeriod), [activePeriod])
  const normalDelayPaos = useMemo(() => aggregateDelayPaos(activePeriod, 'normal'), [activePeriod])
  const ebillDelayPaos  = useMemo(() => aggregateDelayPaos(activePeriod, 'ebill'),  [activePeriod])
  const totalDelayPaos  = useMemo(() => combinePaos(normalDelayPaos, ebillDelayPaos), [normalDelayPaos, ebillDelayPaos])

  const allPaoDelayAgg = useMemo(() => {
    const agg = { total_bills_token: 0 }
    BUCKET_COLS.forEach(b => { agg[`${b.key}_bills`] = 0 })
    totalDelayPaos.forEach(p => {
      agg.total_bills_token += p.total_bills_token || 0
      BUCKET_COLS.forEach(b => { agg[`${b.key}_bills`] += p[`${b.key}_bills`] || 0 })
    })
    return agg
  }, [totalDelayPaos])

  const selectedEbmPao = useMemo(
    () => selPao === ALL ? null : allEbmPaos.find(p => (p.pao_code || p.pao_name) === selPao) ?? null,
    [allEbmPaos, selPao]
  )
  const selectedDelayPao = useMemo(
    () => selPao === ALL ? null : totalDelayPaos.find(p => (p.pao_code || p.pao) === selPao) ?? null,
    [totalDelayPaos, selPao]
  )

  const statusData  = useMemo(() => aggregateStatus(activePeriod, selPao), [activePeriod, selPao])
  const delayData   = selPao === ALL ? allPaoDelayAgg : selectedDelayPao

  const activePaos = useMemo(
    () => totalDelayPaos.filter(p => (p.total_bills_token || 0) > 0),
    [totalDelayPaos]
  )
  const best3 = useMemo(
    () => [...activePaos].sort((a, b) =>
      pct(b.T0_bills || 0, b.total_bills_token) - pct(a.T0_bills || 0, a.total_bills_token)
    ).slice(0, TOP_N),
    [activePaos]
  )
  const worst3 = useMemo(
    () => [...activePaos].sort((a, b) => {
      const lateA = pct((a.T4_bills||0)+(a.T5_bills||0)+(a.T5Plus_bills||0), a.total_bills_token)
      const lateB = pct((b.T4_bills||0)+(b.T5_bills||0)+(b.T5Plus_bills||0), b.total_bills_token)
      return lateB - lateA
    }).slice(0, TOP_N),
    [activePaos]
  )

  const selectedPaoName = selectedEbmPao?.pao_name ??
    (selPao !== ALL ? (allEbmPaos.find(p => (p.pao_code || p.pao_name) === selPao)?.pao_name ?? selPao) : null)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* ── Filters Bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4 p-4 rounded-xl glass-card">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="filter-label">Month:</span>
            <select className="filter-select font-mono" value={selMonth} onChange={e => handleMonthChange(e.target.value)}>
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

          <div className="flex items-center gap-2">
            <span className="filter-label">PAO Unit:</span>
            <div className="flex items-center gap-1.5">
              <select className="filter-select max-w-xs" value={selPao} onChange={e => setSelPao(e.target.value)}>
                <option value={ALL}>All PAOs Combined</option>
                {allEbmPaos.map(p => (
                  <option key={p.pao_code || p.pao_name} value={p.pao_code || p.pao_name}>{p.pao_name}</option>
                ))}
              </select>
              {selPao !== ALL && (
                <button
                  onClick={() => setSelPao(ALL)}
                  className="px-2 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white bg-slate-800 border border-white/10 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {isMonthView && (
          <span className="font-mono text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-white/5">
            {monthWeeks.length} week{monthWeeks.length !== 1 ? 's' : ''} aggregated
          </span>
        )}
      </div>

      {/* ── Bill Summary Cards ─────────────────────────────────────────── */}
      <div>
        <SectionDivider icon={Receipt}>
          Bill Summary — {selMonth}{selWeek !== ALL ? ` · ${selWeek}` : ''}
        </SectionDivider>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard label="Total Bills Handled" count={totals.totalBills} amount={totals.totalAmount} accent={BLUE} />
          <SummaryCard label="Normal Paper Bills" count={totals.normalBills} amount={totals.normalAmount}
            countPct={totals.normalBillPct} amountPct={totals.normalAmtPct} accent={AMBER} />
          <SummaryCard label="Digital E-Bills" count={totals.ebillCount} amount={totals.ebillAmount}
            countPct={totals.ebillBillPct} amountPct={totals.ebillAmtPct} accent={GREEN} />
        </div>
      </div>

      {/* ── PAO Specific Bill Type Breakdown ───────────────────────────── */}
      {selPao !== ALL && (
        <div className="p-4 rounded-xl glass-card border-l-4 border-l-cyan-400">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-cyan-400" />
              <span className="font-mono text-xs uppercase font-bold text-cyan-300">Selected PAO:</span>
              <span className="font-display text-base font-bold text-white">{selectedPaoName}</span>
            </div>
            <button
              onClick={() => setSelPao(ALL)}
              className="text-xs font-mono text-cyan-400 hover:underline cursor-pointer"
            >
              Reset to All PAOs
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <BillTypeCard label="PAO Total Bills" count={selectedEbmPao?.total_bills} amount={selectedEbmPao?.total_amount} accent={BLUE} />
            <BillTypeCard label="Normal Bills" count={selectedEbmPao?.normal_bills} amount={selectedEbmPao?.normal_amount}
              countPct={pct(selectedEbmPao?.normal_bills || 0, selectedEbmPao?.total_bills || 0)} accent={AMBER} />
            <BillTypeCard label="E-Bills" count={selectedEbmPao?.ebill_count} amount={selectedEbmPao?.ebill_amount}
              countPct={pct(selectedEbmPao?.ebill_count || 0, selectedEbmPao?.total_bills || 0)} accent={GREEN} />
          </div>
        </div>
      )}

      {/* ── Bill Status Breakdown ──────────────────────────────────────── */}
      <div>
        <SectionDivider icon={Layers}>
          Bill Status{selPao !== ALL ? ` — ${selectedPaoName}` : ' — All PAOs'}
        </SectionDivider>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {STATUS_META.map(s => (
            <StatusCard key={s.key} label={s.label} count={statusData[s.key]} color={s.color} icon={s.icon} />
          ))}
        </div>
      </div>

      {/* ── Pending Bills PAO Breakdown Table ─────────────────────────── */}
      <div>
        <SectionDivider
          open={pendingOpen}
          onToggle={() => setPendingOpen(v => !v)}
          icon={Clock}
        >
          Pending Bills — PAO Breakdown Table
        </SectionDivider>
        {pendingOpen && <PendingBreakdownTable paos={totalDelayPaos} />}
      </div>

      {/* ── Delay Distribution Buckets ─────────────────────────────────── */}
      <div>
        <SectionDivider icon={Clock}>
          Delay Distribution Buckets{selPao !== ALL ? ` — ${selectedPaoName}` : ' — All PAOs'}
        </SectionDivider>
        {(delayData?.total_bills_token || 0) === 0 ? (
          <p className="font-body text-xs text-slate-400 text-center py-4">No delay data available for this selection.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {DISPLAY_BUCKETS.map(b => (
              <BucketCard
                key={b.label}
                label={b.label}
                desc={b.desc}
                color={b.color}
                count={bucketVal(delayData, b.keys)}
                total={delayData?.total_bills_token || 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Performance Insights: Best & Worst ─────────────────────────── */}
      <div>
        <SectionDivider icon={Trophy}>Performance Insights — Best &amp; Worst Performers</SectionDivider>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={16} className="text-emerald-400" />
              <span className="font-display font-bold text-sm text-emerald-400 uppercase tracking-wider">Top 3 Fast-Track Performers</span>
              <span className="font-mono text-[11px] text-slate-400">(highest &lt;3d clearance)</span>
            </div>
            <div className="space-y-3">
              {best3.length === 0 ? (
                <p className="text-xs text-slate-400">No data available</p>
              ) : (
                best3.map((p, i) => <PerformerCard key={p.pao_code || p.pao} rank={i + 1} data={p} isGood={true} />)
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-rose-400" />
              <span className="font-display font-bold text-sm text-rose-400 uppercase tracking-wider">Top 3 Lagging Units</span>
              <span className="font-mono text-[11px] text-slate-400">(highest T4/T5/T5+ delays)</span>
            </div>
            <div className="space-y-3">
              {worst3.length === 0 ? (
                <p className="text-xs text-slate-400">No data available</p>
              ) : (
                worst3.map((p, i) => <PerformerCard key={p.pao_code || p.pao} rank={i + 1} data={p} isGood={false} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
