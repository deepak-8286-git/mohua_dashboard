import { useState, useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Users2,
  Layers,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

const RED    = '#F43F5E'
const ORANGE = '#FB923C'
const AMBER  = '#F59E0B'
const GREEN  = '#10B981'
const BLUE   = '#38BDF8'
const ALL    = '__all__'

const STATUS_META = {
  critical: { label: 'Critical',  color: RED,    icon: AlertTriangle, desc: 'EOS passed — EPPO not submitted' },
  at_risk:  { label: 'At Risk',   color: ORANGE, icon: AlertCircle,   desc: 'Physical received — EPPO pending' },
  delayed:  { label: 'Delayed',   color: AMBER,  icon: Clock,         desc: 'Physical received after 2m deadline' },
  pending:  { label: 'Pending',   color: BLUE,   icon: HelpCircle,    desc: 'Physical not yet received' },
  on_time:  { label: 'On Time',   color: GREEN,  icon: CheckCircle2,  desc: 'Processed within 2m window' },
}

const STATUS_ORDER = ['critical', 'at_risk', 'delayed', 'pending', 'on_time']

const TT_STYLE = {
  backgroundColor: 'rgba(12, 23, 44, 0.95)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: 8,
  color: '#F8FAFC',
  backdropFilter: 'blur(8px)',
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
}

function getMonth(period) {
  const m = period?.match(/^([A-Za-z]+)\s+[\d\s–\-]+,?\s*(\d{4})/)
  return m ? `${m[1]} ${m[2]}` : (period?.split(' ')[0] ?? '')
}

function fmt(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]
  return `${+day} ${mon} ${y}`
}

function delayBadge(days) {
  if (days === null || days === undefined) return <span className="text-slate-500 font-mono text-xs">—</span>
  const abs = Math.abs(days)
  const color = days > 0 ? RED : GREEN
  const label = days > 0 ? `+${abs}d late` : `${abs}d early`
  return (
    <span
      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full whitespace-nowrap inline-block"
      style={{ color, background: color + '20', border: `1px solid ${color}35` }}
    >
      {label}
    </span>
  )
}

function SectionDivider({ children, icon: Icon, badge, count }) {
  return (
    <div className="flex items-center gap-3 mb-3 select-none">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className="text-[#F9A55A]" />}
        <span className="section-label">{children}</span>
        {count != null && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-slate-300">
            {count}
          </span>
        )}
      </div>
      <div className="flex-1 h-[1px] bg-gradient-to-r from-white/10 to-transparent" />
    </div>
  )
}

function KpiCard({ label, value, color, sub, icon: Icon, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`kpi-card flex-1 min-w-[130px] cursor-pointer transition-all ${active ? 'ring-2 ring-white/30' : ''}`}
      style={{ '--kpi-accent': color }}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="font-mono text-[10px] font-bold tracking-wider uppercase text-slate-400">{label}</p>
        {Icon && <Icon size={14} style={{ color }} />}
      </div>
      <p className="font-display text-3xl font-bold leading-none" style={{ color }}>{value}</p>
      {sub && <p className="font-body text-[10px] text-slate-400 mt-1 leading-tight">{sub}</p>}
    </div>
  )
}

function StatusDonut({ cases }) {
  const data = STATUS_ORDER
    .map(s => ({ name: STATUS_META[s].label, value: cases.filter(c => c.status === s).length, color: STATUS_META[s].color }))
    .filter(d => d.value > 0)

  return (
    <div className="chart-card flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-3">
        <Layers size={14} className="text-amber-400" />
        <span className="font-mono text-xs uppercase font-bold text-slate-300">Status Distribution</span>
      </div>
      <div className="flex items-center justify-around gap-4 flex-wrap">
        <ResponsiveContainer width={150} height={150}>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={42} outerRadius={66} paddingAngle={3}>
              {data.map((d, i) => <Cell key={i} fill={d.color} stroke="#0B152A" strokeWidth={2} />)}
            </Pie>
            <Tooltip contentStyle={TT_STYLE} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-1.5 font-mono text-xs">
          {data.map(d => (
            <div key={d.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
              <span className="text-slate-300 text-[11px]">{d.name}</span>
              <span className="font-bold text-white ml-auto">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DelayDistChart({ cases }) {
  const received = cases.filter(c => c.physical_delay_days !== null && c.physical_delay_days !== undefined)
  if (!received.length) return null

  const buckets = [
    { label: '>60d early', min: -Infinity, max: -60, color: '#10B981' },
    { label: '30-60d early', min: -60, max: -30, color: '#34D399' },
    { label: '0-30d early', min: -30, max: 0,   color: '#F59E0B' },
    { label: '0-30d late',  min: 0,   max: 30,   color: '#FB923C' },
    { label: '>30d late',   min: 30,  max: Infinity, color: '#F43F5E' },
  ]

  const data = buckets.map(b => ({
    label: b.label,
    count: received.filter(c => c.physical_delay_days > b.min && c.physical_delay_days <= b.max).length,
    color: b.color,
  })).filter(d => d.count > 0)

  return (
    <div className="chart-card flex-1">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-amber-400" />
          <span className="font-mono text-xs uppercase font-bold text-slate-300">Physical Receipt Timeline</span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">{received.length} physical cases logged</span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={TT_STYLE} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function PaoChart({ cases }) {
  const paos = useMemo(() => {
    const map = {}
    for (const c of cases) {
      if (!map[c.pao]) map[c.pao] = { pao: c.pao, critical: 0, at_risk: 0, delayed: 0, pending: 0, on_time: 0 }
      map[c.pao][c.status] = (map[c.pao][c.status] || 0) + 1
    }
    return Object.values(map).sort((a, b) =>
      (b.critical + b.at_risk) - (a.critical + a.at_risk) || b.delayed - a.delayed
    )
  }, [cases])

  if (!paos.length) return null

  return (
    <div className="chart-card">
      <div className="flex items-center gap-2 mb-3">
        <Users2 size={14} className="text-amber-400" />
        <span className="font-mono text-xs uppercase font-bold text-slate-300">PAO-wise Status Breakdown</span>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(180, paos.length * 36)}>
        <BarChart data={paos} layout="vertical" margin={{ top: 0, right: 16, left: 20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="pao" width={60} tick={{ fill: '#E2E8F0', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TT_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8', paddingTop: 6 }} />
          <Bar dataKey="critical" name="Critical"  stackId="a" fill={RED} />
          <Bar dataKey="at_risk"  name="At Risk"   stackId="a" fill={ORANGE} />
          <Bar dataKey="delayed"  name="Delayed"   stackId="a" fill={AMBER} />
          <Bar dataKey="pending"  name="Pending"   stackId="a" fill={BLUE} />
          <Bar dataKey="on_time"  name="On Time"   stackId="a" fill={GREEN} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function PensionCasesTable({ cases, title, icon: Icon, badgeColor }) {
  const today = new Date()

  if (!cases.length) return null

  return (
    <div className="mb-6">
      <SectionDivider icon={Icon} count={cases.length}>{title}</SectionDivider>
      <div className="table-container">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#0B152A] border-b border-white/10">
              <tr>
                <th className="px-3.5 py-2.5 text-left font-mono text-[10px] text-slate-400 uppercase">#</th>
                <th className="px-3.5 py-2.5 text-left font-mono text-[10px] text-slate-400 uppercase">Pensioner Name</th>
                <th className="px-3.5 py-2.5 text-left font-mono text-[10px] text-slate-400 uppercase">PAO</th>
                <th className="px-3.5 py-2.5 text-left font-mono text-[10px] text-slate-400 uppercase">Class</th>
                <th className="px-3.5 py-2.5 text-left font-mono text-[10px] text-slate-400 uppercase">End of Service</th>
                <th className="px-3.5 py-2.5 text-left font-mono text-[10px] text-slate-400 uppercase">Deadline (EOS-2m)</th>
                <th className="px-3.5 py-2.5 text-left font-mono text-[10px] text-slate-400 uppercase">Physical Received</th>
                <th className="px-3.5 py-2.5 text-left font-mono text-[10px] text-slate-400 uppercase">EPPO Status</th>
                <th className="px-3.5 py-2.5 text-right font-mono text-[10px] text-slate-400 uppercase">Timeline Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cases.map((c, i) => {
                const eosDays = c.end_of_service
                  ? Math.floor((today - new Date(c.end_of_service)) / 86400000) : null

                return (
                  <tr key={i} className="hover:bg-white/[0.04] transition-colors">
                    <td className="px-3.5 py-2 font-mono text-slate-400">{i + 1}</td>
                    <td className="px-3.5 py-2 text-slate-200 font-semibold">{c.name}</td>
                    <td className="px-3.5 py-2 font-mono font-bold text-sky-400">{c.pao}</td>
                    <td className="px-3.5 py-2 text-slate-400">{c.pension_class || 'General'}</td>
                    <td className="px-3.5 py-2 font-mono text-slate-300">{fmt(c.end_of_service)}</td>
                    <td className="px-3.5 py-2 font-mono text-slate-400">{fmt(c.deadline)}</td>
                    <td className="px-3.5 py-2 font-mono">
                      {c.physical_received ? (
                        <span className="text-slate-200">{fmt(c.physical_received)}</span>
                      ) : (
                        <span className="text-rose-400 font-semibold">NOT RECEIVED</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2 font-mono">
                      {c.eppo_submitted ? (
                        <span className="text-emerald-400 font-semibold">{fmt(c.eppo_submitted)}</span>
                      ) : (
                        <span className="text-amber-400 font-semibold">PENDING</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2 text-right">
                      {c.status === 'critical' ? (
                        <span className="font-mono text-xs font-bold text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded border border-rose-500/30">
                          {eosDays !== null ? `+${eosDays}d past EOS` : 'EOS Expired'}
                        </span>
                      ) : (
                        delayBadge(c.physical_delay_days)
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function PensionDashboard({ data }) {
  const weeks = data?.weeks ?? []

  const months = useMemo(() => {
    const seen = new Set(); const out = []
    ;[...weeks].reverse().forEach(w => {
      const m = getMonth(w.period)
      if (!seen.has(m)) { seen.add(m); out.push(m) }
    })
    return out
  }, [weeks])

  const [selMonth, setSelMonth] = useState(() => months[0] ?? '')
  const [selWeek,  setSelWeek]  = useState(() => [...weeks].reverse()[0]?.period ?? '')

  const monthWeeks = useMemo(
    () => [...weeks].reverse().filter(w => getMonth(w.period) === selMonth),
    [weeks, selMonth]
  )

  const activeWeek = useMemo(
    () => monthWeeks.find(w => w.period === selWeek) ?? monthWeeks[0] ?? null,
    [monthWeeks, selWeek]
  )

  const allCases = useMemo(() => activeWeek?.cases ?? [], [activeWeek])

  const critical = useMemo(() =>
    allCases.filter(c => c.status === 'critical')
      .sort((a, b) => new Date(a.end_of_service) - new Date(b.end_of_service)), [allCases])
  const atRisk  = useMemo(() =>
    allCases.filter(c => c.status === 'at_risk')
      .sort((a, b) => new Date(a.end_of_service) - new Date(b.end_of_service)), [allCases])
  const delayed = useMemo(() =>
    allCases.filter(c => c.status === 'delayed')
      .sort((a, b) => (b.physical_delay_days ?? 0) - (a.physical_delay_days ?? 0)), [allCases])
  const pending = useMemo(() =>
    allCases.filter(c => c.status === 'pending')
      .sort((a, b) => new Date(a.end_of_service) - new Date(b.end_of_service)), [allCases])
  const onTime  = useMemo(() => allCases.filter(c => c.status === 'on_time'), [allCases])

  if (!weeks.length) return (
    <div className="flex-1 flex items-center justify-center p-8">
      <p className="font-mono text-xs text-slate-400">No pension data available in Google Drive.</p>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Filters Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 p-4 rounded-xl glass-card">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="filter-label">Month:</span>
            <select
              className="filter-select font-mono"
              value={selMonth}
              onChange={e => {
                const nw = [...weeks].reverse().filter(w => getMonth(w.period) === e.target.value)
                setSelMonth(e.target.value)
                setSelWeek(nw[0]?.period ?? '')
              }}
            >
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="filter-label">Week:</span>
            <select className="filter-select font-mono" value={selWeek} onChange={e => setSelWeek(e.target.value)}>
              {monthWeeks.map(w => <option key={w.period} value={w.period}>{w.period}</option>)}
            </select>
          </div>
        </div>

        <span className="font-mono text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-white/5">
          {allCases.length} total cases tracking
        </span>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Total Cases" value={allCases.length} color="#E2E8F0" icon={Users2} />
        <KpiCard label="Critical"    value={critical.length} color={RED}    sub="EOS passed, EPPO pending" icon={AlertTriangle} />
        <KpiCard label="At Risk"     value={atRisk.length}   color={ORANGE} sub="Physical in, EPPO pending" icon={AlertCircle} />
        <KpiCard label="Delayed"     value={delayed.length}  color={AMBER}  sub="Received post deadline" icon={Clock} />
        <KpiCard label="Pending"     value={pending.length}  color={BLUE}   sub="Physical awaited" icon={HelpCircle} />
        <KpiCard label="On Time"     value={onTime.length}   color={GREEN}  sub="Cleared &lt; 2m" icon={CheckCircle2} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatusDonut cases={allCases} />
        <div className="lg:col-span-2">
          <DelayDistChart cases={allCases} />
        </div>
      </div>

      {/* PAO Chart */}
      <div>
        <PaoChart cases={allCases} />
      </div>

      {/* Case Details Tables */}
      <PensionCasesTable cases={critical} title="Critical Escalations — EOS Passed Without EPPO Submission" icon={AlertTriangle} badgeColor={RED} />
      <PensionCasesTable cases={atRisk} title="At Risk Cases — Physical File Received, EPPO Filing Awaited" icon={AlertCircle} badgeColor={ORANGE} />
      <PensionCasesTable cases={delayed} title="Delayed Cases — Physical Received After 2-Month Window" icon={Clock} badgeColor={AMBER} />
      <PensionCasesTable cases={pending} title="Pending Cases — Physical Documents Awaited from Office" icon={HelpCircle} badgeColor={BLUE} />
      <PensionCasesTable cases={onTime} title="On-Time Processed Cases" icon={CheckCircle2} badgeColor={GREEN} />
    </div>
  )
}
