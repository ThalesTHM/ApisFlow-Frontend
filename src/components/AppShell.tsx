import { Boxes, ChartNoAxesCombined, ChevronLeft, ClipboardList, Hexagon, LogOut, Menu, PackageOpen, Users, Warehouse, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import type { Permission } from '../auth/permissions'
import { useAuth } from '../auth/useAuth'
import { usePermission } from '../auth/usePermission'
import { formatStatus } from '../utils/format'

const links: Array<{ to: string; label: string; icon: typeof ChartNoAxesCombined; permission: Permission }> = [
  { to: '/', label: 'Dashboard', icon: ChartNoAxesCombined, permission: 'dashboard:read' },
  { to: '/apiaries', label: 'Apiários', icon: Warehouse, permission: 'operations:read' },
  { to: '/hives', label: 'Colmeias', icon: Boxes, permission: 'operations:read' },
  { to: '/production-cycles', label: 'Ciclos de produção', icon: ClipboardList, permission: 'operations:read' },
  { to: '/honey-batches', label: 'Lotes de mel', icon: PackageOpen, permission: 'operations:read' },
  { to: '/orders', label: 'Pedidos', icon: ClipboardList, permission: 'operations:read' },
  { to: '/users', label: 'Usuários', icon: Users, permission: 'users:read' },
]

function NavigationLink({ link, onNavigate }: { link: (typeof links)[number]; onNavigate: () => void }) {
  const allowed = usePermission(link.permission)
  if (!allowed) return null
  const Icon = link.icon
  return <NavLink to={link.to} end={link.to === '/'} onClick={onNavigate}><Icon size={18} /><span>{link.label}</span></NavLink>
}

export function AppShell({ children }: { children: ReactNode }) {
  const { session, logout } = useAuth()
  const [open, setOpen] = useState(false)
  return <div className="app-layout"><aside className={`sidebar ${open ? 'sidebar--open' : ''}`} aria-label="Barra lateral"><div className="sidebar-brand"><span className="mini-logo"><Hexagon size={23} /><b>HM</b></span><strong>Honey Manager</strong><button className="icon-button mobile-only" aria-label="Fechar menu" onClick={() => setOpen(false)}><X size={20} /></button></div><nav aria-label="Navegação principal">{links.map((link) => <NavigationLink key={link.to} link={link} onNavigate={() => setOpen(false)} />)}</nav><footer><div className="user-summary"><span>{session?.user.name.slice(0, 2).toUpperCase()}</span><div><strong>{session?.user.name}</strong><small>{session?.user.role ? formatStatus(session.user.role) : ''}</small></div></div><button className="icon-button" onClick={logout} aria-label="Sair" title="Sair"><LogOut size={18} /></button></footer></aside>{open && <button className="nav-scrim" aria-label="Fechar navegação" onClick={() => setOpen(false)} />}<div className="app-main"><header className="topbar"><button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button><div className="tenant-summary"><small>Cooperativa</small><strong>{session?.tenant.name}</strong></div><ChevronLeft className="desktop-only" size={16} /><div className="topbar-user"><span>{session?.user.name}</span><small>{session?.user.email}</small></div></header><div className="main-content">{children}</div></div></div>
}