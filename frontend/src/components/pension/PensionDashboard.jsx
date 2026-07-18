import { useState, useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'

const SLATE  = '#64748B'
const NAVY   = '#1E293B'
const RED    = '#DC2626'
const ORANGE = '#EA580C'
const AMBER  = '#D97706'
const GREEN  = '#059669'
const BLUE   = '#3B82F6'
const ALL    = '__all__'

const STATUS_META = {
  critical: { label: 'Critical',  color: RED,    desc: 'EOS passed — EPPO not submitted' },
  at_risk:  { label: 'At Risk',   color: ORANGE, desc: 'Physical received — EPPO not yet submitted' },
  delayed:  { label: 'Delayed',   color: AMBER,  desc: 'Physical received after 2-month deadline' },
  on_time:  { label: 'On Time',   color: GREEN,  desc: 'Physical received ≥2 months before EOS, EPPO submitted' },
  pending:  { label: 'Pending',   color: BLUE,   desc: 'Physical not yet received, EOS upcoming' },
}

const STATUS_ORDER = ['critical', 'at_risk', 'delayed', 'pending', 'on_time']

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
  if (days === null || days === undefined) return null
  const abs = Math.abs(days)
  const color = days > 0 ? RED : GREEN
  const label = days > 0 ? `+${abs}d late` : `${abs}d early`
  return (
    <span style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', fontWeight: 700,
      color, background: color + '18', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

// ── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, color, sub }) {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 10, padding: '14px 18px',
      border: `1px solid ${color}44`, borderTop: `3px solid ${color}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flex: 1, minWidth: 110 }}>
      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', letterSpacing: '0.1em',
        textTransform: 'uppercase', color: SLATE, marginBottom: 6 }}>{label}</p>
      <p style={{ fontFamily: 'Rajdhani', fontSize: '2rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontFamily: 'Inter', fontSize: '0.65rem', color: SLATE, marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <span style={{ fontSize: '0.6rem', fontFamily: 'JetBrains Mono', letterSpacing: '0.12em',
        textTransform: 'uppercase', color: '#FFFFFF', fontWeight: 700,
        background: NAVY, padding: '3px 9px', borderRadius: 4, whiteSpace: 'nowrap' }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: '#CBD5E1' }} />
    </div>
  )
}

// ── Table helpers ─────────────────────────────────────────────────────────────
function Th({ children, right }) {
  return (
    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.55rem', letterSpacing: '0.08em',
      textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', textAlign: right ? 'right' : 'left' }}>
      {children}
    </span>
  )
}
function Td({ children, mono, right, bold, color }) {
  return (
    <span style={{ fontFamily: mono ? 'JetBrains Mono' : 'Inter', fontSize: mono ? '0.68rem' : '0.72rem',
      color: color || NAVY, fontWeight: bold ? 700 : 400, textAlign: right ? 'right' : 'left',
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}
function TableShell({ cols, headers, rows: rowsData, renderRow }) {
  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols,
        background: NAVY, borderRadius: '6px 6px 0 0', padding: '7px 10px', gap: 6 }}>
        {headers}
      </div>
      {rowsData.length === 0
        ? <p style={{ fontFamily: 'Inter', fontSize: '0.8rem', color: SLATE,
            textAlign: 'center', padding: 20 }}>No cases.</p>
        : rowsData.map((row, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: cols,
            background: i % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
            padding: '7px 10px', gap: 6, borderBottom: '1px solid #F1F5F9', alignItems: 'center' }}>
            {renderRow(row, i)}
          </div>
        ))
      }
    </div>
  )
}

function StatusChip({ status }) {
  const m = STATUS_META[status] || {}
  return (
    <span style={{ fontSize: '0.6rem', fontFamily: 'JetBrains Mono', fontWeight: 700,
      color: m.color, background: (m.color || '#ccc') + '18',
      padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  )
}

// ── Charts ────────────────────────────────────────────────────────────────────

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div style={{ background: '#1E293B', border: 'none', borderRadius: 6,
      padding: '6px 12px', color: '#fff', fontFamily: 'Inter', fontSize: '0.75rem' }}>
      <strong>{name}</strong>: {value}
    </div>
  )
}

function StatusDonut({ cases }) {
  const data = STATUS_ORDER
    .map(s => ({ name: STATUS_META[s].label, value: cases.filter(c => c.status === s).length, color: STATUS_META[s].color }))
    .filter(d => d.value > 0)

  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '16px 20px',
      border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', letterSpacing: '0.1em',
        textTransform: 'uppercase', color: SLATE, marginBottom: 12 }}>Status Distribution</p>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={48} outerRadius={72} paddingAngle={2}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip content={<CustomPieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.map(d => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
              <span style={{ fontFamily: 'Inter', fontSize: '0.72rem', color: NAVY }}>{d.name}</span>
              <span style={{ fontFamily: 'Rajdhani', fontSize: '0.85rem', fontWeight: 700,
                color: d.color, marginLeft: 'auto', paddingLeft: 12 }}>{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DelayDistChart({ cases }) {
  // Only cases where physical was received
  const received = cases.filter(c => c.physical_delay_days !== null && c.physical_delay_days !== undefined)
  if (!received.length) return null

  const buckets = [
    { label: '>60d early', min: -Infinity, max: -60, color: GREEN },
    { label: '30-60d early', min: -60, max: -30, color: '#34D399' },
    { label: '0-30d early', min: -30, max: 0,   color: AMBER },
    { label: '0-30d late',  min: 0,   max: 30,   color: ORANGE },
    { label: '>30d late',   min: 30,  max: Infinity, color: RED },
  ]

  const data = buckets.map(b => ({
    label: b.label,
    count: received.filter(c => c.physical_delay_days > b.min && c.physical_delay_days <= b.max).length,
    color: b.color,
  })).filter(d => d.count > 0)

  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '16px 20px',
      border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flex: 1 }}>
      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', letterSpacing: '0.1em',
        textTransform: 'uppercase', color: SLATE, marginBottom: 4 }}>Physical Receipt Delay Distribution</p>
      <p style={{ fontFamily: 'Inter', fontSize: '0.68rem', color: SLATE, marginBottom: 12 }}>
        Days vs 2-month deadline — {received.length} cases with physical received
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="label" tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: SLATE }}
            axisLine={false} tickLine={false} />
          <YAxis tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: SLATE }}
            axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            formatter={(v) => [v, 'Cases']}
            contentStyle={{ fontFamily: 'Inter', fontSize: '0.75rem', background: NAVY,
              border: 'none', borderRadius: 6, color: '#fff' }}
            labelStyle={{ color: '#fff' }}
          />
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
    <div style={{ background: '#fff', borderRadius: 10, padding: '16px 20px',
      border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', letterSpacing: '0.1em',
        textTransform: 'uppercase', color: SLATE, marginBottom: 12 }}>PAO-wise Status Breakdown</p>
      <ResponsiveContainer width="100%" height={Math.max(180, paos.length * 36)}>
        <BarChart data={paos} layout="vertical" margin={{ top: 0, right: 16, left: 40, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis type="number" tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: SLATE }}
            axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="pao" width={50}
            tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: NAVY, fontWeight: 600 }}
            axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ fontFamily: 'Inter', fontSize: '0.75rem', background: NAVY,
              border: 'none', borderRadius: 6, color: '#fff' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend wrapperStyle={{ fontFamily: 'Inter', fontSize: '0.7rem', paddingTop: 8 }} />
          <Bar dataKey="critical" name="Critical"  stackId="a" fill={RED}    radius={0} />
          <Bar dataKey="at_risk"  name="At Risk"   stackId="a" fill={ORANGE} radius={0} />
          <Bar dataKey="delayed"  name="Delayed"   stackId="a" fill={AMBER}  radius={0} />
          <Bar dataKey="pending"  name="Pending"   stackId="a" fill={BLUE}   radius={0} />
          <Bar dataKey="on_time"  name="On Time"   stackId="a" fill={GREEN}  radius={[0,3,3,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Tables ────────────────────────────────────────────────────────────────────

const CRITICAL_COLS = '28px 1fr 60px 80px 96px 96px 96px 80px'
const FULL_COLS     = '28px 1fr 60px 80px 96px 96px 96px 96px 72px'

function CriticalTable({ cases }) {
  const today = new Date()
  return (
    <TableShell
      cols={CRITICAL_COLS}
      headers={<>
        <Th>#</Th><Th>Pensioner</Th><Th>PAO</Th><Th>Class</Th>
        <Th>End of Service</Th><Th>Deadline (EOS−2m)</Th>
        <Th>Physical Received</Th><Th right>Days Since EOS</Th>
      </>}
      rows={cases}
      renderRow={(c, i) => {
        const eosDays = c.end_of_service
          ? Math.floor((today - new Date(c.end_of_service)) / 86400000) : null
        return <>
          <Td mono color={SLATE}>{i+1}</Td>
          <Td bold>{c.name}</Td>
          <Td mono bold color={NAVY}>{c.pao}</Td>
          <Td color={SLATE}>{c.pension_class}</Td>
          <Td mono color={RED} bold>{fmt(c.end_of_service)}</Td>
          <Td mono color={SLATE}>{fmt(c.deadline)}</Td>
          <Td mono color={c.physical_received ? AMBER : RED}>
            {c.physical_received ? fmt(c.physical_received) : 'NOT RECEIVED'}
          </Td>
          <Td mono right bold color={RED}>{eosDays !== null ? `+${eosDays}d` : '—'}</Td>
        </>
      }}
    />
  )
}

function AtRiskTable({ cases }) {
  return (
    <TableShell
      cols={FULL_COLS}
      headers={<>
        <Th>#</Th><Th>Pensioner</Th><Th>PAO</Th><Th>Class</Th>
        <Th>End of Service</Th><Th>Deadline</Th>
        <Th>Physical Received</Th><Th>EPPO Status</Th><Th right>Delay</Th>
      </>}
      rows={cases}
      renderRow={(c, i) => <>
        <Td mono color={SLATE}>{i+1}</Td>
        <Td bold>{c.name}</Td>
        <Td mono bold color={NAVY}>{c.pao}</Td>
        <Td color={SLATE}>{c.pension_class}</Td>
        <Td mono>{fmt(c.end_of_service)}</Td>
        <Td mono color={SLATE}>{fmt(c.deadline)}</Td>
        <Td mono color={NAVY}>{fmt(c.physical_received)}</Td>
        <Td mono color={ORANGE} bold>NOT DONE</Td>
        <div style={{ textAlign: 'right' }}>{delayBadge(c.physical_delay_days)}</div>
      </>}
    />
  )
}

function GenericTable({ cases }) {
  return (
    <TableShell
      cols={FULL_COLS}
      headers={<>
        <Th>#</Th><Th>Pensioner</Th><Th>PAO</Th><Th>Class</Th>
        <Th>End of Service</Th><Th>Deadline</Th>
        <Th>Physical Received</Th><Th>EPPO Submitted</Th><Th right>Delay</Th>
      </>}
      rows={cases}
      renderRow={(c, i) => <>
        <Td mono color={SLATE}>{i+1}</Td>
        <Td bold>{c.name}</Td>
        <Td mono bold color={NAVY}>{c.pao}</Td>
        <Td color={SLATE}>{c.pension_class}</Td>
        <Td mono>{fmt(c.end_of_service)}</Td>
        <Td mono color={SLATE}>{fmt(c.deadline)}</Td>
        <Td mono color={c.physical_received ? NAVY : SLATE}>
          {c.physical_received ? fmt(c.physical_received) : 'NOT RECEIVED'}
        </Td>
        <Td mono color={c.eppo_submitted ? GREEN : SLATE}>
          {c.eppo_submitted ? fmt(c.eppo_submitted) : 'NOT DONE'}
        </Td>
        <div style={{ textAlign: 'right' }}>{delayBadge(c.physical_delay_days)}</div>
      </>}
    />
  )
}

// ── Main component ────────────────────────────────────────────────────────────

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
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'Inter', color: SLATE }}>No pension data available.</p>
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: '#F1F5F9' }}>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="filter-label">Month</span>
          <select className="filter-select" value={selMonth}
            onChange={e => {
              const nw = [...weeks].reverse().filter(w => getMonth(w.period) === e.target.value)
              setSelMonth(e.target.value); setSelWeek(nw[0]?.period ?? '')
            }}>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="filter-label">Week</span>
          <select className="filter-select" value={selWeek} onChange={e => setSelWeek(e.target.value)}>
            {monthWeeks.map(w => <option key={w.period} value={w.period}>{w.period}</option>)}
          </select>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <KpiCard label="Total Cases" value={allCases.length}  color={NAVY} />
        <KpiCard label="Critical"    value={critical.length}  color={RED}    sub="EOS passed, EPPO not submitted" />
        <KpiCard label="At Risk"     value={atRisk.length}    color={ORANGE} sub="File received, EPPO pending" />
        <KpiCard label="Delayed"     value={delayed.length}   color={AMBER}  sub="Physical received after deadline" />
        <KpiCard label="Pending"     value={pending.length}   color={BLUE}   sub="File not yet received" />
        <KpiCard label="On Time"     value={onTime.length}    color={GREEN}  sub="Processed within 2-month window" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatusDonut cases={allCases} />
        <DelayDistChart cases={allCases} />
      </div>

      {/* PAO chart */}
      <div style={{ marginBottom: 24 }}>
        <PaoChart cases={allCases} />
      </div>

      {/* Critical table */}
      <div style={{ marginBottom: 24 }}>
        <SectionLabel>🔴 Critical — EOS Passed, EPPO Not Submitted ({critical.length})</SectionLabel>
        <CriticalTable cases={critical} />
      </div>

      {/* At Risk table */}
      {atRisk.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>🟠 At Risk — Physical Received, EPPO Not Submitted ({atRisk.length})</SectionLabel>
          <AtRiskTable cases={atRisk} />
        </div>
      )}

      {/* Delayed table */}
      {delayed.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Delayed — Physical Case Received After Deadline ({delayed.length})</SectionLabel>
          <GenericTable cases={delayed} />
        </div>
      )}

      {/* Pending table */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Pending — File Not Yet Received ({pending.length})</SectionLabel>
          <GenericTable cases={pending} />
        </div>
      )}

      {/* On Time table */}
      {onTime.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>On Time ({onTime.length})</SectionLabel>
          <GenericTable cases={onTime} />
        </div>
      )}

    </div>
  )
}
