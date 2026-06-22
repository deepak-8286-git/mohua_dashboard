import { useState } from 'react'
import { ChevronDown, ChevronRight, BarChart2, FileText } from 'lucide-react'

const AMBER = '#E8813A'

function NavSection({ label, icon: Icon, isOpen, onToggle, children }) {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left rounded transition-colors hover:bg-navy-600 group"
      >
        <Icon size={15} style={{ color: AMBER }} />
        <span className="font-display font-semibold tracking-wide text-sm text-slate-100 flex-1">{label}</span>
        {isOpen
          ? <ChevronDown size={13} className="text-slate-500" />
          : <ChevronRight size={13} className="text-slate-500" />}
      </button>
      {isOpen && (
        <div className="ml-4 pl-3 border-l border-navy-400 mt-0.5 mb-1 flex flex-col gap-0.5">
          {children}
        </div>
      )}
    </div>
  )
}

function NavItem({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded text-xs font-medium transition-colors ${
        active
          ? 'text-amber border-l-2 -ml-px pl-3.5 bg-navy-600'
          : 'text-slate-500 hover:text-slate-100 hover:bg-navy-600'
      }`}
      style={active ? { borderColor: AMBER } : {}}
    >
      {label}
    </button>
  )
}

export default function Sidebar({ active, onSelect }) {
  const [iawOpen, setIawOpen]   = useState(true)
  const [billOpen, setBillOpen] = useState(true)

  return (
    <aside className="w-56 shrink-0 bg-navy-800 border-r border-navy-400 flex flex-col overflow-y-auto">
      {/* Brand block */}
      <div className="px-4 py-5 border-b border-navy-400">
        <p className="font-mono text-xs text-slate-600 mb-1 tracking-widest uppercase">MoHUA</p>
        <h1 className="font-display font-bold text-lg leading-tight text-slate-100">
          Dashboard
        </h1>
        <p className="font-mono text-xs mt-1" style={{ color: AMBER }}>
          CONTROLLER OF ACCOUNTS
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3">
        <NavSection
          label="IAW"
          icon={BarChart2}
          isOpen={iawOpen}
          onToggle={() => setIawOpen(v => !v)}
        >
          <NavItem label="Paras Status"    active={active === 'iaw'}  onClick={() => onSelect('iaw')} />
        </NavSection>

        <NavSection
          label="Bill Monitoring"
          icon={FileText}
          isOpen={billOpen}
          onToggle={() => setBillOpen(v => !v)}
        >
          <NavItem label="Overview"  active={active === 'bill'} onClick={() => onSelect('bill')} />
        </NavSection>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-navy-400">
        <p className="font-mono text-xs text-slate-700">Auto-refreshes every 5 min</p>
      </div>
    </aside>
  )
}
