import { useState, useMemo } from 'react'

const AMBER = '#E8813A'
const GREEN = '#059669'
const BLUE  = '#3B82F6'
const RED   = '#DC2626'
const SLATE = '#64748B'
const ALL   = '__all__'
const TOP_N = 3

const BUCKET_COLS = [
  { key: 'T0',     label: 'T0',   color: '#059669', desc: 'Same-day' },
  { key: 'T1',     label: 'T1',   color: '#3B82F6', desc: '1-2 days' },
  { key: 'T2',     label: 'T2',   color: '#7C3AED', desc: '3-5 days' },
  { key: 'T3',     label: 'T3',   color: '#D97706', desc: '6-10 days' },
  { key: 'T4',     label: 'T4',   color: '#EA580C', desc: '11-30 days' },
  { key: 'T5',     label: 'T5',   color: '#DC2626', desc: '31-60 days' },
  { key: 'T5Plus', label: 'T5+',  color: '#7F1D1D', desc: '60+ days' },
]

const STATUS_META = [
  { key: 'closed',    label: 'Closed',    color: '#059669', bg: '#ECFDF5' },
  { key: 'pending',   label: 'Pending',   color: '#D97706', bg: '#FFFBEB' },
  { key: 'returned',  label: 'Returned',  color: '#DC2626', bg: '#FEF2F2' },
  { key: 'cancelled', label: 'Cancelled', color: '#3B82F6', bg: '#EFF6FF' },
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

function SectionDivider({ children, onToggle, open }) {
  const isCollapsible = onToggle != null
  return (
    <div
      onClick={isCollapsible ? onToggle : undefined}
      style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: open !== false ? 14 : 0, cursor: isCollapsible ? 'pointer' : 'default', userSelect: 'none' }}
    >
      {isCollapsible && (
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', color: SLATE, lineHeight: 1, transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
      )}
      <span style={{ fontSize: '0.6rem', fontFamily: 'JetBrains Mono', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#FFFFFF', fontWeight: 700, whiteSpace: 'nowrap', background: '#334155', padding: '3px 9px', borderRadius: 4 }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: '#CBD5E1' }} />
    </div>
  )
}

function SummaryCard({ label, count, amount, countPct, amountPct, accent }) {
  const tint = accent + '22'
  return (
    <div style={{ background: `linear-gradient(145deg, ${tint} 0%, #FFFFFF 55%)`, borderRadius: 12, borderTop: `4px solid ${accent}`, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.09)' }}>
      <p style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', letterSpacing: '0.08em', textTransform: 'uppercase', color: SLATE, fontWeight: 600, marginBottom: 10 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontFamily: 'Rajdhani', fontSize: '2.1rem', fontWeight: 700, lineHeight: 1, color: accent }}>{fmt(count)}</span>
        {countPct != null && (
          <span style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono', background: accent + '18', color: accent, padding: '2px 7px', borderRadius: 20, fontWeight: 600 }}>{countPct}%</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderTop: `1px solid ${accent}1a`, marginTop: 10, paddingTop: 8, gap: 8 }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: '#334155', fontWeight: 600 }}>{fmtAmt(amount)}</span>
        {amountPct != null && <span style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', color: SLATE }}>{amountPct}% of amt</span>}
      </div>
    </div>
  )
}

function BillTypeCard({ label, count, amount, countPct, accent }) {
  const tint = accent + '22'
  return (
    <div style={{ background: `linear-gradient(145deg, ${tint} 0%, #FFFFFF 55%)`, borderRadius: 10, borderTop: `4px solid ${accent}`, padding: '16px 18px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
      <p style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', letterSpacing: '0.08em', textTransform: 'uppercase', color: SLATE, fontWeight: 600, marginBottom: 8 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
        <p style={{ fontFamily: 'Rajdhani', fontSize: '1.75rem', fontWeight: 700, lineHeight: 1, color: accent }}>{fmt(count)}</p>
        {countPct != null && (
          <span style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono', background: accent + '18', color: accent, padding: '2px 7px', borderRadius: 20, fontWeight: 600 }}>{countPct}%</span>
        )}
      </div>
      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', color: '#334155', borderTop: `1px solid ${accent}1a`, marginTop: 8, paddingTop: 8, fontWeight: 600 }}>{fmtAmt(amount)}</p>
    </div>
  )
}

function StatusCard({ label, count, color }) {
  const tint = color + '22'
  return (
    <div style={{ background: `linear-gradient(145deg, ${tint} 0%, #FFFFFF 58%)`, borderRadius: 12, borderTop: `4px solid ${color}`, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.09)' }}>
      <p style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', letterSpacing: '0.08em', textTransform: 'uppercase', color: SLATE, fontWeight: 600, marginBottom: 10 }}>{label}</p>
      <p style={{ fontFamily: 'Rajdhani', fontSize: '2.1rem', fontWeight: 700, color, lineHeight: 1 }}>{fmt(count)}</p>
    </div>
  )
}

function BucketCard({ label, desc, count, total, color }) {
  const percentage = pct(count, total)
  const tint = color + '20'
  return (
    <div style={{ background: `linear-gradient(160deg, ${tint} 0%, #FFFFFF 62%)`, borderRadius: 10, padding: '13px 13px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', border: `1px solid ${color}38` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontFamily: 'Rajdhani', fontSize: '1.05rem', fontWeight: 700, color }}>{label}</span>
        <span style={{ fontSize: '0.55rem', color: SLATE, fontFamily: 'JetBrains Mono' }}>{desc}</span>
      </div>
      <p style={{ fontFamily: 'Rajdhani', fontSize: '1.9rem', fontWeight: 700, color, lineHeight: 1 }}>{percentage}%</p>
      <p style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', color: SLATE, marginTop: 3 }}>{fmt(count)} bills</p>
      <div style={{ marginTop: 10, height: 4, background: color + '30', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${Math.min(100, percentage)}%`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  )
}

// Full T0-T5+ breakdown in performer card
function PerformerCard({ rank, data, isGood }) {
  const total = data.total_bills_token || 0
  const buckets = BUCKET_COLS.map(b => ({
    ...b,
    count: data[`${b.key}_bills`] || 0,
    pct:   pct(data[`${b.key}_bills`] || 0, total),
  }))
  const accentColor = isGood ? '#059669' : '#DC2626'

  const perfTint = accentColor + '14'
  return (
    <div style={{ background: `linear-gradient(155deg, ${perfTint} 0%, #FFFFFF 55%)`, borderRadius: 12, borderLeft: `5px solid ${accentColor}`, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.3rem', color: accentColor, lineHeight: 1, minWidth: 22 }}>{rank}</span>
        <span style={{ flex: 1, fontFamily: 'Inter', fontSize: '0.8rem', fontWeight: 600, color: '#1E293B', lineHeight: 1.4 }}>{data.pao}</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', color: SLATE, whiteSpace: 'nowrap' }}>{fmt(total)} bills</span>
      </div>

      {/* Stacked distribution bar */}
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 10, gap: 1.5, background: '#F1F5F9' }}>
        {buckets.map(b => b.pct > 0 ? (
          <div key={b.key} title={`${b.label}: ${b.pct}%`}
            style={{ width: `${b.pct}%`, background: b.color, minWidth: 2, transition: 'width 0.3s' }} />
        ) : null)}
      </div>

      {/* Bucket breakdown grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {buckets.map(b => (
          <div key={b.key} style={{ textAlign: 'center', padding: '6px 4px', borderRadius: 6, background: b.color + '18' }}>
            <p style={{ fontFamily: 'Rajdhani', fontSize: '0.7rem', fontWeight: 700, color: b.color, marginBottom: 1 }}>{b.label}</p>
            <p style={{ fontFamily: 'Rajdhani', fontSize: '1rem', fontWeight: 700, color: b.color, lineHeight: 1 }}>{b.pct}%</p>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.55rem', color: SLATE, marginTop: 2 }}>{fmt(b.count)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Pending breakdown table ───────────────────────────────────────────────────

const PENDING_COLS = ['#', 'PAO', 'Pending', '% of Total', 'Distribution', 'Closed', 'Returned', 'Cancelled']

function PendingBreakdownTable({ paos }) {
  const sorted = useMemo(
    () => [...paos]
      .filter(p => (p.pending || p.closed || p.returned || p.cancelled) > 0)
      .sort((a, b) => (b.pending || 0) - (a.pending || 0)),
    [paos]
  )
  const maxPending   = sorted[0]?.pending || 1
  const totalPending = sorted.reduce((s, p) => s + (p.pending || 0), 0)
  const paosWithPending = sorted.filter(p => (p.pending || 0) > 0).length

  if (!sorted.length) return (
    <p style={{ fontFamily: 'Inter', fontSize: '0.8rem', color: SLATE, textAlign: 'center', padding: '16px 0' }}>No data</p>
  )

  const GRID = '28px 1fr 90px 72px 140px 80px 80px 88px'

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #E2E8F0' }}>

      {/* Summary banner */}
      <div style={{ padding: '10px 18px', background: '#FFFBEB', borderBottom: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 20 }}>
        <span style={{ fontFamily: 'Rajdhani', fontSize: '1.1rem', fontWeight: 700, color: '#92400E' }}>
          {fmt(totalPending)}
        </span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', color: '#A16207' }}>
          total pending bills across {paosWithPending} PAO{paosWithPending !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Header row */}
      <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 0, background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', padding: '8px 18px', alignItems: 'center' }}>
        {PENDING_COLS.map(h => (
          <span key={h} style={{ fontSize: '0.58rem', fontFamily: 'JetBrains Mono', color: SLATE, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: (h === '#' || h === 'PAO' || h === 'Distribution') ? 'left' : 'right' }}>{h}</span>
        ))}
      </div>

      {/* Data rows */}
      <div style={{ maxHeight: 460, overflowY: 'auto' }}>
        {sorted.map((p, i) => {
          const pendingPct = pct(p.pending || 0, p.total_bills_token || 1)
          const barW       = ((p.pending || 0) / maxPending) * 100
          const isHighRisk = pendingPct > 25

          return (
            <div key={p.pao_code || p.pao}
              style={{
                display: 'grid', gridTemplateColumns: GRID, gap: 0,
                padding: '9px 18px', alignItems: 'center',
                borderBottom: '1px solid #F1F5F9',
                background: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#FFFBEB'}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#FFFFFF' : '#FAFBFC'}
            >
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', color: '#94A3B8' }}>{i + 1}</span>

              <span style={{ fontFamily: 'Inter', fontSize: '0.78rem', fontWeight: 500, color: '#1E293B', paddingRight: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.pao}
              </span>

              <span style={{ fontFamily: 'Rajdhani', fontSize: '1.1rem', fontWeight: 700, color: '#D97706', textAlign: 'right', paddingRight: 6 }}>
                {fmt(p.pending || 0)}
              </span>

              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.72rem', textAlign: 'right', paddingRight: 8, color: isHighRisk ? '#DC2626' : SLATE, fontWeight: isHighRisk ? 700 : 400 }}>
                {pendingPct}%
              </span>

              <div style={{ paddingRight: 14 }}>
                <div style={{ height: 6, background: '#FEF3C7', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${barW}%`, background: isHighRisk ? '#DC2626' : '#D97706', borderRadius: 3 }} />
                </div>
              </div>

              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', color: '#059669', textAlign: 'right', paddingRight: 4 }}>{fmt(p.closed || 0)}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', color: '#DC2626', textAlign: 'right', paddingRight: 4 }}>{fmt(p.returned || 0)}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', color: '#3B82F6', textAlign: 'right' }}>{fmt(p.cancelled || 0)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main dashboard ─────────────────────────────────────────────────────────────

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

  // Summary totals (always all PAOs)
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

  // All-PAO aggregate for delay buckets
  const allPaoDelayAgg = useMemo(() => {
    const agg = { total_bills_token: 0 }
    BUCKET_COLS.forEach(b => { agg[`${b.key}_bills`] = 0 })
    totalDelayPaos.forEach(p => {
      agg.total_bills_token += p.total_bills_token || 0
      BUCKET_COLS.forEach(b => { agg[`${b.key}_bills`] += p[`${b.key}_bills`] || 0 })
    })
    return agg
  }, [totalDelayPaos])

  // Selected PAO data
  const selectedEbmPao = useMemo(
    () => selPao === ALL ? null : allEbmPaos.find(p => (p.pao_code || p.pao_name) === selPao) ?? null,
    [allEbmPaos, selPao]
  )
  const selectedDelayPao = useMemo(
    () => selPao === ALL ? null : totalDelayPaos.find(p => (p.pao_code || p.pao) === selPao) ?? null,
    [totalDelayPaos, selPao]
  )

  // Status and delay: work for both ALL and specific PAO
  const statusData  = useMemo(() => aggregateStatus(activePeriod, selPao), [activePeriod, selPao])
  const delayData   = selPao === ALL ? allPaoDelayAgg : selectedDelayPao

  // Best 3 / Worst 3 — always from full totalDelayPaos (period-only filter)
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
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#F1F5F9' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Filters ───────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="filter-label">Month</span>
            <select className="filter-select" value={selMonth} onChange={e => handleMonthChange(e.target.value)}>
              {months.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="filter-label">Week</span>
            <select className="filter-select" value={selWeek} onChange={e => setSelWeek(e.target.value)}>
              <option value={ALL}>All weeks (month total)</option>
              {monthWeeks.map(w => <option key={w.period} value={w.period}>{w.period}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="filter-label">PAO</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <select className="filter-select" style={{ maxWidth: 300 }} value={selPao} onChange={e => setSelPao(e.target.value)}>
                <option value={ALL}>All PAOs</option>
                {allEbmPaos.map(p => (
                  <option key={p.pao_code || p.pao_name} value={p.pao_code || p.pao_name}>{p.pao_name}</option>
                ))}
              </select>
              {selPao !== ALL && (
                <button onClick={() => setSelPao(ALL)}
                  style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono', color: SLATE, cursor: 'pointer', background: '#E2E8F0', border: 'none', borderRadius: 4, padding: '5px 8px' }}>
                  ✕
                </button>
              )}
            </div>
          </div>
          {isMonthView && (
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', color: SLATE, paddingBottom: 2 }}>
              {monthWeeks.length} week{monthWeeks.length !== 1 ? 's' : ''} aggregated
            </span>
          )}
        </div>

        {/* ── Summary cards (always all-PAO totals) ─────────────────────── */}
        <div>
          <SectionDivider>
            Bill Summary — {selMonth}{selWeek !== ALL ? ` · ${selWeek}` : ''}
          </SectionDivider>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <SummaryCard label="Total Bills"  count={totals.totalBills}  amount={totals.totalAmount}  accent={BLUE} />
            <SummaryCard label="Normal Bills" count={totals.normalBills} amount={totals.normalAmount}
              countPct={totals.normalBillPct} amountPct={totals.normalAmtPct} accent={AMBER} />
            <SummaryCard label="E-Bills" count={totals.ebillCount} amount={totals.ebillAmount}
              countPct={totals.ebillBillPct} amountPct={totals.ebillAmtPct} accent={GREEN} />
          </div>
        </div>

        {/* ── PAO Bill Type (only when specific PAO selected) ──────────── */}
        {selPao !== ALL && (
          <div>
            {/* PAO banner */}
            <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #FFFFFF)', borderRadius: 12, padding: '14px 20px', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 4, height: 24, background: BLUE, borderRadius: 2, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.6rem', fontFamily: 'JetBrains Mono', color: BLUE, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Selected PAO</p>
                <p style={{ fontFamily: 'Rajdhani', fontSize: '1.1rem', fontWeight: 700, color: '#1E293B' }}>{selectedPaoName}</p>
              </div>
              <button onClick={() => setSelPao(ALL)}
                style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono', color: BLUE, background: '#DBEAFE', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                ✕ View All
              </button>
            </div>

            <SectionDivider>Bill Type</SectionDivider>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              <BillTypeCard label="Total Bills" count={selectedEbmPao?.total_bills} amount={selectedEbmPao?.total_amount} accent={BLUE} />
              <BillTypeCard label="Normal Bills" count={selectedEbmPao?.normal_bills} amount={selectedEbmPao?.normal_amount}
                countPct={pct(selectedEbmPao?.normal_bills || 0, selectedEbmPao?.total_bills || 0)} accent={AMBER} />
              <BillTypeCard label="E-Bills" count={selectedEbmPao?.ebill_count} amount={selectedEbmPao?.ebill_amount}
                countPct={pct(selectedEbmPao?.ebill_count || 0, selectedEbmPao?.total_bills || 0)} accent={GREEN} />
            </div>
          </div>
        )}

        {/* ── Bill Status (always shown, filtered by PAO) ───────────────── */}
        <div>
          <SectionDivider>
            Bill Status{selPao !== ALL ? ` — ${selectedPaoName}` : ' — All PAOs'}
          </SectionDivider>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {STATUS_META.map(s => (
              <StatusCard key={s.key} label={s.label} count={statusData[s.key]} color={s.color} />
            ))}
          </div>
        </div>

        {/* ── Pending breakdown by PAO (collapsible) ───────────────────── */}
        <div>
          <SectionDivider
            open={pendingOpen}
            onToggle={() => setPendingOpen(v => !v)}
          >Pending Bills — PAO Breakdown</SectionDivider>
          {pendingOpen && <PendingBreakdownTable paos={totalDelayPaos} />}
        </div>

        {/* ── Delay Distribution (always shown, filtered by PAO) ────────── */}
        <div>
          <SectionDivider>
            Delay Distribution{selPao !== ALL ? ` — ${selectedPaoName}` : ' — All PAOs'}
          </SectionDivider>
          {(delayData?.total_bills_token || 0) === 0 ? (
            <p style={{ fontFamily: 'Inter', fontSize: '0.8rem', color: SLATE, textAlign: 'center', padding: '16px 0' }}>No delay data for this selection</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
              {BUCKET_COLS.map(b => (
                <BucketCard key={b.key}
                  label={b.label} desc={b.desc} color={b.color}
                  count={delayData?.[`${b.key}_bills`] || 0}
                  total={delayData?.total_bills_token || 0}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Performance Insights — always shown ───────────────────────── */}
        <div>
          <SectionDivider>Performance Insights — Top 3 Best &amp; Worst</SectionDivider>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: '1.05rem' }}>🏆</span>
                <span style={{ fontFamily: 'Rajdhani', fontSize: '0.85rem', fontWeight: 700, color: '#059669', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Best 3 Performers</span>
                <span style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', color: SLATE }}>by T0 rate</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {best3.length === 0
                  ? <p style={{ fontSize: '0.8rem', color: SLATE }}>No data for this period</p>
                  : best3.map((p, i) => <PerformerCard key={p.pao_code || p.pao} rank={i + 1} data={p} isGood={true} />)
                }
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: '1.05rem' }}>⚠️</span>
                <span style={{ fontFamily: 'Rajdhani', fontSize: '0.85rem', fontWeight: 700, color: '#DC2626', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Worst 3 Performers</span>
                <span style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', color: SLATE }}>by T4+ rate</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {worst3.length === 0
                  ? <p style={{ fontSize: '0.8rem', color: SLATE }}>No data for this period</p>
                  : worst3.map((p, i) => <PerformerCard key={p.pao_code || p.pao} rank={i + 1} data={p} isGood={false} />)
                }
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
