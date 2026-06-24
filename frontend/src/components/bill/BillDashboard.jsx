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
  { key: 'closed',    label: 'Closed',    color: '#059669' },
  { key: 'pending',   label: 'Pending',   color: '#D97706' },
  { key: 'returned',  label: 'Returned',  color: '#DC2626' },
  { key: 'cancelled', label: 'Cancelled', color: '#3B82F6' },
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

// ── Aggregation ──────────────────────────────────────────────────────────────

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
      map[key] = { pao: p.pao, pao_code: p.pao_code, total_bills_token: 0 }
      BUCKET_COLS.forEach(b => { map[key][`${b.key}_bills`] = 0 })
    }
    map[key].total_bills_token += p.total_bills_token || 0
    BUCKET_COLS.forEach(b => { map[key][`${b.key}_bills`] += p[`${b.key}_bills`] || 0 })
  }
  normalPaos.forEach(add); ebillPaos.forEach(add)
  return Object.values(map)
}

// ── UI components ─────────────────────────────────────────────────────────────

function SectionDivider({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <span style={{
        fontSize: '0.65rem', fontFamily: 'JetBrains Mono', letterSpacing: '0.12em',
        textTransform: 'uppercase', color: SLATE, fontWeight: 700, whiteSpace: 'nowrap',
      }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
    </div>
  )
}

function SummaryCard({ label, count, amount, countPct, amountPct, accent }) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 12, borderTop: `3px solid ${accent}`,
      padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    }}>
      <p style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', letterSpacing: '0.08em', textTransform: 'uppercase', color: SLATE, fontWeight: 600, marginBottom: 10 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontFamily: 'Rajdhani', fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: accent }}>{fmt(count)}</span>
        {countPct != null && <span style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', color: SLATE }}>{countPct}% of bills</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', marginTop: 10, paddingTop: 8, gap: 8 }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: '#334155' }}>{fmtAmt(amount)}</span>
        {amountPct != null && <span style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', color: SLATE }}>{amountPct}% of amt</span>}
      </div>
    </div>
  )
}

function BillTypeCard({ label, count, amount, countPct, accent }) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 10, borderTop: `3px solid ${accent}`,
      padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <p style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', letterSpacing: '0.08em', textTransform: 'uppercase', color: SLATE, fontWeight: 600, marginBottom: 8 }}>{label}</p>
      <p style={{ fontFamily: 'Rajdhani', fontSize: '1.7rem', fontWeight: 700, lineHeight: 1, color: accent }}>{fmt(count)}</p>
      {countPct != null && (
        <p style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', color: SLATE, marginTop: 3 }}>{countPct}% of bills</p>
      )}
      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', color: '#334155', borderTop: '1px solid #F1F5F9', marginTop: 8, paddingTop: 8 }}>{fmtAmt(amount)}</p>
    </div>
  )
}

function StatusCard({ label, count, color }) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 10, borderLeft: `4px solid ${color}`,
      padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <p style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', letterSpacing: '0.08em', textTransform: 'uppercase', color: SLATE, fontWeight: 600, marginBottom: 8 }}>{label}</p>
      <p style={{ fontFamily: 'Rajdhani', fontSize: '1.7rem', fontWeight: 700, color, lineHeight: 1 }}>{fmt(count)}</p>
    </div>
  )
}

function BucketCard({ label, desc, count, total, color }) {
  const percentage = pct(count, total)
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 10, padding: '14px 14px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #F1F5F9',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontFamily: 'Rajdhani', fontSize: '1.1rem', fontWeight: 700, color }}>{label}</span>
        <span style={{ fontSize: '0.58rem', color: SLATE, fontFamily: 'JetBrains Mono' }}>{desc}</span>
      </div>
      <p style={{ fontFamily: 'Rajdhani', fontSize: '1.8rem', fontWeight: 700, color, lineHeight: 1 }}>{percentage}%</p>
      <p style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', color: SLATE, marginTop: 3 }}>{fmt(count)} bills</p>
      <div style={{ marginTop: 10, height: 4, background: '#F1F5F9', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${Math.min(100, percentage)}%`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  )
}

function PerformerCard({ rank, pao, totalBills, t0Pct, latePct, isGood }) {
  const accentColor = isGood ? '#059669' : '#DC2626'
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 10, borderLeft: `4px solid ${accentColor}`,
      padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.3rem', color: accentColor, lineHeight: 1, minWidth: 22 }}>{rank}</span>
        <span style={{ fontFamily: 'Inter', fontSize: '0.8rem', fontWeight: 600, color: '#1E293B', lineHeight: 1.4, flex: 1 }}>{pao}</span>
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        <div>
          <p style={{ fontSize: '0.58rem', fontFamily: 'JetBrains Mono', color: SLATE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>T0 Same-day</p>
          <p style={{ fontFamily: 'Rajdhani', fontSize: '1.1rem', fontWeight: 700, color: '#059669', lineHeight: 1 }}>{t0Pct}%</p>
        </div>
        <div>
          <p style={{ fontSize: '0.58rem', fontFamily: 'JetBrains Mono', color: SLATE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>T4+ Delayed</p>
          <p style={{ fontFamily: 'Rajdhani', fontSize: '1.1rem', fontWeight: 700, color: '#DC2626', lineHeight: 1 }}>{latePct}%</p>
        </div>
        <div>
          <p style={{ fontSize: '0.58rem', fontFamily: 'JetBrains Mono', color: SLATE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Total Bills</p>
          <p style={{ fontFamily: 'Rajdhani', fontSize: '1.1rem', fontWeight: 700, color: '#334155', lineHeight: 1 }}>{fmt(totalBills)}</p>
        </div>
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

  const [selMonth, setSelMonth] = useState(() => months[0] ?? '')
  const [selWeek,  setSelWeek]  = useState(ALL)
  const [selPao,   setSelPao]   = useState(ALL)

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

  // Summary totals (all PAOs combined)
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

  // All EBM PAOs (for filter list)
  const allEbmPaos = useMemo(() => aggregateEbmPaos(activePeriod), [activePeriod])

  // Delay PAOs (all, for Best/Worst section)
  const normalDelayPaos = useMemo(() => aggregateDelayPaos(activePeriod, 'normal'), [activePeriod])
  const ebillDelayPaos  = useMemo(() => aggregateDelayPaos(activePeriod, 'ebill'),  [activePeriod])
  const totalDelayPaos  = useMemo(() => combinePaos(normalDelayPaos, ebillDelayPaos), [normalDelayPaos, ebillDelayPaos])

  // Selected PAO data
  const selectedEbmPao = useMemo(
    () => selPao === ALL ? null : allEbmPaos.find(p => (p.pao_code || p.pao_name) === selPao) ?? null,
    [allEbmPaos, selPao]
  )
  const selectedDelayPao = useMemo(
    () => selPao === ALL ? null : totalDelayPaos.find(p => (p.pao_code || p.pao) === selPao) ?? null,
    [totalDelayPaos, selPao]
  )
  const selectedStatus = useMemo(
    () => aggregateStatus(activePeriod, selPao),
    [activePeriod, selPao]
  )

  // Best 3 / Worst 3 — always from totalDelayPaos, period-filtered only
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

        {/* ── Filters ────────────────────────────────────────────────────── */}
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

        {/* ── Summary cards ──────────────────────────────────────────────── */}
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

        {/* ── PAO detail or prompt ───────────────────────────────────────── */}
        {selPao === ALL ? (
          <div style={{
            background: '#FFFFFF', borderRadius: 12, padding: '28px 32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center',
          }}>
            <span style={{ fontSize: '1.6rem', marginBottom: 2 }}>📋</span>
            <p style={{ fontFamily: 'Rajdhani', fontSize: '1.1rem', fontWeight: 700, color: '#334155', letterSpacing: '0.03em' }}>
              Select a PAO to view detailed breakdown
            </p>
            <p style={{ fontFamily: 'Inter', fontSize: '0.8rem', color: SLATE, maxWidth: 400 }}>
              Choose a PAO from the dropdown above to see bill type, status, and delay bucket distribution for that office
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* PAO name header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 4, height: 22, background: BLUE, borderRadius: 2 }} />
              <span style={{ fontFamily: 'Rajdhani', fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', letterSpacing: '0.04em' }}>
                {selectedPaoName}
              </span>
            </div>

            {/* Bill Type */}
            <div>
              <SectionDivider>Bill Type</SectionDivider>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                <BillTypeCard label="Total Bills" count={selectedEbmPao?.total_bills} amount={selectedEbmPao?.total_amount} accent={BLUE} />
                <BillTypeCard label="Normal Bills" count={selectedEbmPao?.normal_bills} amount={selectedEbmPao?.normal_amount}
                  countPct={pct(selectedEbmPao?.normal_bills || 0, selectedEbmPao?.total_bills || 0)} accent={AMBER} />
                <BillTypeCard label="E-Bills" count={selectedEbmPao?.ebill_count} amount={selectedEbmPao?.ebill_amount}
                  countPct={pct(selectedEbmPao?.ebill_count || 0, selectedEbmPao?.total_bills || 0)} accent={GREEN} />
              </div>
            </div>

            {/* Bill Status */}
            <div>
              <SectionDivider>Bill Status</SectionDivider>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {STATUS_META.map(s => (
                  <StatusCard key={s.key} label={s.label} count={selectedStatus[s.key]} color={s.color} />
                ))}
              </div>
            </div>

            {/* Delay Distribution */}
            <div>
              <SectionDivider>Delay Distribution</SectionDivider>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
                {BUCKET_COLS.map(b => (
                  <BucketCard key={b.key}
                    label={b.label} desc={b.desc} color={b.color}
                    count={selectedDelayPao?.[`${b.key}_bills`] || 0}
                    total={selectedDelayPao?.total_bills_token || 0}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Performance Insights — always shown ───────────────────────── */}
        <div>
          <SectionDivider>Performance Insights</SectionDivider>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Best 3 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: '1.05rem' }}>🏆</span>
                <span style={{ fontFamily: 'Rajdhani', fontSize: '0.85rem', fontWeight: 700, color: '#059669', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Best 3 Performers</span>
                <span style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', color: SLATE }}>by T0 rate</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {best3.length === 0
                  ? <p style={{ fontSize: '0.8rem', color: SLATE, fontFamily: 'Inter' }}>No data for this period</p>
                  : best3.map((p, i) => (
                    <PerformerCard key={p.pao_code || p.pao} rank={i + 1}
                      pao={p.pao} totalBills={p.total_bills_token}
                      t0Pct={pct(p.T0_bills || 0, p.total_bills_token)}
                      latePct={pct((p.T4_bills||0)+(p.T5_bills||0)+(p.T5Plus_bills||0), p.total_bills_token)}
                      isGood={true}
                    />
                  ))}
              </div>
            </div>

            {/* Worst 3 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: '1.05rem' }}>⚠️</span>
                <span style={{ fontFamily: 'Rajdhani', fontSize: '0.85rem', fontWeight: 700, color: '#DC2626', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Worst 3 Performers</span>
                <span style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', color: SLATE }}>by T4+ rate</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {worst3.length === 0
                  ? <p style={{ fontSize: '0.8rem', color: SLATE, fontFamily: 'Inter' }}>No data for this period</p>
                  : worst3.map((p, i) => (
                    <PerformerCard key={p.pao_code || p.pao} rank={i + 1}
                      pao={p.pao} totalBills={p.total_bills_token}
                      t0Pct={pct(p.T0_bills || 0, p.total_bills_token)}
                      latePct={pct((p.T4_bills||0)+(p.T5_bills||0)+(p.T5Plus_bills||0), p.total_bills_token)}
                      isGood={false}
                    />
                  ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
