import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts'
import { ArrowUpRight, ArrowDownRight, TrendingUp, ShieldCheck, AlertCircle, Layers } from 'lucide-react'

const ZONE_COLORS = { NZ: '#38BDF8', SZ: '#FB923C', WZ: '#34D399', EZ: '#F87171' }
const ZONE_LABELS = { NZ: 'North Zone', SZ: 'South Zone', WZ: 'West Zone', EZ: 'East Zone' }
const ZONES = ['NZ', 'SZ', 'WZ', 'EZ']
const TT_STYLE = {
  backgroundColor: 'rgba(12, 23, 44, 0.95)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: 8,
  color: '#F8FAFC',
  backdropFilter: 'blur(8px)',
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
}

function fmt(n) { return n != null ? Number(n).toLocaleString('en-IN') : '—' }
function pct(settled, opening, raised) {
  const exp = (opening || 0) + (raised || 0)
  return exp > 0 ? ((settled || 0) / exp * 100) : 0
}

function SectionHeading({ title, icon: Icon, sub }) {
  return (
    <div className="section-heading">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className="text-[#F9A55A]" />}
        <span className="section-label">{title}</span>
      </div>
      {sub && <span className="text-[11px] font-mono text-slate-400">{sub}</span>}
    </div>
  )
}

function KpiCard({ label, value, sub, accent, extra, icon: Icon }) {
  return (
    <div className="kpi-card" style={{ '--kpi-accent': accent }}>
      <div className="flex items-center justify-between mb-1.5">
        <p className="font-mono text-[11px] font-bold tracking-wider uppercase text-slate-400">{label}</p>
        {Icon && <Icon size={16} style={{ color: accent }} />}
      </div>
      <p className="font-display text-3xl md:text-4xl font-bold leading-none mb-1 text-white drop-shadow-sm">{value}</p>
      <p className="font-body text-xs text-slate-400">{sub}</p>
      {extra}
    </div>
  )
}

export default function IAWDashboard({ data }) {
  const months = data?.months ?? []
  const monthNames = months.map(m => m.month)
  const [selMonth, setSelMonth] = useState(monthNames[monthNames.length - 1] ?? '')
  const [selZones, setSelZones] = useState(ZONES)

  const monthData = useMemo(() => months.find(m => m.month === selMonth), [months, selMonth])
  const prevMonth = useMemo(() => {
    const idx = monthNames.indexOf(selMonth)
    return idx > 0 ? months[idx - 1] : null
  }, [months, monthNames, selMonth])

  const zones = useMemo(
    () => (monthData?.zones ?? []).filter(z => selZones.includes(z.zone)),
    [monthData, selZones]
  )

  const totals = useMemo(() => ({
    opening: zones.reduce((s, z) => s + (z.opening || 0), 0),
    raised:  zones.reduce((s, z) => s + (z.raised  || 0), 0),
    settled: zones.reduce((s, z) => s + (z.settled || 0), 0),
    closing: zones.reduce((s, z) => s + (z.closing || 0), 0),
  }), [zones])

  const settlRate = pct(totals.settled, totals.opening, totals.raised)

  const prevClosing = useMemo(() => {
    if (!prevMonth) return null
    return prevMonth.zones.filter(z => selZones.includes(z.zone)).reduce((s, z) => s + (z.closing || 0), 0)
  }, [prevMonth, selZones])
  const delta = prevClosing != null ? totals.closing - prevClosing : null

  // Zone bar data
  const zoneBarData = zones.map(z => ({
    name: z.zone,
    Opening: z.opening || 0, Raised: z.raised || 0,
    Settled: z.settled || 0, Closing: z.closing || 0,
  }))

  // Donut data
  const donutData = zones.map(z => ({ name: ZONE_LABELS[z.zone], value: z.closing || 0, zone: z.zone }))

  // Office bar
  const officeMap = {}
  zones.forEach(z => {
    (z.offices || []).forEach(o => {
      if (!o.closing) return
      if (!officeMap[o.office]) officeMap[o.office] = { office: o.office }
      officeMap[o.office][z.zone] = (officeMap[o.office][z.zone] || 0) + o.closing
    })
  })
  const officeData = Object.values(officeMap).sort((a, b) =>
    selZones.reduce((s, z) => s + (b[z] || 0), 0) - selZones.reduce((s, z) => s + (a[z] || 0), 0)
  )

  // Trend data
  const trendData = months.map(m => {
    const entry = { month: m.month }
    m.zones.filter(z => selZones.includes(z.zone)).forEach(z => { entry[z.zone] = z.closing || 0 })
    return entry
  })

  // Zone scorecards
  const zoneScorecards = zones.map(z => {
    const sr = pct(z.settled, z.opening, z.raised)
    const prevZ = prevMonth?.zones.find(pz => pz.zone === z.zone)
    const momDelta = prevZ ? (z.closing || 0) - (prevZ.closing || 0) : null
    const perf = sr >= 4 ? 'Efficient' : sr >= 1 ? 'Moderate' : 'Stagnant'
    const perfColor = sr >= 4 ? '#10B981' : sr >= 1 ? '#F59E0B' : '#F43F5E'
    return { ...z, sr, momDelta, perf, perfColor }
  })

  // Settlement efficiency across months
  const effData = months.map(m => {
    const entry = { month: m.month }
    m.zones.filter(z => selZones.includes(z.zone)).forEach(z => {
      entry[z.zone] = pct(z.settled, z.opening, z.raised)
    })
    return entry
  })

  // MoM net change
  const momData = []
  months.forEach(m => {
    m.zones.filter(z => selZones.includes(z.zone)).forEach(z => {
      momData.push({
        key: `${z.zone} · ${m.month}`,
        zone: z.zone,
        net: (z.closing || 0) - (z.opening || 0),
      })
    })
  })

  // Office detail table
  const tableRows = []
  zones.forEach(z => {
    ;(z.offices || []).forEach(o => {
      tableRows.push({
        zone: z.zone, office: o.office,
        opening: o.opening, raised: o.raised,
        settled: o.settled, closing: o.closing,
        net: (o.closing || 0) - (o.opening || 0),
      })
    })
  })
  tableRows.sort((a, b) => (b.closing || 0) - (a.closing || 0))

  const toggleZone = (z) =>
    setSelZones(prev => prev.includes(z) ? (prev.length > 1 ? prev.filter(x => x !== z) : prev) : [...prev, z])

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Controls Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 p-4 rounded-xl glass-card">
        <div className="flex items-center gap-3">
          <span className="filter-label">Audit Month:</span>
          <select
            value={selMonth}
            onChange={e => setSelMonth(e.target.value)}
            className="filter-select font-mono"
          >
            {[...monthNames].reverse().map(m => <option key={m}>{m}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="filter-label mr-1">Zone Filter:</span>
          {ZONES.map(z => {
            const active = selZones.includes(z)
            return (
              <button
                key={z}
                onClick={() => toggleZone(z)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer border"
                style={{
                  borderColor: ZONE_COLORS[z],
                  color: active ? '#0A1428' : ZONE_COLORS[z],
                  background: active ? ZONE_COLORS[z] : 'rgba(255,255,255,0.03)',
                  boxShadow: active ? `0 0 14px ${ZONE_COLORS[z]}55` : 'none',
                }}
              >
                {z} · {ZONE_LABELS[z].split(' ')[0]}
              </button>
            )
          })}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <KpiCard label="Opening Balance" value={fmt(totals.opening)} sub="Paras at start of month" accent="#38BDF8" icon={Layers} />
        <KpiCard label="Paras Raised"    value={fmt(totals.raised)}  sub="New paras logged this month" accent="#FB923C" icon={AlertCircle} />
        <KpiCard label="Paras Settled"   value={fmt(totals.settled)} sub="Successfully resolved"    accent="#10B981" icon={ShieldCheck} />
        <KpiCard
          label="Closing Balance" value={fmt(totals.closing)} sub="Outstanding at month-end" accent="#E2E8F0"
          extra={delta != null && (
            <div className={`flex items-center gap-1 text-xs mt-2 font-mono font-semibold ${delta > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {delta > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span>{fmt(Math.abs(delta))} vs {prevMonth?.month}</span>
            </div>
          )}
        />
        <KpiCard
          label="Settlement Rate" value={`${settlRate.toFixed(1)}%`} sub="Resolved vs total exposure" accent={settlRate >= 4 ? '#10B981' : '#F59E0B'} icon={TrendingUp}
          extra={
            <div className="mt-2.5 rounded-full h-1.5 bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(settlRate, 100)}%`, background: settlRate >= 4 ? '#10B981' : '#F59E0B' }} />
            </div>
          }
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 chart-card">
          <SectionHeading title="Outstanding Paras by Zone" icon={Layers} />
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={zoneBarData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8', paddingTop: 8 }} />
              <Bar dataKey="Opening" fill="#64748B" radius={[4,4,0,0]} />
              <Bar dataKey="Raised"  fill="#FB923C" radius={[4,4,0,0]} />
              <Bar dataKey="Settled" fill="#10B981" radius={[4,4,0,0]} />
              <Bar dataKey="Closing" fill="#38BDF8" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 chart-card">
          <SectionHeading title="Zone Share — Closing Paras" icon={TrendingUp} />
          <ResponsiveContainer width="100%" height={290}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={105}
                dataKey="value"
                label={({ name, percent }) => `${name.split(' ')[0]} ${(percent*100).toFixed(0)}%`}
                labelLine={false}
              >
                {donutData.map(d => <Cell key={d.zone} fill={ZONE_COLORS[d.zone]} stroke="#0F1D38" strokeWidth={2} />)}
              </Pie>
              <Tooltip contentStyle={TT_STYLE} formatter={v => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 chart-card">
          <SectionHeading title="Office-wise Outstanding Paras" icon={ShieldCheck} />
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={officeData} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 110 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="office" type="category" tick={{ fill: '#CBD5E1', fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip contentStyle={TT_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8', paddingTop: 6 }} />
              {selZones.map(z => <Bar key={z} dataKey={z} name={ZONE_LABELS[z]} fill={ZONE_COLORS[z]} stackId="a" radius={[0,2,2,0]} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 chart-card">
          <SectionHeading title="Month-on-Month Trend" icon={TrendingUp} />
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8', paddingTop: 6 }} />
              {selZones.map(z => (
                <Line key={z} type="monotone" dataKey={z} name={ZONE_LABELS[z]}
                  stroke={ZONE_COLORS[z]} strokeWidth={3} dot={{ r: 4, fill: ZONE_COLORS[z], strokeWidth: 2, stroke: '#0F1D38' }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Zone Performance Cards */}
      <div>
        <SectionHeading title="Zone Performance Analysis" icon={AlertCircle} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
          {zoneScorecards.map(z => (
            <div
              key={z.zone}
              className="kpi-card"
              style={{ '--kpi-accent': ZONE_COLORS[z.zone] }}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-mono font-bold tracking-wider text-sm" style={{ color: ZONE_COLORS[z.zone] }}>{z.zone} · {ZONE_LABELS[z.zone]}</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full" style={{ color: z.perfColor, background: z.perfColor + '22', border: `1px solid ${z.perfColor}44` }}>{z.perf}</span>
              </div>
              <p className="font-display text-3xl font-bold text-white mt-1">{fmt(z.closing)}</p>
              <p className="text-xs text-slate-400 mb-3">closing paras</p>
              
              <div className="flex justify-between text-xs mb-1 font-mono">
                <span className="text-slate-400">Settlement:</span>
                <span className="font-bold" style={{ color: ZONE_COLORS[z.zone] }}>{z.sr.toFixed(1)}%</span>
              </div>
              <div className="rounded-full h-1.5 bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(z.sr, 100)}%`, background: ZONE_COLORS[z.zone] }} />
              </div>
              {z.momDelta != null && (
                <p className={`text-xs mt-2.5 font-mono font-semibold flex items-center gap-1 ${z.momDelta > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {z.momDelta > 0 ? '▲ +' : '▼ -'}{fmt(Math.abs(z.momDelta))} vs {prevMonth?.month}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Efficiency + MoM Change */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
          <div className="lg:col-span-3 chart-card">
            <SectionHeading title="Settlement Efficiency by Zone (%)" icon={ShieldCheck} />
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={effData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT_STYLE} formatter={v => `${Number(v).toFixed(1)}%`} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8', paddingTop: 6 }} />
                {selZones.map(z => <Bar key={z} dataKey={z} name={ZONE_LABELS[z]} fill={ZONE_COLORS[z]} radius={[4,4,0,0]} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-2 chart-card">
            <SectionHeading title="Net Change by Zone & Month" icon={TrendingUp} />
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={momData} margin={{ top: 8, right: 8, bottom: 35, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="key" tick={{ fill: '#94A3B8', fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT_STYLE} />
                <Bar dataKey="net" radius={[4,4,0,0]} isAnimationActive={false}>
                  {momData.map((d, i) => <Cell key={i} fill={d.net > 0 ? '#F43F5E' : d.net < 0 ? '#10B981' : '#64748B'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[11px] font-mono mt-1 text-slate-400">Green = backlog decreasing · Rose = backlog expanding</p>
          </div>
        </div>
      </div>

      {/* Office Detail Table */}
      <div>
        <SectionHeading title="Paras Status — Detailed Office Breakdown" icon={Layers} />
        <div className="table-container">
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-[#0B152A] border-b border-white/10">
                <tr>
                  {['Zone','Office','Opening','Raised','Settled','Closing','Net Change'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-mono font-bold tracking-wider uppercase text-slate-300 text-[11px]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tableRows.map((r, i) => (
                  <tr
                    key={i}
                    className="hover:bg-white/[0.04] transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono font-bold" style={{ color: ZONE_COLORS[r.zone] }}>{r.zone}</td>
                    <td className="px-4 py-2.5 text-slate-200 font-medium">{r.office}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-400">{fmt(r.opening)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-amber-400">{fmt(r.raised)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{fmt(r.settled)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-white">{fmt(r.closing)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">
                      <span className={`px-2 py-0.5 rounded text-[11px] ${r.net > 0 ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' : r.net < 0 ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'text-slate-500'}`}>
                        {r.net > 0 ? '+' : ''}{fmt(r.net)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
