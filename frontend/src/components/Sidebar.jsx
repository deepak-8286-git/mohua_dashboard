import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  BarChart3,
  Receipt,
  Users2,
  ShoppingBag,
  Award,
  Clock,
  Building2,
  PieChart,
  ShieldAlert,
} from 'lucide-react'

const AMBER = '#F9A55A'

function NavSection({ label, icon: Icon, isOpen, onToggle, count, children }) {
  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left rounded-xl transition-all duration-200 hover:bg-white/[0.07] group cursor-pointer"
      >
        <div className="p-1.5 rounded-lg bg-white/[0.05] border border-white/10 group-hover:border-amber-400/30 group-hover:bg-amber-400/10 transition-colors">
          <Icon size={16} className="text-[#F9A55A]" />
        </div>
        <span className="font-display font-bold tracking-wide text-sm flex-1 text-slate-100 group-hover:text-white">
          {label}
        </span>
        {count != null && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-slate-300">
            {count}
          </span>
        )}
        {isOpen ? (
          <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-200 transition-transform" />
        ) : (
          <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-200 transition-transform" />
        )}
      </button>
      {isOpen && (
        <div className="ml-5 pl-3 mt-1 mb-1 flex flex-col gap-1 border-l border-white/10">
          {children}
        </div>
      )}
    </div>
  )
}

function NavItem({ label, icon: Icon, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
        active
          ? 'bg-gradient-to-r from-[#F9A55A]/20 to-transparent text-[#F9A55A] font-semibold shadow-sm border-l-2 border-[#F9A55A]'
          : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
      }`}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon size={13} className={active ? 'text-[#F9A55A]' : 'text-slate-400'} />}
        <span>{label}</span>
      </div>
      {badge && (
        <span
          className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
            badge === 'B4'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-white/10 text-slate-300'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

export default function Sidebar({ active, onSelect }) {
  const [iawOpen, setIawOpen]         = useState(true)
  const [billOpen, setBillOpen]       = useState(true)
  const [pensionOpen, setPensionOpen] = useState(true)
  const [gemOpen, setGemOpen]         = useState(true)

  return (
    <aside className="w-64 shrink-0 flex flex-col overflow-y-auto bg-[#0A1428] border-r border-white/10 select-none shadow-2xl">
      {/* Brand block */}
      <div className="px-5 py-5 border-b border-white/10 bg-gradient-to-b from-[#0F1E3C] to-[#0A1428]">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest uppercase bg-amber-500/15 text-[#F9A55A] border border-amber-500/30">
            Official Portal
          </span>
        </div>
        <h2 className="font-display font-bold text-xl text-white tracking-wide">
          MoHUA <span className="text-[#F9A55A]">Executive</span>
        </h2>
        <p className="font-mono text-[11px] text-slate-400 mt-0.5 tracking-wider uppercase">
          Controller of Accounts
        </p>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {/* IAW */}
        <NavSection
          label="IAW Wing"
          icon={BarChart3}
          isOpen={iawOpen}
          onToggle={() => setIawOpen(v => !v)}
        >
          <NavItem
            label="Paras Status"
            icon={ShieldAlert}
            active={active === 'iaw'}
            onClick={() => onSelect('iaw')}
          />
        </NavSection>

        {/* Bill Monitoring */}
        <NavSection
          label="Bill Monitoring"
          icon={Receipt}
          isOpen={billOpen}
          onToggle={() => setBillOpen(v => !v)}
        >
          <NavItem
            label="E-Bill Overview"
            icon={Receipt}
            active={active === 'bill'}
            onClick={() => onSelect('bill')}
          />
          <NavItem
            label="B4 Scorecard"
            icon={Award}
            badge="B4"
            active={active === 'scorecard'}
            onClick={() => onSelect('scorecard')}
          />
        </NavSection>

        {/* Pension Cases */}
        <NavSection
          label="Pension Cases"
          icon={Users2}
          isOpen={pensionOpen}
          onToggle={() => setPensionOpen(v => !v)}
        >
          <NavItem
            label="PEN-07 Tracker"
            icon={Clock}
            active={active === 'pension'}
            onClick={() => onSelect('pension')}
          />
        </NavSection>

        {/* GeM Dues */}
        <NavSection
          label="GeM Dues"
          icon={ShoppingBag}
          isOpen={gemOpen}
          onToggle={() => setGemOpen(v => !v)}
        >
          <NavItem
            label="Summary Overview"
            icon={PieChart}
            active={active === 'gem'}
            onClick={() => onSelect('gem')}
          />
          <NavItem
            label="Office Breakdown"
            icon={Building2}
            active={active === 'gem-offices'}
            onClick={() => onSelect('gem-offices')}
          />
          <NavItem
            label="Aging Analysis"
            icon={Clock}
            active={active === 'gem-aging'}
            onClick={() => onSelect('gem-aging')}
          />
        </NavSection>
      </nav>

      {/* Footer Info Box */}
      <div className="p-4 mx-3 mb-4 rounded-xl bg-gradient-to-br from-blue-950/40 to-slate-900/60 border border-white/5">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-beacon" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-300 font-bold">
            Live Drive Auto-Sync
          </span>
        </div>
        <p className="font-body text-[11px] text-slate-400 leading-tight">
          Background polling active. Spreadsheet changes sync automatically.
        </p>
      </div>
    </aside>
  )
}
