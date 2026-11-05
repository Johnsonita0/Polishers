import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bell, ChevronDown, FileText, LayoutDashboard, LogOut, Menu, Settings, Users, X,
} from 'lucide-react'
import { useToast } from '../ui/ToastProvider'
import { supabase } from '../../supabase'
import { friendlyErrorMessage } from '../../utils/friendlyError'

const links = [
  { label: 'Overview', path: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Requests', path: '/admin/requests', icon: FileText },
  { label: 'Content', path: '/admin/content', icon: Settings },
  { label: 'Team', path: '/admin/team', icon: Users },
]

export default function AdminLayout() {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const showToast = useToast()

  useEffect(() => {
    let active = true
    async function loadProfile() {
      if (!supabase) {
        const message = 'The private admin dashboard is unavailable because Supabase is not connected.'
        setError(message)
        showToast({ tone: 'error', title: 'Admin connection unavailable', message })
        return
      }
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (!active) return
        if (sessionError) {
          const message = friendlyErrorMessage(sessionError, 'We could not verify your sign-in session. Check your connection and try again.')
          setError(message)
          showToast({ tone: 'error', title: 'Could not verify session', message })
          return
        }
        if (!sessionData.session) {
          navigate('/admin/login', { replace: true })
          return
        }
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, role, is_active')
          .eq('id', sessionData.session.user.id)
          .single()
        if (!active) return
        if (profileError) {
          const message = friendlyErrorMessage(profileError, 'We could not verify your team access. Try again or ask an administrator to check your profile.')
          setError(message)
          showToast({ tone: 'error', title: 'Could not verify access', message })
          return
        }
        if (!data.is_active) {
          await supabase.auth.signOut()
          showToast({ tone: 'error', title: 'Profile access is disabled', message: 'Your Supabase sign-in is valid, but admin access is disabled on this profile. An administrator must set is_active to true in public.profiles.' })
          navigate('/admin/login', { replace: true })
          return
        }
        setProfile(data)
      } catch (issue) {
        if (!active) return
        const message = friendlyErrorMessage(issue, 'We could not reach the admin service. Check your connection and try again.')
        setError(message)
        showToast({ tone: 'error', title: 'Admin service unavailable', message })
      }
    }
    loadProfile()
    const { data: listener } = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/admin/login', { replace: true })
    }) || { data: { subscription: null } }
    return () => {
      active = false
      listener?.subscription?.unsubscribe()
    }
  }, [navigate, showToast])

  async function signOut() {
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      showToast({ tone: 'success', title: 'Signed out', message: 'Your admin session has ended.' })
      navigate('/admin/login', { replace: true })
    } catch (issue) {
      const message = friendlyErrorMessage(issue, 'We could not sign you out because the service did not respond. Check your connection and try again.')
      showToast({ tone: 'error', title: 'Could not sign out', message })
    }
  }

  if (error) return <div className="admin-setup"><span className="admin-setup-icon">!</span><p className="eyebrow">ADMIN ACCESS</p><h1>One last connection.</h1><p>{error}</p><a href="/admin/login">Back to sign in</a></div>
  if (!profile) return <div className="admin-loading"><span className="admin-spinner" />Checking admin access…</div>

  return (
    <div className="admin-shell">
      {menuOpen && <button className="admin-backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <aside className={`admin-sidebar ${menuOpen ? 'admin-sidebar-open' : ''}`}>
        <a className="admin-brand" href="/"><span className="brand-mark">✦</span><span><b>POLISHERS</b><small>DA ELITE · ADMIN</small></span></a>
        <div className="admin-nav-label">WORKSPACE</div>
        <nav>{links.map(({ label, path, icon: Icon, end }) => <NavLink key={path} to={path} end={end} onClick={() => setMenuOpen(false)}><Icon size={18} /><span>{label}</span>{label === 'Requests' && <span className="admin-nav-count">3</span>}</NavLink>)}</nav>
        <div className="admin-sidebar-bottom"><div className="admin-sidebar-help"><span>?</span><div><b>Need a hand?</b><small>Contact your super admin</small></div></div><button onClick={signOut}><LogOut size={17} /> Sign out</button></div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar"><button className="admin-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu">{menuOpen ? <X /> : <Menu />}</button><div className="admin-breadcrumb">Workspace <span>/</span> <b>Dashboard</b></div><div className="admin-top-actions"><button aria-label="Notifications"><Bell size={18} /><i /></button><div className="admin-user"><span>{(profile.full_name || 'Admin').slice(0, 1).toUpperCase()}</span><div><b>{profile.full_name || 'Admin'}</b><small>{profile.role.replace('_', ' ')}</small></div><ChevronDown size={14} /></div></div></header>
        <main className="admin-content"><Outlet context={{ profile }} /></main>
      </div>
    </div>
  )
}
