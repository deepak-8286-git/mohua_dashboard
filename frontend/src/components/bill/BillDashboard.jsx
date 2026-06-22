import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts'

const AMBER = '#E8813A'
const GREEN = '#38B089'
const BLUE  = '#4F9CF9'
const RED   = '#D94F3D'
const MUTED = '#2B4069'
const TT    = { backgroundColor: '#12202F', border: '1px solid #1A2A40', borderRadius: 4, fontSize: 12 }

const BUCKET_COLS = [
  { key: 'T0',     label: 'T0',   color: '#38B089', desc: 'Same-day' },
  { key: 'T1',     label: 'T1',   color: '#4F9CF9', desc: '1-2 days' },
  { key: 'T2',     label: 'T2',   color: '#B8C8DC', desc: '3-5 days' },
  { key: 'T3',     label: 'T3',   color: '#E8813A', desc: '6-10 days' },
  { key: 'T4',     label: 'T4',   color: '#F5A623', desc: '11-30 days' },
  { key: 'T5',     label: 'T5',   color: '#D94F3D', desc: '31-60 days' },
  { key: 'T5Plus', label: 'T5+',  color: '#7B1C1C', desc: '60+ days' },
]

const STATUS_COLORS = {
  Closed:    '#38B089',
  Pending:   '#E8813A',
  Cancelled: '#4F9CF9',
  Returned:  '#D94F3D',
}

const ALL_WEEKS = '__all__'

function pct(n, d) { return d > 0 ? +(n / d * 100).toFixed(1) : 0 }
function fmt(n)    { return n != null ? n.toLocaleString('en-IN') : '—' }
function fmtAmt(n) {
  if (n == null) return '—'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  return `₹${n.toLocaleString('en-IN')}`
}
function short(name, len = 34) { return name?.slice(0, len) ?? '' }
function shortWeek(period) {
  return period?.replace(/,?\s*\d{4}/, '').replace('April', 'Apr').replace('May', 'May').trim() ?? ''
}

function getMonth(period) {
  const m = period?.match(/^([A-Za-z]+)\s+[\d\s–\-]+,?\s*(\d{4})/)
  return m ? `${m[1]} ${m[2]}` : (period?.split(' ')[0] ?? '')
}

// ── Aggregation helpers ───────────────────────────────────────────────────

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
      if (!map[key]) map[key] = { pao_name: p.pao_name, pao_code: p.pao_code,
                                   total_bills: 0, normal_bills: 0, ebill_count: 0 }
      map[key].total_bills  += p.total_bills  ?? 0
      map[key].normal_bills += p.normal_bills ?? 0
      map[key].ebill_count  += p.ebill_count  ?? 0
    }
  }
  return Object.values(map)
    .filter(p => p.total_bills > 0)
    .map(p => ({ ...p, ebill_pct: pct(p.ebill_count, p.total_bills) }))
    .sort((a, b) => b.ebill_pct - a.ebill_pct)
}

function aggregateDelayPaos(weeksList, type) {
  const map = {}
  for (const w of weeksList) {
    const paos = (type === 'normal' ? w.delay_normal : w.delay_ebill)?.paos ?? []
    for (const p of paos) {
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
  }
  return Object.values(map)
}

function aggregateStatus(weeksList) {
  let closed = 0, pending = 0, cancelled = 0, returned = 0
  for (const w of weeksList) {
    for (const p of [...(w.delay_normal?.paos ?? []), ...(w.delay_ebill?.paos ?? [])]) {
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
      map[key] = { pao: p.pao, pao_code: p.pao_code, total_bills_token: 0 }
      BUCKET_COLS.forEach(b => { map[key][`${b.key}_bills`] = 0 })
    }
    map[key].total_bills_token += p.total_bills_token || 0
    BUCKET_COLS.forEach(b => { map[key][`${b.key}_bills`] += p[`${b.key}_bills`] || 0 })
  }
  normalPaos.forEach(add); ebillPaos.forEach(add)
  return Object.values(map)
}

// ── Summary card ──────────────────────────────────────────────────────────
function SummaryCard({ label, count, amount, countPct, amountPct, accent }) {
  return (
    <div className="kpi-card flex-1" style={{ borderColor: accent }}>
      <p className="font-body text-xs font-semibold tracking-widest uppercase text-slate-500 mb-3">{label}</p>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display text-2xl font-bold leading-none" style={{ color: accent }}>
            {fmt(count)}
          </span>
          {countPct != null && (
            <span className="font-mono text-xs text-slate-500 shrink-0">{countPct}% of bills</span>
          )}
        </div>
        <div className="flex items-baseline justify-between border-t border-navy-400 pt-2 gap-2">
          <span className="font-mono text-sm text-slate-300">{fmtAmt(amount)}</span>
          {amountPct != null && (
            <span className="font-mono text-xs text-slate-500 shrink-0">{amountPct}% of amt</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Chart 1: E-Bill Adoption by PAO ──────────────────────────────────────
function EbillAdoptionChart({ paos }) {
  if (!paos.length) return <p className="text-slate-600 text-sm text-center py-8">No data</p>

  const barData = paos.map(p => ({
    name:     short(p.pao_name, 32),
    Normal:   p.normal_bills,
    'E-Bill': p.ebill_count,
    _pct:     p.ebill_pct,
    _total:   p.total_bills,
  }))

  const CustomTick = ({ x, y, payload }) => (
    <text x={x} y={y} dy={4} textAnchor="end" fill="#B8C8DC" fontSize={10}>{payload.value}</text>
  )

  return (
    <ResponsiveContainer width="100%" height={Math.max(240, barData.length * 30)}>
      <BarChart data={barData} layout="vertical" margin={{ top: 4, right: 60, bottom: 0, left: 210 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1A2A40" horizontal={false} />
        <XAxis type="number" tick={{ fill: '#7A8FA8', fontSize: 11 }}
          axisLine={false} tickLine={false} />
        <YAxis dataKey="name" type="category" tick={<CustomTick />}
          axisLine={false} tickLine={false} width={210} />
        <Tooltip
          contentStyle={TT}
          formatter={(val, name, props) => [
            `${fmt(val)} bills`,
            name,
          ]}
          labelFormatter={(label, payload) => {
            const p = payload?.[0]?.payload
            return `${label}  —  E-Bill: ${p?._pct ?? 0}%  |  Total: ${fmt(p?._total)}`
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#7A8FA8' }} />
        <Bar dataKey="Normal"   fill={MUTED} stackId="a" isAnimationActive={false} />
        <Bar dataKey="E-Bill"   fill={GREEN} stackId="a" isAnimationActive={false}
          label={{ position: 'right', formatter: (_, entry) => `${entry?.['_pct'] ?? ''}%`,
                   fill: '#7A8FA8', fontSize: 10 }}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Chart 2: Bill Status Donut ────────────────────────────────────────────
const RADIAN = Math.PI / 180
function renderDonutLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) {
  if (percent < 0.04) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.6
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {(percent * 100).toFixed(1)}%
    </text>
  )
}

function StatusDonut({ status }) {
  const data = [
    { name: 'Closed',    value: status.closed,    color: STATUS_COLORS.Closed },
    { name: 'Pending',   value: status.pending,   color: STATUS_COLORS.Pending },
    { name: 'Cancelled', value: status.cancelled, color: STATUS_COLORS.Cancelled },
    { name: 'Returned',  value: status.returned,  color: STATUS_COLORS.Returned },
  ].filter(d => d.value > 0)

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={58} outerRadius={90}
            dataKey="value" labelLine={false} label={renderDonutLabel}>
            {data.map(d => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip contentStyle={TT}
            formatter={(val, name) => [`${fmt(val)} bills (${pct(val, total)}%)`, name]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-1 w-full px-4">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="font-body text-xs text-slate-400">{d.name}</span>
            <span className="font-mono text-xs ml-auto" style={{ color: d.color }}>{fmt(d.value)}</span>
          </div>
        ))}
      </div>
      <p className="font-mono text-xs text-slate-600 mt-3">Total: {fmt(total)} bills</p>
    </div>
  )
}

// ── Chart 3: Week-on-week trend ───────────────────────────────────────────
function WeekTrend({ monthWeeks }) {
  const data = useMemo(() => monthWeeks.map(w => {
    const ebmPaos   = w.ebm?.paos ?? []
    const totalBills = ebmPaos.reduce((s, p) => s + (p.total_bills ?? 0), 0)
    const ebillCount = ebmPaos.reduce((s, p) => s + (p.ebill_count ?? 0), 0)

    const allDelay = [...(w.delay_normal?.paos ?? []), ...(w.delay_ebill?.paos ?? [])]
    const totalToken = allDelay.reduce((s, p) => s + (p.total_bills_token || 0), 0)
    const totalT0    = allDelay.reduce((s, p) => s + (p.T0_bills || 0), 0)

    return {
      week:       shortWeek(w.period),
      'E-Bill %': pct(ebillCount, totalBills),
      'T0 Rate %': pct(totalT0, totalToken),
    }
  }), [monthWeeks])

  if (data.length < 2) return (
    <p className="text-slate-600 text-sm text-center py-6">Need at least 2 weeks for trend</p>
  )

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1A2A40" />
        <XAxis dataKey="week" tick={{ fill: '#7A8FA8', fontSize: 11 }}
          axisLine={false} tickLine={false} />
        <YAxis tickFormatter={v => `${v}%`} tick={{ fill: '#7A8FA8', fontSize: 11 }}
          axisLine={false} tickLine={false} domain={[0, 100]} />
        <Tooltip contentStyle={TT} formatter={v => `${v}%`} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#7A8FA8' }} />
        <Line type="monotone" dataKey="E-Bill %"  stroke={GREEN} strokeWidth={2.5}
          dot={{ r: 5, fill: GREEN, stroke: '#111C2D', strokeWidth: 2 }} />
        <Line type="monotone" dataKey="T0 Rate %" stroke={BLUE}  strokeWidth={2.5}
          dot={{ r: 5, fill: BLUE, stroke: '#111C2D', strokeWidth: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Delay distribution ────────────────────────────────────────────────────
function DelayTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const total = payload[0]?.payload?._total ?? 0
  return (
    <div style={{ ...TT, padding: '10px 12px', minWidth: 210 }}>
      <p className="font-body text-xs font-semibold text-slate-300 mb-1 truncate max-w-[220px]">{label}</p>
      <p className="font-mono text-xs text-slate-500 mb-2">Total: {fmt(total)} bills</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4 text-xs font-mono leading-5">
          <span style={{ color: p.fill }}>{p.dataKey}</span>
          <span className="text-slate-300">
            {fmt(p.payload[`_cnt_${p.dataKey}`])} &nbsp;({p.value}%)
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
          entry[b.label]           = pct(cnt, total)
          entry[`_cnt_${b.label}`] = cnt
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
      <BarChart data={barData} layout="vertical" margin={{ top: 4, right: 20, bottom: 0, left: 240 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1A2A40" horizontal={false} />
        <XAxis type="number" tickFormatter={v => `${v}%`} tick={{ fill: '#7A8FA8', fontSize: 11 }}
          axisLine={false} tickLine={false} domain={[0, 100]} />
        <YAxis dataKey="pao" type="category" tick={{ fill: '#B8C8DC', fontSize: 10 }}
          axisLine={false} tickLine={false} width={240} />
        <Tooltip content={<DelayTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#7A8FA8' }}
          formatter={val => {
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

  const months = useMemo(() => {
    const seen = new Set(); const out = []
    ;[...weeks].reverse().forEach(w => {
      const m = getMonth(w.period)
      if (!seen.has(m)) { seen.add(m); out.push(m) }
    })
    return out
  }, [weeks])

  const [selMonth, setSelMonth] = useState(() => months[0] ?? '')
  const [selWeek,  setSelWeek]  = useState(ALL_WEEKS)
  const [delayTab, setDelayTab] = useState('total')

  const monthWeeks = useMemo(
    () => [...weeks].reverse().filter(w => getMonth(w.period) === selMonth),
    [weeks, selMonth]
  )

  const handleMonthChange = (m) => { setSelMonth(m); setSelWeek(ALL_WEEKS) }

  const activePeriod = useMemo(
    () => selWeek === ALL_WEEKS ? monthWeeks : monthWeeks.filter(w => w.period === selWeek),
    [monthWeeks, selWeek]
  )

  const isMonthView = selWeek === ALL_WEEKS

  // Summary card totals
  const totals = useMemo(() => {
    const r = aggregateEbm(activePeriod)
    return {
      ...r,
      normalBillPct: pct(r.normalBills, r.totalBills),
      normalAmtPct:  pct(r.normalAmount, r.totalAmount),
      ebillBillPct:  pct(r.ebillCount,  r.totalBills),
      ebillAmtPct:   pct(r.ebillAmount, r.totalAmount),
    }
  }, [activePeriod])

  // E-bill adoption per PAO
  const ebmPaos = useMemo(() => aggregateEbmPaos(activePeriod), [activePeriod])

  // Bill status breakdown
  const status = useMemo(() => aggregateStatus(activePeriod), [activePeriod])

  // Delay PAOs
  const normalDelayPaos = useMemo(() => aggregateDelayPaos(activePeriod, 'normal'), [activePeriod])
  const ebillDelayPaos  = useMemo(() => aggregateDelayPaos(activePeriod, 'ebill'),  [activePeriod])
  const totalDelayPaos  = useMemo(() => combinePaos(normalDelayPaos, ebillDelayPaos), [normalDelayPaos, ebillDelayPaos])

  const chartPaos = delayTab === 'total'  ? totalDelayPaos
                  : delayTab === 'normal' ? normalDelayPaos
                  : ebillDelayPaos

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono uppercase tracking-wide">Month</span>
          <select value={selMonth} onChange={e => handleMonthChange(e.target.value)}
            className="bg-navy-600 border border-navy-400 text-slate-100 text-sm rounded px-3 py-1.5 font-body outline-none">
            {months.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono uppercase tracking-wide">Week</span>
          <select value={selWeek} onChange={e => setSelWeek(e.target.value)}
            className="bg-navy-600 border border-navy-400 text-slate-100 text-sm rounded px-3 py-1.5 font-body outline-none">
            <option value={ALL_WEEKS}>All weeks (month total)</option>
            {monthWeeks.map(w => <option key={w.period} value={w.period}>{w.period}</option>)}
          </select>
        </div>
        {isMonthView && (
          <span className="font-mono text-xs text-slate-600">
            Aggregated across {monthWeeks.length} week{monthWeeks.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Summary cards */}
      <div className="flex gap-4">
        <SummaryCard label="Total Bills"   count={totals.totalBills}  amount={totals.totalAmount}  accent={BLUE} />
        <SummaryCard label="Normal Bills"  count={totals.normalBills} amount={totals.normalAmount}
          countPct={totals.normalBillPct} amountPct={totals.normalAmtPct} accent={AMBER} />
        <SummaryCard label="E-Bills"       count={totals.ebillCount}  amount={totals.ebillAmount}
          countPct={totals.ebillBillPct}  amountPct={totals.ebillAmtPct}  accent={GREEN} />
      </div>

      {/* Row: E-Bill Adoption + Bill Status */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 chart-card">
          <div className="section-heading mb-3">
            <span className="section-label">E-Bill Adoption by PAO</span>
          </div>
          <EbillAdoptionChart paos={ebmPaos} />
        </div>
        <div className="col-span-2 chart-card">
          <div className="section-heading mb-3">
            <span className="section-label">Bill Status Breakdown</span>
          </div>
          <StatusDonut status={status} />
        </div>
      </div>

      {/* Week-on-week trend (month context, always shown) */}
      <div className="chart-card">
        <div className="flex items-center justify-between mb-3">
          <div className="section-heading mb-0">
            <span className="section-label">Week-on-week Trend — {selMonth}</span>
          </div>
          <span className="font-mono text-xs text-slate-600">E-Bill % &amp; T0 Rate %</span>
        </div>
        <WeekTrend monthWeeks={monthWeeks} />
      </div>

      {/* Delay distribution */}
      <div className="chart-card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
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
        <DelayChart paos={chartPaos} />
      </div>

    </div>
  )
}
