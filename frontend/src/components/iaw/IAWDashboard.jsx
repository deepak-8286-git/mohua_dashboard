import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter,
  CartesianGrid, LabelList,
} from 'recharts'

const ZONE_COLORS = { NZ: '#4F9CF9', SZ: '#E8813A', WZ: '#38B089', EZ: '#D94F3D' }
const ZONE_LABELS = { NZ: 'North Zone', SZ: 'South Zone', WZ: 'West Zone', EZ: 'East Zone' }
const ZONES = ['NZ', 'SZ', 'WZ', 'EZ']
const TT_STYLE = { backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 6, fontSize: 12 }

function fmt(n) { return n != null ? Number(n).toLocaleString() : '—' }
function pct(settled, opening, raised) {
  const exp = (opening || 0) + (raised || 0)
  return exp > 0 ? ((settled || 0) / exp * 100) : 0
}

function SectionHeading({ children }) {
  return (
    <div className="section-heading">
      <span className="section-label">{children}</span>
    </div>
  )
}

function KpiCard({ label, value, sub, accent, extra }) {
  return (
    <div className="kpi-card" style={{ borderColor: accent }}>
      <p className="font-body text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#64748B' }}>{label}</p>
      <p className="font-display text-4xl font-bold leading-none mb-1" style={{ color: accent }}>{value}</p>
      <p className="font-body text-xs" style={{ color: '#475569' }}>{sub}</p>
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
    const perfColor = sr >= 4 ? '#38B089' : sr >= 1 ? '#E8813A' : '#D94F3D'
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
        key: `${ZONE_LABELS[z.zone]}\n${m.month}`,
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
      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={selMonth}
          onChange={e => setSelMonth(e.target.value)}
          className="filter-select"
        >
          {[...monthNames].reverse().map(m => <option key={m}>{m}</option>)}
        </select>
        <div className="flex gap-2">
          {ZONES.map(z => (
            <button
              key={z}
              onClick={() => toggleZone(z)}
              className="px-3 py-1 rounded text-xs font-display font-semibold tracking-wide transition-all border"
              style={{
                borderColor: ZONE_COLORS[z],
                color: selZones.includes(z) ? '#FFFFFF' : ZONE_COLORS[z],
                background: selZones.includes(z) ? ZONE_COLORS[z] : 'transparent',
              }}
            >
              {z}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-5 gap-3">
        <KpiCard label="Opening Balance" value={fmt(totals.opening)} sub="Paras at start of month" accent="#4F9CF9" />
        <KpiCard label="Paras Raised"    value={fmt(totals.raised)}  sub="New paras this month"   accent="#E8813A" />
        <KpiCard label="Paras Settled"   value={fmt(totals.settled)} sub="Resolved this month"    accent="#38B089" />
        <KpiCard
          label="Closing Balance" value={fmt(totals.closing)} sub="Outstanding at month-end" accent="#334155"
          extra={delta != null && (
            <p className="text-xs mt-1.5 font-body" style={{ color: delta > 0 ? '#DC2626' : '#059669' }}>
              {delta > 0 ? '▲' : '▼'} {fmt(Math.abs(delta))} vs {prevMonth?.month}
            </p>
          )}
        />
        <KpiCard
          label="Settlement Rate" value={`${settlRate.toFixed(1)}%`} sub="Resolved vs exposure" accent={settlRate >= 4 ? '#059669' : '#E8813A'}
          extra={
            <div className="mt-2 rounded-full h-1" style={{ background: '#E2E8F0' }}>
              <div className="h-1 rounded-full" style={{ width: `${Math.min(settlRate, 100)}%`, background: settlRate >= 4 ? '#059669' : '#E8813A' }} />
            </div>
          }
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 chart-card">
          <SectionHeading>Outstanding Paras by Zone</SectionHeading>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={zoneBarData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#64748B' }} />
              <Bar dataKey="Opening" fill="#94A3B8" radius={[2,2,0,0]} />
              <Bar dataKey="Raised"  fill="#E8813A" radius={[2,2,0,0]} />
              <Bar dataKey="Settled" fill="#38B089" radius={[2,2,0,0]} />
              <Bar dataKey="Closing" fill="#4F9CF9" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-2 chart-card">
          <SectionHeading>Zone Share — Closing</SectionHeading>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={70} outerRadius={110}
                   dataKey="value" label={({ name, percent }) => `${name.split(' ')[0]} ${(percent*100).toFixed(0)}%`}
                   labelLine={false}>
                {donutData.map(d => <Cell key={d.zone} fill={ZONE_COLORS[d.zone]} stroke="#FFFFFF" strokeWidth={2} />)}
              </Pie>
              <Tooltip contentStyle={TT_STYLE} formatter={v => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 chart-card">
          <SectionHeading>Office-wise Outstanding Paras</SectionHeading>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={officeData} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="office" type="category" tick={{ fill: '#334155', fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip contentStyle={TT_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#64748B' }} />
              {selZones.map(z => <Bar key={z} dataKey={z} name={ZONE_LABELS[z]} fill={ZONE_COLORS[z]} stackId="a" />)}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-2 chart-card">
          <SectionHeading>Month-on-Month Trend</SectionHeading>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#64748B' }} />
              {selZones.map(z => (
                <Line key={z} type="monotone" dataKey={z} name={ZONE_LABELS[z]}
                  stroke={ZONE_COLORS[z]} strokeWidth={2.5} dot={{ r: 5, fill: ZONE_COLORS[z], strokeWidth: 2, stroke: '#FFFFFF' }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Zone performance scorecards */}
      <div>
        <SectionHeading>Zone Performance Analysis</SectionHeading>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {zoneScorecards.map(z => (
            <div key={z.zone} className="rounded-xl p-4" style={{ background: '#FFFFFF', borderTop: `3px solid ${ZONE_COLORS[z.zone]}`, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-display font-bold tracking-wider text-sm" style={{ color: ZONE_COLORS[z.zone] }}>{z.zone}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: z.perfColor, background: z.perfColor + '18' }}>{z.perf}</span>
              </div>
              <p className="text-xs mb-2" style={{ color: '#64748B' }}>{ZONE_LABELS[z.zone]}</p>
              <p className="font-display text-3xl font-bold" style={{ color: '#1E293B' }}>{fmt(z.closing)}</p>
              <p className="text-xs mb-3" style={{ color: '#475569' }}>outstanding paras</p>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: '#64748B' }}>Settlement Rate</span>
                <span className="font-display font-semibold" style={{ color: ZONE_COLORS[z.zone] }}>{z.sr.toFixed(1)}%</span>
              </div>
              <div className="rounded-full h-1" style={{ background: '#E2E8F0' }}>
                <div className="h-1 rounded-full" style={{ width: `${Math.min(z.sr, 100)}%`, background: ZONE_COLORS[z.zone] }} />
              </div>
              {z.momDelta != null && (
                <p className="text-xs mt-2" style={{ color: z.momDelta > 0 ? '#DC2626' : '#059669' }}>
                  {z.momDelta > 0 ? '▲' : '▼'} {fmt(Math.abs(z.momDelta))} vs {prevMonth?.month}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Efficiency + MoM */}
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div className="col-span-3 chart-card">
            <SectionHeading>Settlement Efficiency by Zone</SectionHeading>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={effData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT_STYLE} formatter={v => `${Number(v).toFixed(1)}%`} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#64748B' }} />
                {selZones.map(z => <Bar key={z} dataKey={z} name={ZONE_LABELS[z]} fill={ZONE_COLORS[z]} radius={[2,2,0,0]} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="col-span-2 chart-card">
            <SectionHeading>Net Change by Zone & Month</SectionHeading>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={momData} margin={{ top: 8, right: 8, bottom: 30, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="key" tick={{ fill: '#94A3B8', fontSize: 9, whiteSpace: 'pre' }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT_STYLE} />
                <Bar dataKey="net" radius={[2,2,0,0]} isAnimationActive={false}>
                  {momData.map((d, i) => <Cell key={i} fill={d.net > 0 ? '#DC2626' : d.net < 0 ? '#059669' : '#94A3B8'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs mt-1" style={{ color: '#64748B' }}>Green = backlog reducing · Red = growing</p>
          </div>
        </div>
      </div>

      {/* Detail table */}
      <div>
        <SectionHeading>Paras Status — Office Detail</SectionHeading>
        <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                {['Zone','Office','Opening','Raised','Settled','Closing','Net Change'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold tracking-wide uppercase" style={{ color: '#64748B', fontSize: '0.65rem', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', background: '#FFFFFF', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}>
                  <td className="px-3 py-2 font-display font-semibold" style={{ color: ZONE_COLORS[r.zone] }}>{r.zone}</td>
                  <td className="px-3 py-2" style={{ color: '#334155' }}>{r.office}</td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: '#64748B' }}>{fmt(r.opening)}</td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: r.raised ? '#E8813A' : '#94A3B8' }}>{fmt(r.raised)}</td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: r.settled ? '#059669' : '#94A3B8' }}>{fmt(r.settled)}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold" style={{ color: '#1E293B' }}>{fmt(r.closing)}</td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: r.net > 0 ? '#DC2626' : r.net < 0 ? '#059669' : '#94A3B8' }}>
                    {r.net > 0 ? '+' : ''}{fmt(r.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
