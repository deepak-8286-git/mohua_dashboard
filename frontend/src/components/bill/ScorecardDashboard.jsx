import { useState, useMemo } from 'react'

const SLATE  = '#64748B'
const ALL    = '__all__'
const BUCKETS = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T5Plus']

function pct2(n, d) { return d > 0 ? +(n / d * 100).toFixed(2) : 0 }
function fmt(n)  { return n != null ? Number(n).toLocaleString('en-IN') : '—' }
function fmtCr(n) {
  if (n == null) return '—'
  if (n === 0) return '₹0.00 Cr'
  return `₹${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} Cr`
}
function getMonth(period) {
  const m = period?.match(/^([A-Za-z]+)\s+[\d\s–\-]+,?\s*(\d{4})/)
  return m ? `${m[1]} ${m[2]}` : (period?.split(' ')[0] ?? '')
}

// ── Aggregation ───────────────────────────────────────────────────────────────

function aggregateScorecard(weeksList) {
  let totalBills = 0, lt3Bills = 0, totalAmount = 0, lt3Amount = 0
  for (const w of weeksList) {
    for (const type of ['delay_normal', 'delay_ebill']) {
      for (const p of (w[type]?.paos ?? [])) {
        // Use sum of T-buckets (disposed bills) not total_bills_token (includes pending)
        totalBills  += BUCKETS.reduce((s, b) => s + (p[`${b}_bills`] || 0), 0)
        lt3Bills    += (p.T0_bills || 0) + (p.T1_bills || 0) + (p.T2_bills || 0)
        totalAmount += BUCKETS.reduce((s, b) => s + (p[`${b}_amount`] || 0), 0)
        lt3Amount   += (p.T0_amount || 0) + (p.T1_amount || 0) + (p.T2_amount || 0)
      }
    }
  }
  const billsPct  = pct2(lt3Bills, totalBills)
  const amountPct = pct2(lt3Amount, totalAmount)
  return {
    totalBills, lt3Bills, billsPct,
    totalAmount, lt3Amount, amountPct,
    b41: billsPct  >= 95 ? 2 : 0,
    b42: amountPct >= 95 ? 2 : 0,
  }
}

function aggregatePaoScores(weeksList) {
  const map = {}
  for (const w of weeksList) {
    for (const type of ['delay_normal', 'delay_ebill']) {
      for (const p of (w[type]?.paos ?? [])) {
        const key = p.pao_code || p.pao
        if (!map[key]) map[key] = { pao: p.pao, pao_code: p.pao_code,
          totalBills: 0, lt3Bills: 0, totalAmount: 0, lt3Amount: 0 }
        map[key].totalBills  += BUCKETS.reduce((s, b) => s + (p[`${b}_bills`] || 0), 0)
        map[key].lt3Bills    += (p.T0_bills || 0) + (p.T1_bills || 0) + (p.T2_bills || 0)
        map[key].totalAmount += BUCKETS.reduce((s, b) => s + (p[`${b}_amount`] || 0), 0)
        map[key].lt3Amount   += (p.T0_amount || 0) + (p.T1_amount || 0) + (p.T2_amount || 0)
      }
    }
  }
  return Object.values(map)
    .filter(p => p.totalBills > 0)
    .map(p => ({
      ...p,
      billsPct:  pct2(p.lt3Bills, p.totalBills),
      amountPct: pct2(p.lt3Amount, p.totalAmount),
    }))
}

// ── UI Components ─────────────────────────────────────────────────────────────

function SectionDivider({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <span style={{ fontSize: '0.6rem', fontFamily: 'JetBrains Mono', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#FFFFFF', fontWeight: 700, whiteSpace: 'nowrap', background: '#334155', padding: '3px 9px', borderRadius: 4 }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: '#CBD5E1' }} />
    </div>
  )
}

function TotalScoreBanner({ score, max }) {
  const ratio  = score / max
  const color  = ratio === 1 ? '#059669' : ratio >= 0.5 ? '#D97706' : '#DC2626'
  const label  = ratio === 1 ? 'Full Marks' : ratio >= 0.5 ? 'Partial' : 'Below Norm'
  const tint   = color + '1a'
  return (
    <div style={{ background: `linear-gradient(135deg, ${tint} 0%, #FFFFFF 65%)`, border: `2px solid ${color}`, borderRadius: 16, padding: '18px 28px', display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontFamily: 'Rajdhani', fontSize: '4rem', fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontFamily: 'Rajdhani', fontSize: '1.8rem', fontWeight: 600, color: SLATE }}> / {max}</span>
      </div>
      <div>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: SLATE, textTransform: 'uppercase', letterSpacing: '0.1em' }}>B4 Total Score</p>
        <p style={{ fontFamily: 'Rajdhani', fontSize: '1.2rem', fontWeight: 700, color, marginTop: 2 }}>{label}</p>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', color: SLATE, marginTop: 3 }}>Bills disposed in &lt;3 days ≥ 95%</p>
      </div>
    </div>
  )
}

function ScoreCircle({ score, max }) {
  const color = score === max ? '#059669' : '#DC2626'
  return (
    <div style={{ width: 66, height: 66, borderRadius: '50%', background: `linear-gradient(135deg, ${color}20, ${color}08)`, border: `3px solid ${color}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontFamily: 'Rajdhani', fontSize: '1.7rem', fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.48rem', color: SLATE }}>/ {max}</span>
    </div>
  )
}

function MetricCell({ label, value }) {
  return (
    <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.56rem', color: SLATE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{label}</p>
      <p style={{ fontFamily: 'Rajdhani', fontSize: '1.35rem', fontWeight: 700, color: '#1E293B', lineHeight: 1 }}>{value}</p>
    </div>
  )
}

function B4ScoreCard({ title, totalLabel, totalValue, lt3Label, lt3Value, percentage, score, maxScore }) {
  const passed = percentage >= 95
  const clr    = passed ? '#059669' : '#DC2626'
  const tint   = clr + '20'
  return (
    <div style={{ background: `linear-gradient(145deg, ${tint} 0%, #FFFFFF 55%)`, borderRadius: 14, borderTop: `4px solid ${clr}`, padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.09)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <p style={{ fontFamily: 'Rajdhani', fontSize: '1.05rem', fontWeight: 700, color: '#1E293B', lineHeight: 1.3, flex: 1, paddingRight: 12 }}>{title}</p>
        <ScoreCircle score={score} max={maxScore} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <MetricCell label={totalLabel} value={totalValue} />
        <MetricCell label={lt3Label}   value={lt3Value} />
        <div style={{ background: clr + '18', borderRadius: 8, padding: '10px 14px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.56rem', color: SLATE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Disposal %</p>
          <p style={{ fontFamily: 'Rajdhani', fontSize: '2rem', fontWeight: 800, color: clr, lineHeight: 1 }}>{percentage}%</p>
        </div>
      </div>
    </div>
  )
}

// ── PAO Scorecard Table ───────────────────────────────────────────────────────

const GRID = '28px 1fr 84px 84px 68px 40px 110px 110px 68px 40px 52px'

function PaoScorecardTable({ paos }) {
  const sorted = useMemo(() =>
    [...paos].sort((a, b) => {
      const sa = (a.billsPct >= 95 ? 2 : 0) + (a.amountPct >= 95 ? 2 : 0)
      const sb = (b.billsPct >= 95 ? 2 : 0) + (b.amountPct >= 95 ? 2 : 0)
      return sb - sa || b.billsPct - a.billsPct
    }),
  [paos])

  if (!sorted.length) return (
    <p style={{ fontFamily: 'Inter', fontSize: '0.8rem', color: SLATE, textAlign: 'center', padding: '20px 0' }}>No data for this period</p>
  )

  const subHdrs = ['#', 'PAO Name', 'Total Bills', '< 3 Days', '%', '★', 'Total Value', 'Value < 3 Days', '%', '★', 'Score']

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', border: '1px solid #E2E8F0' }}>

      {/* Group header */}
      <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 356px 368px 52px', background: '#1E293B', padding: '9px 18px', alignItems: 'center' }}>
        <span />
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PAO</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>B4.1 — Number of Bills in &lt;3 Days</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: '#6EE7B7', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>B4.2 — Value of Bills in &lt;3 Days</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Total</span>
      </div>

      {/* Sub-header */}
      <div style={{ display: 'grid', gridTemplateColumns: GRID, background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', padding: '7px 18px', alignItems: 'center' }}>
        {subHdrs.map((h, i) => (
          <span key={i} style={{ fontSize: '0.54rem', fontFamily: 'JetBrains Mono', color: SLATE, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i < 2 ? 'left' : 'right' }}>{h}</span>
        ))}
      </div>

      {/* Data rows */}
      <div style={{ maxHeight: 480, overflowY: 'auto' }}>
        {sorted.map((p, i) => {
          const b41    = p.billsPct  >= 95 ? 2 : 0
          const b42    = p.amountPct >= 95 ? 2 : 0
          const total  = b41 + b42
          const tColor = total === 4 ? '#059669' : total === 2 ? '#D97706' : '#DC2626'

          return (
            <div key={p.pao_code || p.pao}
              style={{ display: 'grid', gridTemplateColumns: GRID, padding: '9px 18px', alignItems: 'center', borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#FFFFFF' : '#FAFBFC', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F0F9FF'}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#FFFFFF' : '#FAFBFC'}
            >
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', color: '#94A3B8' }}>{i + 1}</span>

              <span style={{ fontFamily: 'Inter', fontSize: '0.77rem', fontWeight: 500, color: '#1E293B', paddingRight: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.pao}
              </span>

              {/* B4.1 columns */}
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: SLATE, textAlign: 'right', paddingRight: 6 }}>{fmt(p.totalBills)}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: '#3B82F6', textAlign: 'right', paddingRight: 6 }}>{fmt(p.lt3Bills)}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', textAlign: 'right', paddingRight: 6, color: p.billsPct >= 95 ? '#059669' : '#DC2626', fontWeight: 600 }}>{p.billsPct}%</span>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ fontFamily: 'Rajdhani', fontSize: '0.9rem', fontWeight: 700, color: b41 === 2 ? '#059669' : '#DC2626', background: (b41 === 2 ? '#059669' : '#DC2626') + '15', borderRadius: 4, padding: '1px 6px', minWidth: 20, textAlign: 'center' }}>{b41}</span>
              </div>

              {/* B4.2 columns */}
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: SLATE, textAlign: 'right', paddingRight: 6 }}>{fmtCr(p.totalAmount)}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: '#059669', textAlign: 'right', paddingRight: 6 }}>{fmtCr(p.lt3Amount)}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', textAlign: 'right', paddingRight: 6, color: p.amountPct >= 95 ? '#059669' : '#DC2626', fontWeight: 600 }}>{p.amountPct}%</span>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ fontFamily: 'Rajdhani', fontSize: '0.9rem', fontWeight: 700, color: b42 === 2 ? '#059669' : '#DC2626', background: (b42 === 2 ? '#059669' : '#DC2626') + '15', borderRadius: 4, padding: '1px 6px', minWidth: 20, textAlign: 'center' }}>{b42}</span>
              </div>

              {/* Total score */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ fontFamily: 'Rajdhani', fontSize: '1rem', fontWeight: 800, color: tColor, background: tColor + '15', borderRadius: 6, padding: '2px 7px', textAlign: 'center' }}>{total}/4</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ScorecardDashboard({ data }) {
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

  const monthWeeks = useMemo(
    () => [...weeks].reverse().filter(w => getMonth(w.period) === selMonth),
    [weeks, selMonth]
  )

  const activePeriod = useMemo(
    () => selWeek === ALL ? monthWeeks : monthWeeks.filter(w => w.period === selWeek),
    [monthWeeks, selWeek]
  )

  const sc       = useMemo(() => aggregateScorecard(activePeriod), [activePeriod])
  const paoScores = useMemo(() => aggregatePaoScores(activePeriod), [activePeriod])
  const total    = sc.b41 + sc.b42

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#F1F5F9' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="filter-label">Month</span>
            <select className="filter-select" value={selMonth}
              onChange={e => { setSelMonth(e.target.value); setSelWeek(ALL) }}>
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
          {selWeek === ALL && (
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', color: SLATE, paddingBottom: 2 }}>
              {monthWeeks.length} week{monthWeeks.length !== 1 ? 's' : ''} aggregated
            </span>
          )}
        </div>

        {/* B4 score section */}
        <div>
          <SectionDivider>B4 — Disposal of Bills in &lt;3 Days</SectionDivider>
          <div style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>
            <TotalScoreBanner score={total} max={4} />
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <B4ScoreCard
                title="Number of Bills disposed in < 3 days (T0 + T1 + T2)"
                totalLabel="Total Bills Disposed"
                totalValue={fmt(sc.totalBills)}
                lt3Label="Bills in < 3 Days"
                lt3Value={fmt(sc.lt3Bills)}
                percentage={sc.billsPct}
                score={sc.b41}
                maxScore={2}
              />
              <B4ScoreCard
                title="Value of Bills disposed in < 3 days (T0 + T1 + T2)"
                totalLabel="Total Value Disposed"
                totalValue={fmtCr(sc.totalAmount)}
                lt3Label="Value in < 3 Days"
                lt3Value={fmtCr(sc.lt3Amount)}
                percentage={sc.amountPct}
                score={sc.b42}
                maxScore={2}
              />
            </div>
          </div>
        </div>

        {/* PAO-wise scorecard */}
        <div>
          <SectionDivider>PAO-wise Scorecard</SectionDivider>
          <PaoScorecardTable paos={paoScores} />
        </div>

      </div>
    </div>
  )
}
