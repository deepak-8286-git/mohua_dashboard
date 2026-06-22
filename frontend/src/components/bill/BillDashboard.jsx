import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts'

const AMBER  = '#E8813A'
const GREEN  = '#38B089'
const BLUE   = '#4F9CF9'
const RED    = '#D94F3D'
const TT     = { backgroundColor: '#12202F', border: '1px solid #1A2A40', borderRadius: 4, fontSize: 12 }

const BUCKET_COLS = [
  { key: 'T0',     label: 'T0',   color: '#38B089', desc: 'Same-day' },
  { key: 'T1',     label: 'T1',   color: '#4F9CF9', desc: '1-2 days' },
  { key: 'T2',     label: 'T2',   color: '#B8C8DC', desc: '3-5 days' },
  { key: 'T3',     label: 'T3',   color: '#E8813A', desc: '6-10 days' },
  { key: 'T4',     label: 'T4',   color: '#F5A623', desc: '11-30 days' },
  { key: 'T5',     label: 'T5',   color: '#D94F3D', desc: '31-60 days' },
  { key: 'T5Plus', label: 'T5+',  color: '#7B1C1C', desc: '60+ days' },
]

function pct(n, d) { return d > 0 ? +(n / d * 100).toFixed(1) : 0 }
function fmt(n)    { return n != null ? n.toLocaleString('en-IN') : '—' }
function fmtAmt(n) {
  if (n == null) return '—'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  return `₹${n.toLocaleString('en-IN')}`
}
function short(name) { return name?.slice(0, 34) ?? '' }

function getMonth(period) {
  const m = period?.match(/^([A-Za-z]+)\s+[\d\s–\-]+,?\s*(\d{4})/)
  return m ? `${m[1]} ${m[2]}` : (period?.split(' ')[0] ?? '')
}

// ── Summary card with count + amount rows ─────────────────────────────────
function SummaryCard({ label, count, amount, countPct, amountPct, accent }) {
  return (
    <div className="kpi-card flex-1" style={{ borderColor: accent }}>
      <p className="font-body text-xs font-semibold tracking-widest uppercase text-slate-500 mb-3">{label}</p>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-2xl font-bold leading-none" style={{ color: accent }}>
            {fmt(count)}
          </span>
          {countPct != null && (
            <span className="font-mono text-xs text-slate-500">{countPct}% of bills</span>
          )}
        </div>
        <div className="flex items-baseline justify-between border-t border-navy-400 pt-2">
          <span className="font-mono text-sm text-slate-300">{fmtAmt(amount)}</span>
          {amountPct != null && (
            <span className="font-mono text-xs text-slate-500">{amountPct}% of amt</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Delay distribution: combines normal + ebill PAO data ─────────────────
function combineDelayPaos(normalPaos, ebillPaos) {
  const map = {}
  const add = (p) => {
    const key = p.pao_code || p.pao
    if (!map[key]) {
      map[key] = { pao: p.pao, pao_code: p.pao_code, total_bills_token: 0 }
      BUCKET_COLS.forEach(b => { map[key][`${b.key}_bills`] = 0 })
    }
    map[key].total_bills_token += p.total_bills_token || 0
    BUCKET_COLS.forEach(b => {
      map[key][`${b.key}_bills`] += p[`${b.key}_bills`] || 0
    })
  }
  normalPaos.forEach(add)
  ebillPaos.forEach(add)
  return Object.values(map)
}

// Custom tooltip showing count + % per bucket
function DelayTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const total = payload[0]?.payload?._total ?? 0
  return (
    <div style={{ ...TT, padding: '10px 12px', minWidth: 200 }}>
      <p className="font-body text-xs font-semibold text-slate-300 mb-2 truncate max-w-[220px]">{label}</p>
      <p className="font-mono text-xs text-slate-500 mb-2">Total bills: {fmt(total)}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-6 text-xs font-mono">
          <span style={{ color: p.fill }}>{p.dataKey}</span>
          <span className="text-slate-300">
            {fmt(p.payload[`_cnt_${p.dataKey}`])} bills &nbsp;({p.value}%)
          </span>
        </div>
      ))}
    </div>
  )
}

function DelayChart({ paos }) {
  const barData = useMemo(() => {
    if (!paos.length) return []
    return [...paos]
      .filter(p => (p.total_bills_token || 0) > 0)
      .map(p => {
        const total = p.total_bills_token || 0
        const entry = { pao: short(p.pao), _total: total }
        BUCKET_COLS.forEach(b => {
          const cnt = p[`${b.key}_bills`] || 0
          entry[b.label]             = pct(cnt, total)
          entry[`_cnt_${b.label}`]   = cnt
        })
        return entry
      })
      .sort((a, b) => (b['T0'] || 0) - (a['T0'] || 0))
  }, [paos])

  if (!barData.length) return (
    <p className="text-slate-600 text-sm text-center py-8">No data for this selection</p>
  )

  return (
    <ResponsiveContainer width="100%" height={Math.max(260, barData.length * 34)}>
      <BarChart data={barData} layout="vertical" margin={{ top: 4, right: 20, bottom: 0, left: 230 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1A2A40" horizontal={false} />
        <XAxis type="number" tickFormatter={v => `${v}%`} tick={{ fill: '#7A8FA8', fontSize: 11 }}
          axisLine={false} tickLine={false} domain={[0, 100]} />
        <YAxis dataKey="pao" type="category" tick={{ fill: '#B8C8DC', fontSize: 10 }}
          axisLine={false} tickLine={false} width={230} />
        <Tooltip content={<DelayTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#7A8FA8' }}
          formatter={(val) => {
            const b = BUCKET_COLS.find(b => b.label === val)
            return b ? `${val} (${b.desc})` : val
          }} />
        {BUCKET_COLS.map(b => (
          <Bar key={b.key} dataKey={b.label} fill={b.color} stackId="a" isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────
export default function BillDashboard({ data }) {
  const weeks = useMemo(() => data?.weeks ?? [], [data])

  // Month list derived from week periods
  const months = useMemo(() => {
    const seen = new Set()
    const out = []
    ;[...weeks].reverse().forEach(w => {
      const m = getMonth(w.period)
      if (!seen.has(m)) { seen.add(m); out.push(m) }
    })
    return out
  }, [weeks])

  const [selMonth, setSelMonth] = useState(() => months[0] ?? '')
  const [delayTab, setDelayTab]  = useState('total')

  // Filter weeks to selected month
  const monthWeeks = useMemo(
    () => [...weeks].reverse().filter(w => getMonth(w.period) === selMonth),
    [weeks, selMonth]
  )

  const weekLabels = useMemo(() => monthWeeks.map(w => w.period), [monthWeeks])
  const [selWeek, setSelWeek] = useState(() => weekLabels[0] ?? '')

  // Reset week when month changes
  const handleMonthChange = (m) => {
    setSelMonth(m)
    const newWeeks = [...weeks].reverse().filter(w => getMonth(w.period) === m)
    setSelWeek(newWeeks[0]?.period ?? '')
  }

  const week = useMemo(() => weeks.find(w => w.period === selWeek), [weeks, selWeek])

  // ── EBM aggregates ──────────────────────────────────────────────────────
  const ebmPaos = week?.ebm?.paos ?? []
  const totals  = useMemo(() => {
    const totalBills  = ebmPaos.reduce((s, p) => s + (p.total_bills  ?? 0), 0)
    const totalAmount = ebmPaos.reduce((s, p) => s + (p.total_amount ?? 0), 0)
    const normalBills  = ebmPaos.reduce((s, p) => s + (p.normal_bills  ?? 0), 0)
    const normalAmount = ebmPaos.reduce((s, p) => s + (p.normal_amount ?? 0), 0)
    const ebillCount  = ebmPaos.reduce((s, p) => s + (p.ebill_count  ?? 0), 0)
    const ebillAmount = ebmPaos.reduce((s, p) => s + (p.ebill_amount ?? 0), 0)
    return {
      totalBills, totalAmount,
      normalBills, normalAmount,
      ebillCount, ebillAmount,
      normalBillPct:  pct(normalBills, totalBills),
      normalAmtPct:   pct(normalAmount, totalAmount),
      ebillBillPct:   pct(ebillCount, totalBills),
      ebillAmtPct:    pct(ebillAmount, totalAmount),
    }
  }, [ebmPaos])

  // ── Delay PAOs by tab ───────────────────────────────────────────────────
  const normalDelayPaos = week?.delay_normal?.paos ?? []
  const ebillDelayPaos  = week?.delay_ebill?.paos  ?? []
  const totalDelayPaos  = useMemo(
    () => combineDelayPaos(normalDelayPaos, ebillDelayPaos),
    [normalDelayPaos, ebillDelayPaos]
  )

  const activePaos = delayTab === 'total'  ? totalDelayPaos
                   : delayTab === 'normal' ? normalDelayPaos
                   : ebillDelayPaos

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono uppercase tracking-wide">Month</span>
          <select
            value={selMonth}
            onChange={e => handleMonthChange(e.target.value)}
            className="bg-navy-600 border border-navy-400 text-slate-100 text-sm rounded px-3 py-1.5 font-body outline-none"
          >
            {months.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono uppercase tracking-wide">Week</span>
          <select
            value={selWeek}
            onChange={e => setSelWeek(e.target.value)}
            className="bg-navy-600 border border-navy-400 text-slate-100 text-sm rounded px-3 py-1.5 font-body outline-none"
          >
            {weekLabels.map(w => <option key={w}>{w}</option>)}
          </select>
        </div>
      </div>

      {/* ── Summary cards ───────────────────────────────────────────────── */}
      <div className="flex gap-4">
        <SummaryCard
          label="Total Bills"
          count={totals.totalBills}
          amount={totals.totalAmount}
          accent={BLUE}
        />
        <SummaryCard
          label="Normal Bills"
          count={totals.normalBills}
          amount={totals.normalAmount}
          countPct={totals.normalBillPct}
          amountPct={totals.normalAmtPct}
          accent={AMBER}
        />
        <SummaryCard
          label="E-Bills"
          count={totals.ebillCount}
          amount={totals.ebillAmount}
          countPct={totals.ebillBillPct}
          amountPct={totals.ebillAmtPct}
          accent={GREEN}
        />
      </div>

      {/* ── Delay distribution ──────────────────────────────────────────── */}
      <div className="chart-card">
        <div className="flex items-center justify-between mb-4">
          <div className="section-heading mb-0">
            <span className="section-label">Delay Bucket Distribution by PAO (% of bills)</span>
          </div>
          <div className="flex gap-2">
            {[
              { key: 'total',  label: 'Total' },
              { key: 'normal', label: 'Normal Bills' },
              { key: 'ebill',  label: 'E-Bills' },
            ].map(t => (
              <button key={t.key} onClick={() => setDelayTab(t.key)}
                className="px-3 py-1 rounded text-xs font-display font-semibold tracking-wide transition-all border"
                style={{
                  borderColor: AMBER,
                  background: delayTab === t.key ? AMBER : 'transparent',
                  color: delayTab === t.key ? '#0A1628' : AMBER,
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <DelayChart paos={activePaos} />
      </div>

    </div>
  )
}
