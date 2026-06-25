import { useState } from 'react'
import { ChevronDown, ChevronRight, BarChart2, FileText } from 'lucide-react'

const AMBER = '#F9A55A'

function NavSection({ label, icon: Icon, isOpen, onToggle, children }) {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left rounded transition-colors hover:bg-white/10 group"
      >
        <Icon size={15} style={{ color: AMBER }} />
        <span className="font-display font-semibold tracking-wide text-sm flex-1" style={{ color: 'rgba(255,255,255,0.9)' }}>{label}</span>
        {isOpen
          ? <ChevronDown size={13} style={{ color: 'rgba(255,255,255,0.35)' }} />
          : <ChevronRight size={13} style={{ color: 'rgba(255,255,255,0.35)' }} />}
      </button>
      {isOpen && (
        <div className="ml-4 pl-3 mt-0.5 mb-1 flex flex-col gap-0.5" style={{ borderLeft: '1px solid rgba(255,255,255,0.15)' }}>
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
        active ? '' : 'hover:bg-white/10'
      }`}
      style={active
        ? { color: AMBER, borderLeft: `2px solid ${AMBER}`, marginLeft: -1, paddingLeft: 14, background: 'rgba(255,255,255,0.12)' }
        : { color: 'rgba(255,255,255,0.5)' }
      }
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.9)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
    >
      {label}
    </button>
  )
}

export default function Sidebar({ active, onSelect }) {
  const [iawOpen, setIawOpen]   = useState(true)
  const [billOpen, setBillOpen] = useState(true)

  return (
    <aside className="w-56 shrink-0 flex flex-col overflow-y-auto"
      style={{ background: 'linear-gradient(180deg, #052e24 0%, #031a15 100%)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>

      {/* Brand block */}
      <div className="px-4 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="font-mono text-xs mb-1 tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>MoHUA</p>
        <h1 className="font-display font-bold text-lg leading-tight" style={{ color: '#FFFFFF' }}>
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
          <NavItem label="Paras Status" active={active === 'iaw'} onClick={() => onSelect('iaw')} />
        </NavSection>

        <NavSection
          label="Bill Monitoring"
          icon={FileText}
          isOpen={billOpen}
          onToggle={() => setBillOpen(v => !v)}
        >
          <NavItem label="Overview"   active={active === 'bill'}      onClick={() => onSelect('bill')} />
          <NavItem label="Scorecard"  active={active === 'scorecard'} onClick={() => onSelect('scorecard')} />
        </NavSection>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Auto-refreshes every 5 min</p>
      </div>
    </aside>
  )
}
