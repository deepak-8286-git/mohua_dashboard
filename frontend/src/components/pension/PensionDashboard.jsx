import { useState, useMemo } from 'react'

const SLATE   = '#64748B'
const NAVY    = '#1E293B'
const RED     = '#DC2626'
const AMBER   = '#D97706'
const GREEN   = '#059669'
const BLUE    = '#3B82F6'
const ALL = '__all__'

function getMonth(period) {
  const m = period?.match(/^([A-Za-z]+)\s+[\d\s–\-]+,?\s*(\d{4})/)
  return m ? `${m[1]} ${m[2]}` : (period?.split(' ')[0] ?? '')
}

const STATUS_META = {
  critical: { label: 'Critical',  color: RED,   bg: '#FEF2F2', desc: 'EOS passed, EPPO not submitted' },
  delayed:  { label: 'Delayed',   color: AMBER, bg: '#FFFBEB', desc: 'Physical case received late (>2 months before EOS rule breached)' },
  on_time:  { label: 'On Time',   color: GREEN, bg: '#ECFDF5', desc: 'Physical received ≥2 months before EOS, EPPO submitted before EOS' },
  pending:  { label: 'Pending',   color: BLUE,  bg: '#EFF6FF', desc: 'EOS upcoming, not yet processed' },
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

function KpiCard({ label, value, color, sub }) {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 10, padding: '14px 18px',
      border: `1px solid ${color}44`, borderTop: `3px solid ${color}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flex: 1, minWidth: 120 }}>
      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', letterSpacing: '0.1em',
        textTransform: 'uppercase', color: SLATE, marginBottom: 6 }}>{label}</p>
      <p style={{ fontFamily: 'Rajdhani', fontSize: '2rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontFamily: 'Inter', fontSize: '0.68rem', color: SLATE, marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

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

const CRITICAL_COLS  = '28px 1fr 70px 90px 100px 100px 90px 100px'
const FULL_COLS      = '28px 1fr 70px 90px 100px 100px 90px 100px 80px'

function TableHeader({ cols, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols,
      background: NAVY, borderRadius: '6px 6px 0 0', padding: '7px 10px', gap: 6 }}>
      {children}
    </div>
  )
}

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

function StatusChip({ status }) {
  const m = STATUS_META[status] || {}
  return (
    <span style={{ fontSize: '0.6rem', fontFamily: 'JetBrains Mono', fontWeight: 700,
      color: m.color, background: m.color + '18', padding: '2px 7px',
      borderRadius: 4, whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  )
}

function CriticalTable({ cases }) {
  const today = new Date()
  if (!cases.length) return (
    <p style={{ fontFamily: 'Inter', fontSize: '0.8rem', color: SLATE, textAlign: 'center', padding: 20 }}>
      No critical cases in this period.
    </p>
  )

  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
      <TableHeader cols={CRITICAL_COLS}>
        <Th>#</Th><Th>Pensioner</Th><Th>PAO</Th><Th>Class</Th>
        <Th>End of Service</Th><Th>Deadline (EOS−2m)</Th>
        <Th>Physical Received</Th><Th>Days Since EOS</Th>
      </TableHeader>
      {cases.map((c, i) => {
        const eosDays = c.end_of_service
          ? Math.floor((today - new Date(c.end_of_service)) / 86400000)
          : null
        const stripe = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC'
        const isPhysicalMissing = !c.physical_received
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: CRITICAL_COLS,
            background: stripe, padding: '7px 10px', gap: 6,
            borderBottom: '1px solid #F1F5F9', alignItems: 'center' }}>
            <Td mono color={SLATE}>{i + 1}</Td>
            <Td bold>{c.name}</Td>
            <Td mono bold color={NAVY}>{c.pao}</Td>
            <Td color={SLATE}>{c.pension_class}</Td>
            <Td mono color={RED} bold>{fmt(c.end_of_service)}</Td>
            <Td mono color={SLATE}>{fmt(c.deadline)}</Td>
            <Td mono color={isPhysicalMissing ? RED : AMBER}>
              {isPhysicalMissing ? 'NOT RECEIVED' : fmt(c.physical_received)}
            </Td>
            <Td mono right bold color={RED}>
              {eosDays !== null ? `+${eosDays}d` : '—'}
            </Td>
          </div>
        )
      })}
    </div>
  )
}

function FullTable({ cases }) {
  if (!cases.length) return (
    <p style={{ fontFamily: 'Inter', fontSize: '0.8rem', color: SLATE, textAlign: 'center', padding: 20 }}>
      No cases.
    </p>
  )
  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
      <TableHeader cols={FULL_COLS}>
        <Th>#</Th><Th>Pensioner</Th><Th>PAO</Th><Th>Class</Th>
        <Th>End of Service</Th><Th>Deadline</Th>
        <Th>Physical Received</Th><Th>EPPO Submitted</Th><Th right>Delay</Th>
      </TableHeader>
      {cases.map((c, i) => {
        const stripe = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC'
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: FULL_COLS,
            background: stripe, padding: '7px 10px', gap: 6,
            borderBottom: '1px solid #F1F5F9', alignItems: 'center' }}>
            <Td mono color={SLATE}>{i + 1}</Td>
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
            <div style={{ textAlign: 'right' }}>
              {delayBadge(c.physical_delay_days)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PaoBreakdown({ cases }) {
  const byPao = useMemo(() => {
    const map = {}
    for (const c of cases) {
      if (!map[c.pao]) map[c.pao] = { pao: c.pao, total: 0, critical: 0, delayed: 0, on_time: 0, pending: 0 }
      map[c.pao].total++
      map[c.pao][c.status] = (map[c.pao][c.status] || 0) + 1
    }
    return Object.values(map).sort((a, b) => b.critical - a.critical || b.total - a.total)
  }, [cases])

  if (!byPao.length) return null

  const cols = '80px 60px 60px 60px 60px 60px 1fr'
  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
      <TableHeader cols={cols}>
        <Th>PAO</Th><Th right>Total</Th><Th right>Critical</Th>
        <Th right>Delayed</Th><Th right>On Time</Th><Th right>Pending</Th><Th>Bar</Th>
      </TableHeader>
      {byPao.map((p, i) => {
        const stripe = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC'
        const critPct = p.total ? p.critical / p.total : 0
        const delPct  = p.total ? p.delayed  / p.total : 0
        const okPct   = p.total ? p.on_time  / p.total : 0
        const penPct  = p.total ? p.pending  / p.total : 0
        return (
          <div key={p.pao} style={{ display: 'grid', gridTemplateColumns: cols,
            background: stripe, padding: '7px 10px', gap: 6,
            borderBottom: '1px solid #F1F5F9', alignItems: 'center' }}>
            <Td mono bold>{p.pao}</Td>
            <Td mono right bold>{p.total}</Td>
            <Td mono right bold color={p.critical > 0 ? RED : SLATE}>{p.critical || 0}</Td>
            <Td mono right color={p.delayed  > 0 ? AMBER : SLATE}>{p.delayed  || 0}</Td>
            <Td mono right color={p.on_time  > 0 ? GREEN : SLATE}>{p.on_time  || 0}</Td>
            <Td mono right color={BLUE}>{p.pending || 0}</Td>
            <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 1 }}>
              {critPct > 0 && <div style={{ flex: critPct, background: RED }} />}
              {delPct  > 0 && <div style={{ flex: delPct,  background: AMBER }} />}
              {okPct   > 0 && <div style={{ flex: okPct,   background: GREEN }} />}
              {penPct  > 0 && <div style={{ flex: penPct,  background: BLUE }} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function PensionDashboard({ data }) {
  const weeks = data?.weeks ?? []

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
  const [selWeek,  setSelWeek]  = useState(() => weeks.length ? [...weeks].reverse()[0]?.period ?? '' : '')

  const monthWeeks = useMemo(
    () => [...weeks].reverse().filter(w => getMonth(w.period) === selMonth),
    [weeks, selMonth]
  )

  const activeWeek = useMemo(
    () => monthWeeks.find(w => w.period === selWeek) ?? monthWeeks[0] ?? null,
    [monthWeeks, selWeek]
  )

  const allCases = useMemo(() => activeWeek?.cases ?? [], [activeWeek])

  const critical = useMemo(() => allCases.filter(c => c.status === 'critical')
    .sort((a, b) => new Date(a.end_of_service) - new Date(b.end_of_service)), [allCases])
  const delayed  = useMemo(() => allCases.filter(c => c.status === 'delayed')
    .sort((a, b) => (b.physical_delay_days ?? 0) - (a.physical_delay_days ?? 0)), [allCases])
  const onTime   = useMemo(() => allCases.filter(c => c.status === 'on_time'), [allCases])
  const pending  = useMemo(() => allCases.filter(c => c.status === 'pending')
    .sort((a, b) => new Date(a.end_of_service) - new Date(b.end_of_service)), [allCases])

  if (!weeks.length) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'Inter', color: SLATE }}>No pension data available.</p>
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: '#F1F5F9' }}>

      {/* Month + Week filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="filter-label">Month</span>
          <select className="filter-select" value={selMonth}
            onChange={e => {
              const newMonthWeeks = [...weeks].reverse().filter(w => getMonth(w.period) === e.target.value)
              setSelMonth(e.target.value)
              setSelWeek(newMonthWeeks[0]?.period ?? '')
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
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <KpiCard label="Total Cases"   value={allCases.length} color={NAVY}  />
        <KpiCard label="Critical"      value={critical.length} color={RED}
          sub="EOS passed, EPPO not submitted" />
        <KpiCard label="Delayed"       value={delayed.length}  color={AMBER}
          sub="Physical case received after 2-month deadline" />
        <KpiCard label="On Time"       value={onTime.length}   color={GREEN}
          sub="Physical ≥2 months before EOS" />
        <KpiCard label="Pending"       value={pending.length}  color={BLUE}
          sub="EOS upcoming, awaiting processing" />
      </div>

      {/* ── CRITICAL SECTION ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>🔴 Critical — EOS Passed, EPPO Not Submitted ({critical.length})</SectionLabel>
        <CriticalTable cases={critical} />
      </div>

      {/* ── PAO breakdown ────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>PAO-wise Breakdown</SectionLabel>
        <PaoBreakdown cases={allCases} />
      </div>

      {/* ── DELAYED ──────────────────────────────────────────────────── */}
      {delayed.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Delayed — Physical Case Received Late ({delayed.length})</SectionLabel>
          <FullTable cases={delayed} />
        </div>
      )}

      {/* ── PENDING ──────────────────────────────────────────────────── */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Pending — EOS Upcoming ({pending.length})</SectionLabel>
          <FullTable cases={pending} />
        </div>
      )}

      {/* ── ON TIME ──────────────────────────────────────────────────── */}
      {onTime.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>On Time ({onTime.length})</SectionLabel>
          <FullTable cases={onTime} />
        </div>
      )}

    </div>
  )
}
