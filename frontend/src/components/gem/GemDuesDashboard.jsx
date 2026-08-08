import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, LabelList,
} from 'recharts'

// ── Design tokens ─────────────────────────────────────────────────────────────
const NAVY         = '#1E293B'
const SLATE        = '#64748B'
const RED          = '#DC2626'
const GREEN        = '#059669'
const BLUE         = '#3B82F6'
const AMBER        = '#D97706'
const PURPLE       = '#7C3AED'
const TEAL         = '#0D9488'
const ORANGE       = '#EA580C'

const MSE_COLOR    = BLUE
const OTHERS_COLOR = PURPLE
const BUCKET_COLORS = [GREEN, AMBER, ORANGE, RED, PURPLE]

function fmtCr(v) {
  if (v === null || v === undefined) return '—'
  return `₹${Number(v).toFixed(2)} Cr`
}

// ── Shared UI atoms ───────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <span style={{ fontSize: '0.6rem', fontFamily: 'JetBrains Mono', letterSpacing: '0.12em',
        textTransform: 'uppercase', color: '#fff', fontWeight: 700,
        background: NAVY, padding: '3px 9px', borderRadius: 4, whiteSpace: 'nowrap' }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: '#CBD5E1' }} />
    </div>
  )
}

function KpiCard({ label, value, color, sub }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 130,
      border: `1px solid ${color}44`, borderTop: `3px solid ${color}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', letterSpacing: '0.1em',
        textTransform: 'uppercase', color: SLATE, marginBottom: 6 }}>{label}</p>
      <p style={{ fontFamily: 'Rajdhani', fontSize: '1.6rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontFamily: 'Inter', fontSize: '0.65rem', color: SLATE, marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

function DeltaBadge({ delta }) {
  if (delta === null || delta === undefined) return <span style={{ color: SLATE, fontSize: '0.65rem' }}>—</span>
  const improved = delta < 0
  const color = improved ? GREEN : RED
  const sign  = improved ? '▼' : '▲'
  return (
    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', fontWeight: 700,
      color, background: color + '15', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>
      {sign} ₹{Math.abs(delta).toFixed(2)} Cr
    </span>
  )
}

function MonthSelector({ months, sel, onChange, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="filter-label">{label}</span>
      <select className="filter-select" value={sel} onChange={e => onChange(e.target.value)}>
        {months.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  )
}

function ChartCard({ title, height = 300, children, legend }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '16px 20px',
      border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 24 }}>
      <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.6rem', letterSpacing: '0.1em',
        textTransform: 'uppercase', color: SLATE, marginBottom: 4 }}>{title}</p>
      {legend && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
          {legend.map(([l, c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
              <span style={{ fontFamily: 'Inter', fontSize: '0.68rem', color: SLATE }}>{l}</span>
            </div>
          ))}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>{children}</ResponsiveContainer>
    </div>
  )
}

// ── Top performers ────────────────────────────────────────────────────────────
function PerformerCards({ currentOrgs, prevOrgs }) {
  const deltas = useMemo(() => {
    if (!prevOrgs?.length) return []
    const prevMap = Object.fromEntries(prevOrgs.map(o => [o.org, o.total]))
    return currentOrgs
      .map(o => ({ org: o.org, curr: o.total, prev: prevMap[o.org] ?? null,
        delta: prevMap[o.org] != null ? o.total - prevMap[o.org] : null }))
      .filter(o => o.delta !== null)
      .sort((a, b) => a.delta - b.delta)
  }, [currentOrgs, prevOrgs])

  if (!deltas.length) return null
  const best  = deltas.slice(0, 3)
  const worst = deltas.slice(-3).reverse()

  function Card({ item, rank, type }) {
    const color = type === 'best' ? GREEN : RED
    return (
      <div style={{ background: '#fff', borderRadius: 8, padding: '10px 14px',
        border: `1px solid ${color}33`, borderLeft: `3px solid ${color}`, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ fontFamily: 'Inter', fontSize: '0.72rem', fontWeight: 600,
            color: NAVY, lineHeight: 1.3, flex: 1 }}>#{rank} {item.org}</span>
          <DeltaBadge delta={item.delta} />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.62rem', color: SLATE }}>
            Prev: {fmtCr(item.prev)}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.62rem', color: NAVY, fontWeight: 700 }}>
            Now: {fmtCr(item.curr)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 280 }}>
        <SectionLabel>🟢 Top 3 Improved (Decreased Pendency)</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {best.map((item, i) => <Card key={i} item={item} rank={i+1} type="best" />)}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 280 }}>
        <SectionLabel>🔴 Top 3 Deteriorated (Increased Pendency)</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {worst.map((item, i) => <Card key={i} item={item} rank={i+1} type="worst" />)}
        </div>
      </div>
    </div>
  )
}

// ── Overview — cross-month trend view ────────────────────────────────────────
function OverviewPage({ months }) {
  const latestMonth = months[months.length - 1]
  const prevMonth   = months.length > 1 ? months[months.length - 2] : null

  const latestOrgs = latestMonth?.dues?.orgs ?? []
  const prevOrgs   = prevMonth?.dues?.orgs  ?? []

  const grandTotal = latestOrgs.reduce((s, o) => s + o.total, 0)
  const grandMse   = latestOrgs.reduce((s, o) => s + o.mse,   0)
  const grandOther = latestOrgs.reduce((s, o) => s + o.others, 0)
  const prevGrand  = prevOrgs.reduce((s, o) => s + o.total, 0)

  // Trend across all months
  const trendData = months.map(m => ({
    month: m.month,
    total: +(m.dues?.orgs?.reduce((s, o) => s + o.total, 0) ?? 0).toFixed(2),
    mse:   +(m.dues?.orgs?.reduce((s, o) => s + o.mse,   0) ?? 0).toFixed(2),
    others:+(m.dues?.orgs?.reduce((s, o) => s + o.others, 0) ?? 0).toFixed(2),
  }))

  // Org breakdown — latest month grouped bars
  const orgChartData = [...latestOrgs]
    .sort((a, b) => b.total - a.total)
    .slice(0, 12)
    .map(o => ({
      name: o.org.length > 18 ? o.org.slice(0, 18) + '…' : o.org,
      mse: +o.mse.toFixed(2), others: +o.others.toFixed(2), total: +o.total.toFixed(2),
    }))

  const prevMap = Object.fromEntries(prevOrgs.map(o => [o.org, o]))
  const cols = prevOrgs.length ? '1fr 100px 100px 100px 110px' : '1fr 100px 100px 100px'

  return (
    <div>
      {/* KPIs for latest month */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <KpiCard label={`Total Pendency — ${latestMonth?.month}`} value={fmtCr(grandTotal)}
          color={TEAL} sub={prevGrand ? `Prev: ${fmtCr(prevGrand)}` : undefined} />
        <KpiCard label="MSE Dues" value={fmtCr(grandMse)} color={MSE_COLOR}
          sub={`${grandTotal ? ((grandMse/grandTotal)*100).toFixed(1) : 0}% of total`} />
        <KpiCard label="Others Dues" value={fmtCr(grandOther)} color={OTHERS_COLOR}
          sub={`${grandTotal ? ((grandOther/grandTotal)*100).toFixed(1) : 0}% of total`} />
        <KpiCard label="Organisations" value={latestOrgs.length} color={AMBER} />
        {prevGrand > 0 && (
          <KpiCard
            label="MoM Change"
            value={`${grandTotal - prevGrand >= 0 ? '+' : ''}${fmtCr(grandTotal - prevGrand)}`}
            color={grandTotal <= prevGrand ? GREEN : RED}
            sub={`${(((grandTotal - prevGrand) / prevGrand) * 100).toFixed(1)}%`}
          />
        )}
      </div>

      {/* Month-over-Month trend chart */}
      <ChartCard title="Month-over-Month Trend (₹ Cr)"
        legend={[['Total', '#CBD5E1'], ['MSE', MSE_COLOR], ['Others', OTHERS_COLOR]]}
        height={280}>
        <BarChart data={trendData} margin={{ top: 20, right: 16, left: 0, bottom: 10 }}
          barCategoryGap="35%" barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="month" tick={{ fontFamily: 'Inter', fontSize: 11, fill: SLATE }}
            axisLine={false} tickLine={false} />
          <YAxis tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: SLATE }}
            axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ fontFamily: 'Inter', fontSize: '0.75rem', background: NAVY,
            border: 'none', borderRadius: 6, color: '#fff' }}
            formatter={(v, name) => [`₹${v} Cr`, name]} />
          <Bar dataKey="total" name="Total" fill="#CBD5E1" radius={[3,3,0,0]}>
            <LabelList dataKey="total" position="top"
              style={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: SLATE }}
              formatter={v => `₹${v}`} />
          </Bar>
          <Bar dataKey="mse"    name="MSE"    fill={MSE_COLOR}    radius={[3,3,0,0]} />
          <Bar dataKey="others" name="Others" fill={OTHERS_COLOR} radius={[3,3,0,0]} />
        </BarChart>
      </ChartCard>

      {/* Top performers vs previous month */}
      <PerformerCards currentOrgs={latestOrgs} prevOrgs={prevOrgs} />

      {/* Org-level breakdown for latest month */}
      <ChartCard title={`Organisation-wise Pendency — ${latestMonth?.month} (₹ Cr) — Top 12`}
        legend={[['Total', '#CBD5E1'], ['MSE', MSE_COLOR], ['Others', OTHERS_COLOR]]}
        height={320}>
        <BarChart data={orgChartData} margin={{ top: 20, right: 8, left: 0, bottom: 70 }}
          barCategoryGap="30%" barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontFamily: 'Inter', fontSize: 10, fill: SLATE }}
            axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} />
          <YAxis tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: SLATE }}
            axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ fontFamily: 'Inter', fontSize: '0.75rem', background: NAVY,
            border: 'none', borderRadius: 6, color: '#fff' }}
            formatter={(v, name) => [`₹${v} Cr`, name]} />
          <Bar dataKey="total" name="Total" fill="#CBD5E1" radius={[3,3,0,0]}>
            <LabelList dataKey="total" position="top"
              style={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: SLATE }}
              formatter={v => `₹${v}`} />
          </Bar>
          <Bar dataKey="mse"    name="MSE"    fill={MSE_COLOR}    radius={[3,3,0,0]} />
          <Bar dataKey="others" name="Others" fill={OTHERS_COLOR} radius={[3,3,0,0]} />
        </BarChart>
      </ChartCard>

      {/* Table with all months as columns */}
      <SectionLabel>Organisation-wise Dues — {latestMonth?.month}</SectionLabel>
      <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: cols, background: NAVY, padding: '8px 12px', gap: 8 }}>
          {['Organisation', 'MSE (Cr)', 'Others (Cr)', 'Total (Cr)', prevOrgs.length ? 'MoM Δ' : null]
            .filter(Boolean).map(h => (
            <span key={h} style={{ fontFamily: 'JetBrains Mono', fontSize: '0.55rem',
              letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)',
              textAlign: h !== 'Organisation' ? 'right' : 'left' }}>{h}</span>
          ))}
        </div>
        {[...latestOrgs].sort((a, b) => b.total - a.total).map((o, i) => {
          const prev  = prevMap[o.org]
          const delta = prev ? o.total - prev.total : null
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: cols,
              background: i%2===0 ? '#fff' : '#F8FAFC',
              padding: '7px 12px', gap: 8, borderBottom: '1px solid #F1F5F9', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Inter', fontSize: '0.72rem', color: NAVY, fontWeight: 500 }}>{o.org}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: MSE_COLOR, textAlign: 'right' }}>{fmtCr(o.mse)}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: OTHERS_COLOR, textAlign: 'right' }}>{fmtCr(o.others)}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: NAVY, fontWeight: 700, textAlign: 'right' }}>{fmtCr(o.total)}</span>
              {prevOrgs.length > 0 && <div style={{ textAlign: 'right' }}><DeltaBadge delta={delta} /></div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Office drill-down page ────────────────────────────────────────────────────
function OfficePage({ months }) {
  const monthLabels = months.map(m => m.month)
  const [selMonth, setSelMonth] = useState(monthLabels[monthLabels.length - 1] ?? '')

  const currentMonth = months.find(m => m.month === selMonth) ?? null
  const currentIdx   = months.findIndex(m => m.month === selMonth)
  const prevMonth    = currentIdx > 0 ? months[currentIdx - 1] : null

  const orgList          = currentMonth?.dues?.orgs ?? []
  const officesByOrg     = currentMonth?.dues?.offices_by_org ?? {}
  const prevOfficesByOrg = prevMonth?.dues?.offices_by_org ?? {}

  const [selOrg, setSelOrg] = useState(() => {
    const cpwd = orgList.find(o => o.org.toLowerCase().includes('central public works'))
    return cpwd?.org ?? orgList[0]?.org ?? ''
  })

  const offices     = officesByOrg[selOrg] ?? []
  const prevOffices = prevOfficesByOrg[selOrg] ?? []
  const prevMap     = Object.fromEntries(prevOffices.map(o => [o.office, o]))

  const orgTotal  = offices.reduce((s, o) => s + o.total, 0)
  const orgMse    = offices.reduce((s, o) => s + o.mse, 0)
  const orgOthers = offices.reduce((s, o) => s + o.others, 0)

  const hasPrev = prevOffices.length > 0
  const cols    = hasPrev ? '1fr 100px 100px 100px 110px' : '1fr 100px 100px 100px'

  const chartData = [...offices].sort((a, b) => b.total - a.total).slice(0, 15)
    .map(o => ({
      name:   o.office.length > 22 ? o.office.slice(0, 22) + '…' : o.office,
      mse:    +o.mse.toFixed(2),
      others: +o.others.toFixed(2),
      total:  +o.total.toFixed(2),
    }))

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <MonthSelector months={monthLabels} sel={selMonth} onChange={v => {
  setSelMonth(v)
  const cpwd = orgList.find(o => o.org.toLowerCase().includes('central public works'))
  setSelOrg(cpwd?.org ?? orgList[0]?.org ?? '')
}} label="Month" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="filter-label">Organisation</span>
          <select className="filter-select" value={selOrg} onChange={e => setSelOrg(e.target.value)}
            style={{ minWidth: 280 }}>
            {[...orgList].sort((a, b) => b.total - a.total).map(o => (
              <option key={o.org} value={o.org}>{o.org} — {fmtCr(o.total)}</option>
            ))}
          </select>
        </div>
        {prevMonth && (
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.62rem', color: SLATE, paddingBottom: 6 }}>
            Comparing with: <strong style={{ color: NAVY }}>{prevMonth.month}</strong>
          </span>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <KpiCard label="Total Pendency" value={fmtCr(orgTotal)}  color={TEAL} />
        <KpiCard label="MSE"    value={fmtCr(orgMse)}    color={MSE_COLOR}
          sub={`${orgTotal ? ((orgMse/orgTotal)*100).toFixed(1) : 0}%`} />
        <KpiCard label="Others" value={fmtCr(orgOthers)} color={OTHERS_COLOR}
          sub={`${orgTotal ? ((orgOthers/orgTotal)*100).toFixed(1) : 0}%`} />
        <KpiCard label="Offices" value={offices.length} color={AMBER} />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <ChartCard title="Office-wise Pendency — Top 15"
          legend={[['MSE', MSE_COLOR], ['Others', OTHERS_COLOR]]}
          height={Math.max(240, chartData.length * 28)}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 60, left: 160, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
            <XAxis type="number" tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: SLATE }}
              axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={155}
              tick={{ fontFamily: 'Inter', fontSize: 10, fill: NAVY }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontFamily: 'Inter', fontSize: '0.75rem', background: NAVY,
              border: 'none', borderRadius: 6, color: '#fff' }}
              formatter={(v, name) => [`₹${v} Cr`, name]} />
            <Bar dataKey="mse"    name="MSE"    stackId="a" fill={MSE_COLOR} />
            <Bar dataKey="others" name="Others" stackId="a" fill={OTHERS_COLOR} radius={[0,3,3,0]}>
              <LabelList dataKey="total" position="right"
                style={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: SLATE }}
                formatter={v => `₹${v}`} />
            </Bar>
          </BarChart>
        </ChartCard>
      )}

      {/* Table */}
      <SectionLabel>Office-wise Dues — {selOrg}</SectionLabel>
      {offices.length === 0
        ? <p style={{ fontFamily: 'Inter', color: SLATE, fontSize: '0.8rem', padding: 16 }}>No office data available.</p>
        : (
          <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: cols, background: NAVY, padding: '8px 12px', gap: 8 }}>
              {['Office', 'MSE (Cr)', 'Others (Cr)', 'Total (Cr)', hasPrev ? 'MoM Δ' : null]
                .filter(Boolean).map(h => (
                <span key={h} style={{ fontFamily: 'JetBrains Mono', fontSize: '0.55rem',
                  letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)',
                  textAlign: h !== 'Office' ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>
            {[...offices].sort((a, b) => b.total - a.total).map((o, i) => {
              const prev  = prevMap[o.office]
              const delta = prev ? o.total - prev.total : null
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: cols,
                  background: i%2===0 ? '#fff' : '#F8FAFC',
                  padding: '7px 12px', gap: 8, borderBottom: '1px solid #F1F5F9', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Inter', fontSize: '0.72rem', color: NAVY }}>{o.office}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: MSE_COLOR, textAlign: 'right' }}>{fmtCr(o.mse)}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: OTHERS_COLOR, textAlign: 'right' }}>{fmtCr(o.others)}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: NAVY, fontWeight: 700, textAlign: 'right' }}>{fmtCr(o.total)}</span>
                  {hasPrev && <div style={{ textAlign: 'right' }}><DeltaBadge delta={delta} /></div>}
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}

// ── Aging analysis page ───────────────────────────────────────────────────────
function AgingPage({ months }) {
  const monthLabels = months.map(m => m.month)
  const [selMonth, setSelMonth] = useState(monthLabels[monthLabels.length - 1] ?? '')

  const currentMonth = months.find(m => m.month === selMonth) ?? null
  const currentIdx   = months.findIndex(m => m.month === selMonth)
  const prevMonth    = currentIdx > 0 ? months[currentIdx - 1] : null

  const agewise     = currentMonth?.agewise
  const prevAgewise = prevMonth?.agewise

  if (!agewise?.orgs?.length) return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <MonthSelector months={monthLabels} sel={selMonth} onChange={setSelMonth} label="Month" />
      </div>
      <p style={{ fontFamily: 'Inter', color: SLATE, padding: 20 }}>No agewise data for this month.</p>
    </div>
  )

  const buckets     = agewise.bucket_names
  const orgs        = agewise.orgs
  const grandTotal  = orgs.reduce((s, o) => s + o.total, 0)
  const bucketTotals = buckets.map(b => orgs.reduce((s, o) => s + (o.buckets[b] || 0), 0))

  const chartData = [...orgs].sort((a, b) => b.total - a.total).slice(0, 12).map(o => {
    const entry = { name: o.org.length > 18 ? o.org.slice(0, 18) + '…' : o.org, total: +o.total.toFixed(2) }
    buckets.forEach(b => { entry[b] = +(o.buckets[b] || 0).toFixed(2) })
    return entry
  })

  const ageCols  = buckets.map(() => '80px').join(' ')
  const tableCols = `1fr 90px ${ageCols}`

  return (
    <div>
      {/* Filter */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
        <MonthSelector months={monthLabels} sel={selMonth} onChange={setSelMonth} label="Month" />
        {prevMonth && (
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.62rem', color: SLATE, paddingBottom: 6 }}>
            Comparing with: <strong style={{ color: NAVY }}>{prevMonth.month}</strong>
          </span>
        )}
      </div>

      {/* Bucket KPIs */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {buckets.map((b, i) => (
          <KpiCard key={b} label={b} value={fmtCr(bucketTotals[i])}
            color={BUCKET_COLORS[i] || SLATE}
            sub={`${grandTotal ? ((bucketTotals[i]/grandTotal)*100).toFixed(1) : 0}% of total`} />
        ))}
      </div>

      {/* Grouped bar — total + age buckets */}
      <ChartCard title="Age-wise Distribution per Organisation (₹ Cr)"
        legend={[['Total', '#CBD5E1'], ...buckets.map((b, i) => [b, BUCKET_COLORS[i] || SLATE])]}
        height={320}>
        <BarChart data={chartData} margin={{ top: 20, right: 8, left: 0, bottom: 70 }}
          barCategoryGap="25%" barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontFamily: 'Inter', fontSize: 10, fill: SLATE }}
            axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} />
          <YAxis tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: SLATE }}
            axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ fontFamily: 'Inter', fontSize: '0.75rem', background: NAVY,
            border: 'none', borderRadius: 6, color: '#fff' }}
            formatter={(v, n) => [`₹${v} Cr`, n]} />
          <Bar dataKey="total" name="Total" fill="#CBD5E1" radius={[3,3,0,0]}>
            <LabelList dataKey="total" position="top"
              style={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: SLATE }}
              formatter={v => `₹${v}`} />
          </Bar>
          {buckets.map((b, i) => (
            <Bar key={b} dataKey={b} name={b} fill={BUCKET_COLORS[i] || SLATE} radius={[3,3,0,0]} />
          ))}
        </BarChart>
      </ChartCard>

      {/* Table */}
      <SectionLabel>Organisation-wise Aging Breakdown</SectionLabel>
      <div style={{ borderRadius: 8, overflow: 'auto', border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: tableCols, background: NAVY,
          padding: '8px 12px', gap: 8, minWidth: 600 }}>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.55rem', letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>Organisation</span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.55rem', letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', textAlign: 'right' }}>Total</span>
          {buckets.map((b, i) => (
            <span key={b} style={{ fontFamily: 'JetBrains Mono', fontSize: '0.55rem', letterSpacing: '0.06em',
              textTransform: 'uppercase', color: BUCKET_COLORS[i] || 'rgba(255,255,255,0.7)',
              textAlign: 'right', whiteSpace: 'nowrap' }}>{b}</span>
          ))}
        </div>
        {[...orgs].sort((a, b) => b.total - a.total).map((o, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: tableCols,
            background: i%2===0 ? '#fff' : '#F8FAFC', padding: '7px 12px',
            gap: 8, borderBottom: '1px solid #F1F5F9', alignItems: 'center', minWidth: 600 }}>
            <span style={{ fontFamily: 'Inter', fontSize: '0.72rem', color: NAVY, fontWeight: 500 }}>{o.org}</span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: NAVY, fontWeight: 700, textAlign: 'right' }}>{fmtCr(o.total)}</span>
            {buckets.map((b, bi) => (
              <span key={b} style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem',
                color: BUCKET_COLORS[bi] || SLATE, textAlign: 'right' }}>
                {o.buckets[b] ? fmtCr(o.buckets[b]) : '—'}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GemDuesDashboard({ data, initialTab = 'overview' }) {
  const months = data?.months ?? []

  if (!months.length) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'Inter', color: SLATE }}>No GeM dues data available.</p>
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: '#F1F5F9' }}>
      {initialTab === 'overview' && <OverviewPage months={months} />}
      {initialTab === 'offices'  && <OfficePage   months={months} />}
      {initialTab === 'aging'    && <AgingPage    months={months} />}
    </div>
  )
}
