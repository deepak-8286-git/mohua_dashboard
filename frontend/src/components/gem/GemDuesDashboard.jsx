import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, LabelList,
} from 'recharts'
import {
  ShoppingBag,
  TrendingUp,
  Building2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'

// ── Design tokens ─────────────────────────────────────────────────────────────
const NAVY         = '#0B152A'
const SLATE        = '#94A3B8'
const RED          = '#F43F5E'
const GREEN        = '#10B981'
const BLUE         = '#38BDF8'
const AMBER        = '#F59E0B'
const PURPLE       = '#A855F7'
const TEAL         = '#14B8A6'
const ORANGE       = '#FB923C'

const MSE_COLOR    = BLUE
const OTHERS_COLOR = PURPLE
const BUCKET_COLORS = [GREEN, AMBER, ORANGE, RED, PURPLE]

const TT_STYLE = {
  backgroundColor: 'rgba(12, 23, 44, 0.95)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: 8,
  color: '#F8FAFC',
  backdropFilter: 'blur(8px)',
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
}

function fmtCr(v) {
  if (v === null || v === undefined) return '—'
  return `₹${Number(v).toFixed(2)} Cr`
}

function SectionDivider({ children, icon: Icon, count }) {
  return (
    <div className="flex items-center gap-3 mb-3.5 select-none">
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

function KpiCard({ label, value, color, sub, icon: Icon }) {
  return (
    <div
      className="kpi-card flex-1 min-w-[130px]"
      style={{ '--kpi-accent': color }}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="font-mono text-[10px] font-bold tracking-wider uppercase text-slate-400">{label}</p>
        {Icon && <Icon size={14} style={{ color }} />}
      </div>
      <p className="font-display text-2xl md:text-3xl font-bold leading-none" style={{ color }}>{value}</p>
      {sub && <p className="font-body text-[10px] text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

function DeltaBadge({ delta }) {
  if (delta === null || delta === undefined) return <span className="text-slate-500 text-xs font-mono">—</span>
  const improved = delta < 0
  const color = improved ? GREEN : RED
  return (
    <span
      className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 whitespace-nowrap"
      style={{ color, background: color + '20', border: `1px solid ${color}35` }}
    >
      {improved ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
      ₹{Math.abs(delta).toFixed(2)} Cr
    </span>
  )
}

function MonthSelector({ months, sel, onChange, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="filter-label">{label}:</span>
      <select className="filter-select font-mono" value={sel} onChange={e => onChange(e.target.value)}>
        {months.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  )
}

function ChartCard({ title, height = 300, children, legend, icon: Icon }) {
  return (
    <div className="chart-card mb-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className="text-amber-400" />}
          <span className="font-mono text-xs uppercase font-bold text-slate-300">{title}</span>
        </div>
        {legend && (
          <div className="flex items-center gap-3 flex-wrap">
            {legend.map(([l, c]) => (
              <div key={l} className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                <span>{l}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={height}>{children}</ResponsiveContainer>
    </div>
  )
}

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
      <div
        className="p-3.5 rounded-xl border border-white/10 bg-[#0F1E3C]/80 backdrop-blur-md shadow-md"
        style={{ borderLeft: `4px solid ${color}` }}
      >
        <div className="flex justify-between items-start gap-2 mb-1.5">
          <span className="font-body text-xs font-semibold text-slate-200 truncate flex-1">
            #{rank} {item.org}
          </span>
          <DeltaBadge delta={item.delta} />
        </div>
        <div className="flex gap-4 font-mono text-[11px]">
          <span className="text-slate-400">Prev: <strong className="text-slate-300">{fmtCr(item.prev)}</strong></span>
          <span className="text-slate-300">Now: <strong className="text-white">{fmtCr(item.curr)}</strong></span>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div>
        <SectionDivider icon={TrendingUp}>Top 3 Improved (Decreased Pendency)</SectionDivider>
        <div className="space-y-2.5">
          {best.map((item, i) => <Card key={i} item={item} rank={i+1} type="best" />)}
        </div>
      </div>
      <div>
        <SectionDivider icon={TrendingUp}>Top 3 Deteriorated (Increased Pendency)</SectionDivider>
        <div className="space-y-2.5">
          {worst.map((item, i) => <Card key={i} item={item} rank={i+1} type="worst" />)}
        </div>
      </div>
    </div>
  )
}

// ── Overview Page ────────────────────────────────────────────────────────────
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

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <KpiCard label={`Total Pendency (${latestMonth?.month})`} value={fmtCr(grandTotal)} color={TEAL} icon={ShoppingBag} sub={prevGrand ? `Prev: ${fmtCr(prevGrand)}` : undefined} />
        <KpiCard label="MSE Dues" value={fmtCr(grandMse)} color={MSE_COLOR} icon={Building2} sub={`${grandTotal ? ((grandMse/grandTotal)*100).toFixed(1) : 0}% of total`} />
        <KpiCard label="Others Dues" value={fmtCr(grandOther)} color={OTHERS_COLOR} icon={Building2} sub={`${grandTotal ? ((grandOther/grandTotal)*100).toFixed(1) : 0}% of total`} />
        <KpiCard label="Organisations" value={latestOrgs.length} color={AMBER} icon={Layers} />
        {prevGrand > 0 && (
          <KpiCard
            label="MoM Net Delta"
            value={`${grandTotal - prevGrand >= 0 ? '+' : ''}${fmtCr(grandTotal - prevGrand)}`}
            color={grandTotal <= prevGrand ? GREEN : RED}
            icon={TrendingUp}
            sub={`${(((grandTotal - prevGrand) / prevGrand) * 100).toFixed(1)}% vs prev`}
          />
        )}
      </div>

      {/* MoM Trend */}
      <ChartCard
        title="Month-over-Month Dues Trend (₹ Cr)"
        legend={[['Total', '#94A3B8'], ['MSE Dues', MSE_COLOR], ['Others Dues', OTHERS_COLOR]]}
        height={280}
        icon={TrendingUp}
      >
        <BarChart data={trendData} margin={{ top: 20, right: 16, left: 0, bottom: 10 }} barCategoryGap="35%" barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TT_STYLE} formatter={(v, name) => [`₹${v} Cr`, name]} />
          <Bar dataKey="total" name="Total" fill="#64748B" radius={[4,4,0,0]}>
            <LabelList dataKey="total" position="top" style={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: '#CBD5E1' }} formatter={v => `₹${v}`} />
          </Bar>
          <Bar dataKey="mse"    name="MSE"    fill={MSE_COLOR}    radius={[4,4,0,0]} />
          <Bar dataKey="others" name="Others" fill={OTHERS_COLOR} radius={[4,4,0,0]} />
        </BarChart>
      </ChartCard>

      {/* Top Performers */}
      <PerformerCards currentOrgs={latestOrgs} prevOrgs={prevOrgs} />

      {/* Org-level breakdown */}
      <ChartCard
        title={`Organisation-wise Pendency — Top 12 (${latestMonth?.month})`}
        legend={[['Total', '#94A3B8'], ['MSE', MSE_COLOR], ['Others', OTHERS_COLOR]]}
        height={320}
        icon={Building2}
      >
        <BarChart data={orgChartData} margin={{ top: 20, right: 8, left: 0, bottom: 70 }} barCategoryGap="30%" barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} />
          <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TT_STYLE} formatter={(v, name) => [`₹${v} Cr`, name]} />
          <Bar dataKey="total" name="Total" fill="#64748B" radius={[4,4,0,0]}>
            <LabelList dataKey="total" position="top" style={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: '#CBD5E1' }} formatter={v => `₹${v}`} />
          </Bar>
          <Bar dataKey="mse"    name="MSE"    fill={MSE_COLOR}    radius={[4,4,0,0]} />
          <Bar dataKey="others" name="Others" fill={OTHERS_COLOR} radius={[4,4,0,0]} />
        </BarChart>
      </ChartCard>

      {/* Organisation Table */}
      <div>
        <SectionDivider icon={Layers} count={latestOrgs.length}>Organisation-wise Dues ({latestMonth?.month})</SectionDivider>
        <div className="table-container">
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0B152A] border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left font-mono text-[10px] text-slate-400 uppercase">Organisation</th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] text-sky-400 uppercase">MSE (₹ Cr)</th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] text-purple-400 uppercase">Others (₹ Cr)</th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] text-white uppercase">Total (₹ Cr)</th>
                  {prevOrgs.length > 0 && (
                    <th className="px-4 py-3 text-right font-mono text-[10px] text-slate-400 uppercase">MoM Change</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[...latestOrgs].sort((a, b) => b.total - a.total).map((o, i) => {
                  const prev  = prevMap[o.org]
                  const delta = prev ? o.total - prev.total : null
                  return (
                    <tr key={i} className="hover:bg-white/[0.04] transition-colors">
                      <td className="px-4 py-2.5 font-medium text-slate-200">{o.org}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-sky-400">{fmtCr(o.mse)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-purple-400">{fmtCr(o.others)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-white">{fmtCr(o.total)}</td>
                      {prevOrgs.length > 0 && (
                        <td className="px-4 py-2.5 text-right">
                          <DeltaBadge delta={delta} />
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Office Page ──────────────────────────────────────────────────────────────
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
  const hasPrev   = prevOffices.length > 0

  const chartData = [...offices].sort((a, b) => b.total - a.total).slice(0, 15)
    .map(o => ({
      name:   o.office.length > 22 ? o.office.slice(0, 22) + '…' : o.office,
      mse:    +o.mse.toFixed(2),
      others: +o.others.toFixed(2),
      total:  +o.total.toFixed(2),
    }))

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 p-4 rounded-xl glass-card">
        <div className="flex items-center gap-4 flex-wrap">
          <MonthSelector months={monthLabels} sel={selMonth} onChange={v => {
            setSelMonth(v)
            const cpwd = orgList.find(o => o.org.toLowerCase().includes('central public works'))
            setSelOrg(cpwd?.org ?? orgList[0]?.org ?? '')
          }} label="Month" />

          <div className="flex items-center gap-2">
            <span className="filter-label">Organisation:</span>
            <select
              className="filter-select font-mono min-w-[280px]"
              value={selOrg}
              onChange={e => setSelOrg(e.target.value)}
            >
              {[...orgList].sort((a, b) => b.total - a.total).map(o => (
                <option key={o.org} value={o.org}>{o.org} — {fmtCr(o.total)}</option>
              ))}
            </select>
          </div>
        </div>

        {prevMonth && (
          <span className="font-mono text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-white/5">
            Comparing against: <strong className="text-white">{prevMonth.month}</strong>
          </span>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <KpiCard label="Total Pendency" value={fmtCr(orgTotal)} color={TEAL} icon={ShoppingBag} />
        <KpiCard label="MSE Dues" value={fmtCr(orgMse)} color={MSE_COLOR} icon={Building2} sub={`${orgTotal ? ((orgMse/orgTotal)*100).toFixed(1) : 0}%`} />
        <KpiCard label="Others Dues" value={fmtCr(orgOthers)} color={OTHERS_COLOR} icon={Building2} sub={`${orgTotal ? ((orgOthers/orgTotal)*100).toFixed(1) : 0}%`} />
        <KpiCard label="Offices Logged" value={offices.length} color={AMBER} icon={Layers} />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <ChartCard
          title={`Office-wise Pendency — Top 15 (${selOrg})`}
          legend={[['MSE', MSE_COLOR], ['Others', OTHERS_COLOR]]}
          height={Math.max(240, chartData.length * 28)}
          icon={Building2}
        >
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 60, left: 160, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={155} tick={{ fill: '#E2E8F0', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TT_STYLE} formatter={(v, name) => [`₹${v} Cr`, name]} />
            <Bar dataKey="mse"    name="MSE"    stackId="a" fill={MSE_COLOR} />
            <Bar dataKey="others" name="Others" stackId="a" fill={OTHERS_COLOR} radius={[0,4,4,0]}>
              <LabelList dataKey="total" position="right" style={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: '#CBD5E1' }} formatter={v => `₹${v}`} />
            </Bar>
          </BarChart>
        </ChartCard>
      )}

      {/* Table */}
      <div>
        <SectionDivider icon={Layers} count={offices.length}>Office Breakdown ({selOrg})</SectionDivider>
        <div className="table-container">
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0B152A] border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left font-mono text-[10px] text-slate-400 uppercase">Office Name</th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] text-sky-400 uppercase">MSE (₹ Cr)</th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] text-purple-400 uppercase">Others (₹ Cr)</th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] text-white uppercase">Total (₹ Cr)</th>
                  {hasPrev && (
                    <th className="px-4 py-3 text-right font-mono text-[10px] text-slate-400 uppercase">MoM Change</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[...offices].sort((a, b) => b.total - a.total).map((o, i) => {
                  const prev  = prevMap[o.office]
                  const delta = prev ? o.total - prev.total : null
                  return (
                    <tr key={i} className="hover:bg-white/[0.04] transition-colors">
                      <td className="px-4 py-2.5 font-medium text-slate-200">{o.office}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-sky-400">{fmtCr(o.mse)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-purple-400">{fmtCr(o.others)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-white">{fmtCr(o.total)}</td>
                      {hasPrev && (
                        <td className="px-4 py-2.5 text-right">
                          <DeltaBadge delta={delta} />
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Aging Page ───────────────────────────────────────────────────────────────
function AgingPage({ months }) {
  const monthLabels = months.map(m => m.month)
  const [selMonth, setSelMonth] = useState(monthLabels[monthLabels.length - 1] ?? '')

  const currentMonth = months.find(m => m.month === selMonth) ?? null
  const currentIdx   = months.findIndex(m => m.month === selMonth)
  const prevMonth    = currentIdx > 0 ? months[currentIdx - 1] : null

  const agewise = currentMonth?.agewise

  if (!agewise?.orgs?.length) return (
    <div className="space-y-4">
      <MonthSelector months={monthLabels} sel={selMonth} onChange={setSelMonth} label="Month" />
      <p className="font-body text-xs text-slate-400 p-4">No agewise data available for this month.</p>
    </div>
  )

  const buckets      = agewise.bucket_names
  const orgs         = agewise.orgs
  const grandTotal   = orgs.reduce((s, o) => s + o.total, 0)
  const bucketTotals = buckets.map(b => orgs.reduce((s, o) => s + (o.buckets[b] || 0), 0))

  const chartData = [...orgs].sort((a, b) => b.total - a.total).slice(0, 12).map(o => {
    const entry = { name: o.org.length > 18 ? o.org.slice(0, 18) + '…' : o.org, total: +o.total.toFixed(2) }
    buckets.forEach(b => { entry[b] = +(o.buckets[b] || 0).toFixed(2) })
    return entry
  })

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 p-4 rounded-xl glass-card">
        <MonthSelector months={monthLabels} sel={selMonth} onChange={setSelMonth} label="Aging Month" />
        {prevMonth && (
          <span className="font-mono text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-white/5">
            Previous Period: <strong className="text-white">{prevMonth.month}</strong>
          </span>
        )}
      </div>

      {/* Bucket KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {buckets.map((b, i) => (
          <KpiCard
            key={b}
            label={b}
            value={fmtCr(bucketTotals[i])}
            color={BUCKET_COLORS[i] || SLATE}
            icon={Clock}
            sub={`${grandTotal ? ((bucketTotals[i]/grandTotal)*100).toFixed(1) : 0}% of total`}
          />
        ))}
      </div>

      {/* Chart */}
      <ChartCard
        title={`Age-wise Distribution per Organisation (₹ Cr) — ${selMonth}`}
        legend={[['Total', '#94A3B8'], ...buckets.map((b, i) => [b, BUCKET_COLORS[i] || SLATE])]}
        height={320}
        icon={Clock}
      >
        <BarChart data={chartData} margin={{ top: 20, right: 8, left: 0, bottom: 70 }} barCategoryGap="25%" barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} />
          <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TT_STYLE} formatter={(v, n) => [`₹${v} Cr`, n]} />
          <Bar dataKey="total" name="Total" fill="#64748B" radius={[4,4,0,0]}>
            <LabelList dataKey="total" position="top" style={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: '#CBD5E1' }} formatter={v => `₹${v}`} />
          </Bar>
          {buckets.map((b, i) => (
            <Bar key={b} dataKey={b} name={b} fill={BUCKET_COLORS[i] || SLATE} radius={[4,4,0,0]} />
          ))}
        </BarChart>
      </ChartCard>

      {/* Table */}
      <div>
        <SectionDivider icon={Layers} count={orgs.length}>Organisation-wise Aging Breakdown</SectionDivider>
        <div className="table-container">
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0B152A] border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left font-mono text-[10px] text-slate-400 uppercase">Organisation</th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] text-white uppercase">Total (₹ Cr)</th>
                  {buckets.map((b, i) => (
                    <th key={b} className="px-4 py-3 text-right font-mono text-[10px] uppercase" style={{ color: BUCKET_COLORS[i] || '#94A3B8' }}>
                      {b}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[...orgs].sort((a, b) => b.total - a.total).map((o, i) => (
                  <tr key={i} className="hover:bg-white/[0.04] transition-colors">
                    <td className="px-4 py-2.5 font-medium text-slate-200">{o.org}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-white">{fmtCr(o.total)}</td>
                    {buckets.map((b, bi) => (
                      <td key={b} className="px-4 py-2.5 text-right font-mono" style={{ color: BUCKET_COLORS[bi] || SLATE }}>
                        {o.buckets[b] ? fmtCr(o.buckets[b]) : '—'}
                      </td>
                    ))}
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

// Sample demonstration data for MoHUA when Drive folder is pending upload
const SAMPLE_GEM_MONTHS = [
  {
    month: "May 2026",
    dues: {
      orgs: [
        { org: "Central Public Works Department (CPWD)", mse: 12.45, others: 28.30, total: 40.75 },
        { org: "NBCC (India) Limited",                   mse: 8.10,  others: 19.50, total: 27.60 },
        { org: "Delhi Development Authority (DDA)",      mse: 5.20,  others: 14.80, total: 20.00 },
        { org: "Land & Development Office (L&DO)",       mse: 2.10,  others: 6.40,  total: 8.50 },
        { org: "Directorate of Printing",                mse: 1.80,  others: 4.10,  total: 5.90 },
        { org: "National Capital Region Planning Board", mse: 0.90,  others: 2.30,  total: 3.20 },
      ],
      offices_by_org: {
        "Central Public Works Department (CPWD)": [
          { office: "Executive Engineer (Civil) - NZ", mse: 3.80, others: 8.20, total: 12.00 },
          { office: "Executive Engineer (Elect) - SZ", mse: 3.10, others: 7.40, total: 10.50 },
          { office: "Superintending Engineer - WZ",    mse: 2.90, others: 6.80, total: 9.70 },
          { office: "Coordination Division - EZ",      mse: 2.65, others: 5.90, total: 8.55 },
        ],
      },
    },
    agewise: {
      bucket_names: ["0-30 Days", "31-60 Days", "61-90 Days", "91-180 Days", ">180 Days"],
      orgs: [
        { org: "Central Public Works Department (CPWD)", mse: 12.45, others: 28.30, total: 40.75, buckets: { "0-30 Days": 18.20, "31-60 Days": 11.50, "61-90 Days": 6.40, "91-180 Days": 3.15, ">180 Days": 1.50 } },
        { org: "NBCC (India) Limited",                   mse: 8.10,  others: 19.50, total: 27.60, buckets: { "0-30 Days": 12.40, "31-60 Days": 8.20,  "61-90 Days": 4.10, "91-180 Days": 2.00,  ">180 Days": 0.90 } },
        { org: "Delhi Development Authority (DDA)",      mse: 5.20,  others: 14.80, total: 20.00, buckets: { "0-30 Days": 9.10,  "31-60 Days": 5.80,  "61-90 Days": 3.20, "91-180 Days": 1.40,  ">180 Days": 0.50 } },
      ],
    },
  },
  {
    month: "June 2026",
    dues: {
      orgs: [
        { org: "Central Public Works Department (CPWD)", mse: 9.80,  others: 24.10, total: 33.90 },
        { org: "NBCC (India) Limited",                   mse: 9.40,  others: 21.20, total: 30.60 },
        { org: "Delhi Development Authority (DDA)",      mse: 4.30,  others: 12.10, total: 16.40 },
        { org: "Land & Development Office (L&DO)",       mse: 1.60,  others: 5.20,  total: 6.80 },
        { org: "Directorate of Printing",                mse: 1.20,  others: 3.40,  total: 4.60 },
        { org: "National Capital Region Planning Board", mse: 0.70,  others: 1.80,  total: 2.50 },
      ],
      offices_by_org: {
        "Central Public Works Department (CPWD)": [
          { office: "Executive Engineer (Civil) - NZ", mse: 3.10, others: 7.20, total: 10.30 },
          { office: "Executive Engineer (Elect) - SZ", mse: 2.60, others: 6.10, total: 8.70 },
          { office: "Superintending Engineer - WZ",    mse: 2.30, others: 5.80, total: 8.10 },
          { office: "Coordination Division - EZ",      mse: 1.80, others: 5.00, total: 6.80 },
        ],
      },
    },
    agewise: {
      bucket_names: ["0-30 Days", "31-60 Days", "61-90 Days", "91-180 Days", ">180 Days"],
      orgs: [
        { org: "Central Public Works Department (CPWD)", mse: 9.80,  others: 24.10, total: 33.90, buckets: { "0-30 Days": 16.50, "31-60 Days": 9.20,  "61-90 Days": 4.80, "91-180 Days": 2.40,  ">180 Days": 1.00 } },
        { org: "NBCC (India) Limited",                   mse: 9.40,  others: 21.20, total: 30.60, buckets: { "0-30 Days": 14.10, "31-60 Days": 9.40,  "61-90 Days": 4.60, "91-180 Days": 1.80,  ">180 Days": 0.70 } },
        { org: "Delhi Development Authority (DDA)",      mse: 4.30,  others: 12.10, total: 16.40, buckets: { "0-30 Days": 8.20,  "31-60 Days": 4.50,  "61-90 Days": 2.40, "91-180 Days": 1.00,  ">180 Days": 0.30 } },
      ],
    },
  },
]

// ── Main Component ───────────────────────────────────────────────────────────
export default function GemDuesDashboard({ data, initialTab = 'overview' }) {
  const [useSample, setUseSample] = useState(false)
  const realMonths = data?.months ?? []
  const months = realMonths.length > 0 ? realMonths : (useSample ? SAMPLE_GEM_MONTHS : [])

  if (!months.length) {
    return (
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center">
        <div className="max-w-xl w-full p-8 rounded-2xl glass-card text-center border border-white/10 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag size={28} className="text-[#F9A55A]" />
          </div>

          <h2 className="font-display text-2xl font-bold text-white mb-2">
            No GeM Dues Spreadsheets Found in Drive
          </h2>
          <p className="font-body text-xs text-slate-400 mb-6 leading-relaxed">
            The Google Drive folder <code className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 font-mono text-[11px]">GeM Dues (1Z4DEbRGqN6gJudyPhR8dro7gl2oOUpQe)</code> is currently empty.
            Once you upload monthly Excel reports into the <code className="text-sky-300 font-mono">Dues/</code> or <code className="text-sky-300 font-mono">Agewise Analysis/</code> subfolders, they will appear automatically.
          </p>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 text-left mb-6 font-mono text-xs space-y-2">
            <div className="flex items-center gap-2 text-slate-300 font-bold mb-1">
              <Building2 size={14} className="text-cyan-400" />
              <span>Expected Drive Folder Structure:</span>
            </div>
            <p className="text-slate-400 pl-5">📁 <strong className="text-slate-200">Dues/</strong> &rarr; <span className="text-amber-400">June 2026.xlsx</span> (Sheet1: Org Summary, Sheet2: Office Details)</p>
            <p className="text-slate-400 pl-5">📁 <strong className="text-slate-200">Agewise Analysis/</strong> &rarr; <span className="text-amber-400">June 2026.xlsx</span> (Agewise brackets)</p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setUseSample(true)}
              className="px-5 py-2.5 rounded-xl font-display font-bold text-xs uppercase tracking-wider text-slate-950 bg-gradient-to-r from-[#F9A55A] to-[#F59E0B] hover:opacity-90 transition-all shadow-lg cursor-pointer"
            >
              Preview with Demo Data
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {useSample && realMonths.length === 0 && (
        <div className="px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs">
          <span className="font-mono text-amber-300">
            ✦ Previewing with sample MoHUA dataset (Upload .xlsx to Drive to see live data)
          </span>
          <button
            onClick={() => setUseSample(false)}
            className="font-mono text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
          >
            Hide Preview
          </button>
        </div>
      )}
      {initialTab === 'overview' && <OverviewPage months={months} />}
      {initialTab === 'offices'  && <OfficePage   months={months} />}
      {initialTab === 'aging'    && <AgingPage    months={months} />}
    </div>
  )
}
