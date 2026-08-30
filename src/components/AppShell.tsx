import { Boxes, ChartNoAxesCombined, ChevronLeft, ClipboardList, Hexagon, LogOut, Menu, PackageOpen, Users, Warehouse, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

const links = [{ to: '/', label: 'Visão geral', icon: ChartNoAxesCombined }, { to: '/apiaries', label: 'Apiários', icon: Warehouse }, { to: '/hives', label: 'Colmeias', icon: Boxes }, { to: '/production-cycles', label: 'Ciclos', icon: ClipboardList }, { to: '/honey-batches', label: 'Lotes de mel', icon: PackageOpen }, { to: '/orders', label: 'Pedidos', icon: ClipboardList }]

export function AppShell({ children }: { children: ReactNode }) {
  const { session, isAdmin, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const navLinks = isAdmin ? [...links, { to: '/users', label: 'Usuários', icon: Users }] : links
  return <div className="app-layout"><aside className={`sidebar ${open ? 'sidebar--open' : ''}`}><div className="sidebar-brand"><span className="mini-logo"><Hexagon size={23} /><b>HM</b></span><strong>Honey Manager</strong><button className="icon-button mobile-only" aria-label="Fechar menu" onClick={() => setOpen(false)}><X size={20} /></button></div><nav aria-label="Navegação principal">{navLinks.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}><Icon size={18} /><span>{label}</span></NavLink>)}</nav><footer><div className="user-summary"><span>{session?.user.name.slice(0, 2).toUpperCase()}</span><div><strong>{session?.user.name}</strong><small>{session?.user.role}</small></div></div><button className="icon-button" onClick={logout} aria-label="Sair" title="Sair"><LogOut size={18} /></button></footer></aside>{open && <button className="nav-scrim" aria-label="Fechar menu" onClick={() => setOpen(false)} />}<div className="app-main"><header className="topbar"><button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button><div><small>Cooperativa</small><strong>{session?.tenant.name}</strong></div><ChevronLeft className="desktop-only" size={16} /></header>{children}</div></div>
}