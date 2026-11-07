import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell, FileText, LayoutDashboard, LogOut, Mail, Menu, Settings, Users, X,
} from 'lucide-react'
import { useToast } from '../ui/ToastProvider'
import { supabase } from '../../supabase'
import { friendlyErrorMessage } from '../../utils/friendlyError'

const links = [
  { label: 'Overview', path: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Requests', path: '/admin/requests', icon: FileText },
  { label: 'Newsletter', path: '/admin/newsletter', icon: Mail },
  { label: 'Content', path: '/admin/content', icon: Settings },
  { label: 'Team', path: '/admin/team', icon: Users },
]

export default function AdminLayout() {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const profileMenuRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const showToast = useToast()
  const currentPage = links.find(({ path, end }) => end ? location.pathname === path : location.pathname.startsWith(path))
    || (location.pathname === '/admin/notifications' ? { label: 'Notifications' } : null)

  useEffect(() => {
    if (!profileMenuOpen) return undefined
    function dismissProfileMenu(event) {
      if (event.type === 'keydown' && event.key === 'Escape') setProfileMenuOpen(false)
      if (event.type === 'pointerdown' && !profileMenuRef.current?.contains(event.target)) setProfileMenuOpen(false)
    }
    document.addEventListener('keydown', dismissProfileMenu)
    document.addEventListener('pointerdown', dismissProfileMenu)
    return () => {
      document.removeEventListener('keydown', dismissProfileMenu)
      document.removeEventListener('pointerdown', dismissProfileMenu)
    }
  }, [profileMenuOpen])

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
        if (!data.is_active || !['admin', 'super_admin'].includes(data.role)) {
          await supabase.auth.signOut()
          showToast({ tone: 'error', title: 'Admin access required', message: 'Your profile must be active and have the admin or super admin role to use this workspace.' })
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

  useEffect(() => {
    if (!profile || !supabase) return undefined
    let active = true
    async function loadUnreadCount() {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError || !userData.user) return
        const [notificationResult, readResult] = await Promise.all([
          supabase.from('notifications').select('id', { count: 'exact', head: true }),
          supabase.from('notification_reads').select('notification_id', { count: 'exact', head: true }).eq('user_id', userData.user.id),
        ])
        if (!active || notificationResult.error || readResult.error) return
        setUnreadNotifications(Math.max(0, (notificationResult.count || 0) - (readResult.count || 0)))
      } catch {
        if (active) setUnreadNotifications(0)
      }
    }
    const refresh = () => loadUnreadCount()
    refresh()
    const intervalId = window.setInterval(refresh, 60_000)
    window.addEventListener('admin-notifications-changed', refresh)
    return () => {
      active = false
      window.clearInterval(intervalId)
      window.removeEventListener('admin-notifications-changed', refresh)
    }
  }, [profile])

  async function signOut() {
    setProfileMenuOpen(false)
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
        <Link className="admin-brand" to="/"><img src={`${import.meta.env.BASE_URL}Polishers%20DA%20Elite%20Logo.png`} alt="Polishers Da Elite" /></Link>
        <div className="admin-nav-label">WORKSPACE</div>
        <nav>{links.map(({ label, path, icon: Icon, end }) => <NavLink key={path} to={path} end={end} onClick={() => setMenuOpen(false)}><Icon size={18} /><span>{label}</span></NavLink>)}</nav>
        <div className="admin-sidebar-bottom"><div className="admin-sidebar-help"><span>?</span><div><b>Need a hand?</b><small>Contact your super admin</small></div></div><button onClick={signOut}><LogOut size={17} /> Sign out</button></div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar"><button className="admin-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button><div className="admin-breadcrumb">Workspace <span>/</span> <b>{currentPage?.label || 'Dashboard'}</b></div><div className="admin-top-actions"><Link className="admin-notification-link" to="/admin/notifications" aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : 'Notifications'}><Bell size={18} />{unreadNotifications > 0 && <span className="admin-notification-count">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}</Link><div className="admin-profile-menu" ref={profileMenuRef}><div className="admin-user-trigger"><button className="admin-user-avatar" type="button" aria-label={`Profile menu for ${profile.full_name || 'Admin'}`} aria-haspopup="true" aria-controls="admin-profile-popover" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((open) => !open)}><span>{(profile.full_name || 'Admin').slice(0, 1).toUpperCase()}</span></button><div className="admin-user-details"><b>{profile.full_name || 'Admin'}</b><small>{profile.role?.replaceAll('_', ' ') || 'Admin'}</small></div></div>{profileMenuOpen && <div className="admin-profile-popover" id="admin-profile-popover"><div className="admin-profile-summary"><b>{profile.full_name || 'Admin'}</b><small>{profile.role?.replaceAll('_', ' ') || 'Admin'}</small></div><button type="button" onClick={signOut}><LogOut size={16} /> Sign out</button></div>}</div></div></header>
        <main className="admin-content"><Outlet context={{ profile }} /></main>
      </div>
    </div>
  )
}
