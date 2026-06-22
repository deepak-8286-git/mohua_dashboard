import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell,
} from 'recharts'

const AMBER   = '#E8813A'
const GREEN   = '#38B089'
const BLUE    = '#4F9CF9'
const RED     = '#D94F3D'
const TT      = { backgroundColor: '#12202F', border: '1px solid #1A2A40', borderRadius: 4, fontSize: 12 }

const BUCKET_COLS = [
  { key: 'T0',     label: 'T0',   color: '#38B089', desc: 'Same-day (best)' },
  { key: 'T1',     label: 'T1',   color: '#4F9CF9', desc: '1-2 days' },
  { key: 'T2',     label: 'T2',   color: '#B8C8DC', desc: '3-5 days' },
  { key: 'T3',     label: 'T3',   color: '#E8813A', desc: '6-10 days' },
  { key: 'T4',     label: 'T4',   color: '#F5A623', desc: '11-30 days' },
  { key: 'T5',     label: 'T5',   color: '#D94F3D', desc: '31-60 days' },
  { key: 'T5Plus', label: 'T5+',  color: '#7B1C1C', desc: '60+ days (critical)' },
]

function pct(n, d) { return d > 0 ? +(n / d * 100).toFixed(1) : 0 }
function short(name) { return name?.replace(/\bMinistry\b.*/, '').trim().slice(0, 32) ?? '' }

function SectionHeading({ children }) {
  return (
    <div className="section-heading mb-3">
      <span className="section-label">{children}</span>
    </div>
  )
}

function KpiCard({ label, value, sub, accent }) {
  return (
    <div className="kpi-card" style={{ borderColor: accent }}>
      <p className="font-body text-xs font-semibold tracking-widest uppercase text-slate-500 mb-1">{label}</p>
      <p className="font-display text-3xl font-bold leading-none mb-1" style={{ color: accent }}>{value}</p>
      <p className="font-body text-xs text-slate-700">{sub}</p>
    </div>
  )
}

// ── Performance scoring ─────────────────────────────────────────────────────
function score(pao) {
  const token = pao.total_bills_token || 0
  if (!token) return 0
  const t0  = pao.T0_bills  || 0
  const t4  = pao.T4_bills  || 0
  const t5  = pao.T5_bills  || 0
  const t5p = pao.T5Plus_bills || 0
  // +1 point per % of T0, -0.5 per % of T4+
  const t0Rate   = pct(t0, token)
  const lateRate = pct(t4 + t5 + t5p, token)
  return +(t0Rate - lateRate * 0.5).toFixed(1)
}

function perfLabel(s) {
  if (s >= 70)  return { text: 'Excellent', color: '#38B089' }
  if (s >= 40)  return { text: 'Good',      color: '#4F9CF9' }
  if (s >= 10)  return { text: 'Moderate',  color: '#E8813A' }
  return               { text: 'Poor',      color: '#D94F3D' }
}

// ── Sub-component: PAO Performance Leaderboard ─────────────────────────────
function PaoLeaderboard({ paos, type }) {
  const scored = useMemo(() => {
    return paos
      .filter(p => p.total_bills_token > 0)
      .map(p => {
        const token   = p.total_bills_token
        const t0Rate  = pct(p.T0_bills, token)
        const lateRate = pct((p.T4_bills||0) + (p.T5_bills||0) + (p.T5Plus_bills||0), token)
        const closeRate = pct(p.closed, token)
        const s = score(p)
        const perf = perfLabel(s)
        return { ...p, t0Rate, lateRate, closeRate, score: s, perf }
      })
      .sort((a, b) => b.score - a.score)
  }, [paos])

  return (
    <div className="overflow-x-auto rounded border border-navy-400">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-navy-400 bg-navy-800">
            <th className="px-3 py-2 text-left text-slate-500 uppercase tracking-wide w-6">#</th>
            <th className="px-3 py-2 text-left text-slate-500 uppercase tracking-wide">PAO</th>
            <th className="px-3 py-2 text-right text-slate-500 uppercase tracking-wide">Token</th>
            <th className="px-3 py-2 text-right text-slate-500 uppercase tracking-wide">Closed</th>
            <th className="px-3 py-2 text-right text-green-400 uppercase tracking-wide">T0 %</th>
            <th className="px-3 py-2 text-right text-red-400 uppercase tracking-wide">T4+ %</th>
            <th className="px-3 py-2 text-right text-slate-500 uppercase tracking-wide">Close %</th>
            <th className="px-3 py-2 text-center text-slate-500 uppercase tracking-wide">Rating</th>
          </tr>
        </thead>
        <tbody>
          {scored.map((p, i) => (
            <tr key={p.pao_code} className="border-b border-navy-400 hover:bg-navy-600 transition-colors">
              <td className="px-3 py-2 font-mono text-slate-600 text-center">{i + 1}</td>
              <td className="px-3 py-2 text-slate-200 max-w-[280px]">
                <span className="block truncate" title={p.pao}>{p.pao}</span>
                <span className="text-slate-600 font-mono">{p.pao_code}</span>
              </td>
              <td className="px-3 py-2 text-right font-mono text-slate-400">{p.total_bills_token}</td>
              <td className="px-3 py-2 text-right font-mono text-slate-400">{p.closed}</td>
              <td className="px-3 py-2 text-right font-mono font-semibold" style={{ color: GREEN }}>{p.t0Rate}%</td>
              <td className="px-3 py-2 text-right font-mono" style={{ color: p.lateRate > 10 ? RED : '#5A7090' }}>{p.lateRate}%</td>
              <td className="px-3 py-2 text-right font-mono text-slate-400">{p.closeRate}%</td>
              <td className="px-3 py-2 text-center">
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ color: p.perf.color, background: p.perf.color + '22' }}>
                  {p.perf.text}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Sub-component: Delay Distribution Chart ─────────────────────────────────
function DelayDistribution({ paos }) {
  const barData = useMemo(() =>
    paos
      .filter(p => p.total_bills_token > 0)
      .map(p => {
        const token = p.total_bills_token
        const entry = { pao: short(p.pao) }
        BUCKET_COLS.forEach(b => { entry[b.label] = pct(p[`${b.key}_bills`] || 0, token) })
        return entry
      })
      .sort((a, b) => (b['T0'] || 0) - (a['T0'] || 0)),
  [paos])

  if (!barData.length) return null

  return (
    <div className="chart-card">
      <SectionHeading>Delay Bucket Distribution by PAO (% of bills)</SectionHeading>
      <ResponsiveContainer width="100%" height={Math.max(250, barData.length * 32)}>
        <BarChart data={barData} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 220 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1A2A40" horizontal={false} />
          <XAxis type="number" tickFormatter={v => `${v}%`} tick={{ fill: '#7A8FA8', fontSize: 11 }}
            axisLine={false} tickLine={false} domain={[0, 100]} />
          <YAxis dataKey="pao" type="category" tick={{ fill: '#B8C8DC', fontSize: 10 }}
            axisLine={false} tickLine={false} width={220} />
          <Tooltip contentStyle={TT} formatter={(v, n) => [`${v}%`, n]} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#7A8FA8' }} />
          {BUCKET_COLS.map(b => (
            <Bar key={b.key} dataKey={b.label} name={`${b.label} (${b.desc})`}
              fill={b.color} stackId="a" isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Sub-component: T0 Rate Trend ─────────────────────────────────────────────
function T0Trend({ weeks, type }) {
  const data = useMemo(() => weeks.map(w => {
    const paos = (type === 'normal' ? w.delay_normal : w.delay_ebill)?.paos ?? []
    const totalToken = paos.reduce((s, p) => s + (p.total_bills_token || 0), 0)
    const totalT0    = paos.reduce((s, p) => s + (p.T0_bills || 0), 0)
    const totalLate  = paos.reduce((s, p) => s + ((p.T4_bills||0) + (p.T5_bills||0) + (p.T5Plus_bills||0)), 0)
    return {
      week: w.period.split(',')[0].replace('April ', 'Apr ').replace('May ', 'May '),
      'T0 %': pct(totalT0, totalToken),
      'T4+ %': pct(totalLate, totalToken),
    }
  }), [weeks, type])

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 30, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1A2A40" />
        <XAxis dataKey="week" tick={{ fill: '#7A8FA8', fontSize: 9 }} angle={-35} textAnchor="end"
          axisLine={false} tickLine={false} />
        <YAxis tickFormatter={v => `${v}%`} tick={{ fill: '#7A8FA8', fontSize: 11 }}
          axisLine={false} tickLine={false} />
        <Tooltip contentStyle={TT} formatter={v => `${v}%`} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#7A8FA8' }} />
        <Line type="monotone" dataKey="T0 %" stroke={GREEN} strokeWidth={2.5}
          dot={{ r: 4, fill: GREEN, stroke: '#111C2D', strokeWidth: 2 }} />
        <Line type="monotone" dataKey="T4+ %" stroke={RED} strokeWidth={2} strokeDasharray="4 3"
          dot={{ r: 4, fill: RED, stroke: '#111C2D', strokeWidth: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function BillDashboard({ data }) {
  const weeks = useMemo(() => data?.weeks ?? [], [data])
  const weekLabels = useMemo(() => weeks.map(w => w.period), [weeks])
  const [selWeek, setSelWeek] = useState(weekLabels[weekLabels.length - 1] ?? '')
  const [delayTab, setDelayTab] = useState('normal')

  const week = useMemo(() => weeks.find(w => w.period === selWeek), [weeks, selWeek])

  // ── EBM aggregates ────────────────────────────────────────────────────────
  const ebmPaos   = week?.ebm?.paos ?? []
  const ebmTotals = useMemo(() => ({
    totalBills:  ebmPaos.reduce((s, p) => s + (p.total_bills  ?? 0), 0),
    ebillCount:  ebmPaos.reduce((s, p) => s + (p.ebill_count  ?? 0), 0),
    totalAmount: ebmPaos.reduce((s, p) => s + (p.total_amount ?? 0), 0),
    ebillAmount: ebmPaos.reduce((s, p) => s + (p.ebill_amount ?? 0), 0),
  }), [ebmPaos])
  const ebillPctCount  = pct(ebmTotals.ebillCount,  ebmTotals.totalBills)
  const ebillPctAmount = pct(ebmTotals.ebillAmount, ebmTotals.totalAmount)

  const ebmBarData = useMemo(() =>
    [...ebmPaos]
      .sort((a, b) => (b.pct_ebill_count ?? 0) - (a.pct_ebill_count ?? 0))
      .map(p => ({
        name:           short(p.pao_name),
        'Normal Bills': p.normal_bills  ?? 0,
        'E-Bills':      p.ebill_count   ?? 0,
        'E-Bill %':     p.pct_ebill_count ?? 0,
      })),
  [ebmPaos])

  const ebmTrend = useMemo(() => weeks.map(w => {
    const paos  = w.ebm?.paos ?? []
    const total = paos.reduce((s, p) => s + (p.total_bills ?? 0), 0)
    const ebill = paos.reduce((s, p) => s + (p.ebill_count ?? 0), 0)
    return {
      week: w.period.split(',')[0].replace('April ', 'Apr ').replace('May ', 'May '),
      'E-Bill %': pct(ebill, total),
    }
  }), [weeks])

  // ── Delay aggregates ──────────────────────────────────────────────────────
  const delayData  = delayTab === 'normal' ? week?.delay_normal : week?.delay_ebill
  const delayPaos  = delayData?.paos ?? []
  const delayTotals = useMemo(() => {
    const token  = delayPaos.reduce((s, p) => s + (p.total_bills_token ?? 0), 0)
    const closed = delayPaos.reduce((s, p) => s + (p.closed  ?? 0), 0)
    const t0     = delayPaos.reduce((s, p) => s + (p.T0_bills ?? 0), 0)
    const late   = delayPaos.reduce((s, p) => s + ((p.T4_bills||0) + (p.T5_bills||0) + (p.T5Plus_bills||0)), 0)
    const t5p    = delayPaos.reduce((s, p) => s + (p.T5Plus_bills ?? 0), 0)
    return { token, closed, t0, late, t5p,
      t0Rate:    pct(t0, token),
      lateRate:  pct(late, token),
      closeRate: pct(closed, token) }
  }, [delayPaos])

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8">

      {/* Week selector */}
      <div className="flex items-center gap-4">
        <select
          value={selWeek}
          onChange={e => setSelWeek(e.target.value)}
          className="bg-navy-600 border border-navy-400 text-slate-100 text-sm rounded px-3 py-1.5 font-body outline-none"
        >
          {[...weekLabels].reverse().map(w => <option key={w}>{w}</option>)}
        </select>
        <span className="text-xs text-slate-600 font-mono">
          Period: {week?.ebm?.period ?? week?.delay_normal?.period ?? selWeek}
        </span>
      </div>

      {/* ─── E-Bill Adoption ─────────────────────────────────────────────── */}
      <section>
        <SectionHeading>E-Bill Adoption (EBM-01)</SectionHeading>

        <div className="grid grid-cols-4 gap-3 mb-5">
          <KpiCard label="Total Bills"       value={ebmTotals.totalBills.toLocaleString()} sub="Normal + E-Bill" accent={BLUE} />
          <KpiCard label="E-Bills"           value={ebmTotals.ebillCount.toLocaleString()} sub="Electronic bills" accent={GREEN} />
          <KpiCard label="E-Bill % (Count)"  value={`${ebillPctCount}%`}  sub="Share of bill count" accent={AMBER} />
          <KpiCard label="E-Bill % (Amount)" value={`${ebillPctAmount}%`} sub="Share of bill amount" accent={AMBER} />
        </div>

        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-3 chart-card">
            <p className="section-label mb-3">PAO-wise E-Bill % (sorted by adoption)</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ebmBarData} margin={{ top: 4, right: 32, bottom: 20, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A2A40" />
                <XAxis dataKey="name" tick={{ fill: '#B8C8DC', fontSize: 9 }} angle={-35}
                  textAnchor="end" axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fill: '#7A8FA8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#7A8FA8' }} />
                <Bar dataKey="Normal Bills" fill="#2B4069" stackId="a" />
                <Bar dataKey="E-Bills" fill={GREEN} stackId="a" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="col-span-2 chart-card">
            <p className="section-label mb-3">E-Bill % Trend (week-on-week)</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={ebmTrend} margin={{ top: 8, right: 16, bottom: 30, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A2A40" />
                <XAxis dataKey="week" tick={{ fill: '#7A8FA8', fontSize: 9 }} angle={-35}
                  textAnchor="end" axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fill: '#7A8FA8', fontSize: 11 }}
                  axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} formatter={v => `${v}%`} />
                <Line type="monotone" dataKey="E-Bill %" stroke={GREEN} strokeWidth={2.5}
                  dot={{ r: 5, fill: GREEN, strokeWidth: 2, stroke: '#111C2D' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ─── PAO Delay Aging ─────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <SectionHeading>PAO Delay Aging & Performance (TM-02)</SectionHeading>
          <div className="flex gap-2">
            {['normal', 'ebill'].map(t => (
              <button key={t} onClick={() => setDelayTab(t)}
                className="px-4 py-1.5 rounded text-xs font-display font-semibold tracking-wide transition-all border"
                style={{
                  borderColor: AMBER,
                  background: delayTab === t ? AMBER : 'transparent',
                  color: delayTab === t ? '#0A1628' : AMBER,
                }}>
                {t === 'normal' ? 'Normal Bills' : 'E-Bills'}
              </button>
            ))}
          </div>
        </div>

        {/* Aggregate KPIs */}
        <div className="grid grid-cols-5 gap-3 mb-5">
          <KpiCard label="Total Token"   value={delayTotals.token.toLocaleString()} sub="Bills in system" accent={BLUE} />
          <KpiCard label="Closed"        value={delayTotals.closed.toLocaleString()} sub={`${delayTotals.closeRate}% close rate`} accent={GREEN} />
          <KpiCard label="T0 (Same-day)" value={`${delayTotals.t0Rate}%`} sub={`${delayTotals.t0} bills settled same-day`} accent={GREEN} />
          <KpiCard label="T4+ (Delayed)" value={`${delayTotals.lateRate}%`} sub="Cleared after 10 days" accent={delayTotals.lateRate > 10 ? RED : AMBER} />
          <KpiCard label="T5+ Critical"  value={delayTotals.t5p.toLocaleString()} sub="Delayed 60+ days" accent={RED} />
        </div>

        {/* Trend + Distribution grid */}
        <div className="grid grid-cols-5 gap-4 mb-5">
          <div className="col-span-2 chart-card">
            <p className="section-label mb-3">T0 vs T4+ Rate — Week Trend</p>
            <T0Trend weeks={weeks} type={delayTab} />
            <p className="text-xs text-slate-600 mt-1">
              Green = same-day closure · Dashed red = delayed 10d+
            </p>
          </div>
          <div className="col-span-3">
            <DelayDistribution paos={delayPaos} />
          </div>
        </div>

        {/* PAO Leaderboard */}
        <div>
          <p className="section-label mb-2">
            PAO Performance Ranking
            <span className="ml-2 text-slate-600 font-normal lowercase">
              — ranked by T0 closure rate minus penalty for late bills
            </span>
          </p>
          <PaoLeaderboard paos={delayPaos} type={delayTab} />
          <div className="flex gap-6 mt-3 text-xs text-slate-600">
            {[
              { text: 'Excellent', color: '#38B089', cond: 'Score ≥ 70' },
              { text: 'Good',      color: '#4F9CF9', cond: 'Score 40–70' },
              { text: 'Moderate',  color: '#E8813A', cond: 'Score 10–40' },
              { text: 'Poor',      color: '#D94F3D', cond: 'Score < 10' },
            ].map(r => (
              <span key={r.text} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                <span style={{ color: r.color }}>{r.text}</span>
                <span className="text-slate-700">{r.cond}</span>
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
