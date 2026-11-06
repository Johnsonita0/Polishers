import { useEffect, useState } from 'react'
import { ArrowUpRight, Bell, CheckCheck, Clock3, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import { useToast } from '../../components/ui/ToastProvider'
import { supabase, supabaseConfigured } from '../../supabase'
import { friendlyErrorMessage } from '../../utils/friendlyError'

function formatNotificationDate(value) {
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [readIds, setReadIds] = useState(() => new Set())
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const showToast = useToast()

  useEffect(() => {
    let active = true
    async function loadNotifications() {
      if (!supabaseConfigured) {
        setError('Connect Supabase to load admin notifications.')
        setLoading(false)
        return
      }

      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        const [notificationResult, readResult] = await Promise.all([
          supabase.from('notifications').select('id, event_type, request_id, request_reference, title, message, created_at').order('created_at', { ascending: false }),
          supabase.from('notification_reads').select('notification_id').eq('user_id', userData.user.id),
        ])
        if (notificationResult.error) throw notificationResult.error
        if (readResult.error) throw readResult.error
        if (!active) return

        setUserId(userData.user.id)
        setNotifications(notificationResult.data || [])
        setReadIds(new Set((readResult.data || []).map((item) => item.notification_id)))
        setError('')
      } catch (issue) {
        if (!active) return
        const message = issue?.code === 'PGRST205'
          ? 'Notification tables are not installed yet. Run supabase-schema.sql in your Supabase SQL Editor, then try again.'
          : friendlyErrorMessage(issue, 'Notifications could not be loaded. Check your connection and try again.')
        setError(message)
        showToast({ tone: 'error', title: 'Could not load notifications', message })
      } finally {
        if (active) setLoading(false)
      }
    }

    loadNotifications()
    return () => { active = false }
  }, [reloadKey, showToast])

  function retryLoading() {
    setError('')
    setLoading(true)
    setReloadKey((current) => current + 1)
  }

  async function markAsRead(notificationId) {
    if (!userId || readIds.has(notificationId)) return
    const { error: readError } = await supabase
      .from('notification_reads')
      .upsert({ notification_id: notificationId, user_id: userId }, { onConflict: 'notification_id,user_id', ignoreDuplicates: true })
    if (readError) {
      const message = friendlyErrorMessage(readError, 'This notification could not be marked as read.')
      showToast({ tone: 'error', title: 'Could not update notification', message })
      return
    }
    setReadIds((current) => new Set(current).add(notificationId))
    window.dispatchEvent(new Event('admin-notifications-changed'))
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((item) => !readIds.has(item.id)).map((item) => item.id)
    if (!unreadIds.length || !userId || saving) return
    setSaving(true)
    const readRows = unreadIds.map((notificationId) => ({ notification_id: notificationId, user_id: userId }))
    const { error: readError } = await supabase
      .from('notification_reads')
      .upsert(readRows, { onConflict: 'notification_id,user_id', ignoreDuplicates: true })
    if (readError) {
      const message = friendlyErrorMessage(readError, 'Notifications could not be marked as read.')
      showToast({ tone: 'error', title: 'Could not update notifications', message })
    } else {
      setReadIds((current) => new Set([...current, ...unreadIds]))
      window.dispatchEvent(new Event('admin-notifications-changed'))
      showToast({ tone: 'success', title: 'Notifications cleared', message: 'All notifications are marked as read.' })
    }
    setSaving(false)
  }

  const unreadCount = notifications.filter((item) => !readIds.has(item.id)).length

  return <section className="notifications-page">
    <div className="admin-page-heading">
      <div><span className="eyebrow">WORKSPACE ACTIVITY</span><h1>Notifications</h1><p>Request updates and activity from your workspace.</p></div>
      <button className="admin-action-button" type="button" onClick={markAllAsRead} disabled={!unreadCount || saving}><CheckCheck size={15} />{saving ? 'Saving…' : 'Mark all as read'}</button>
    </div>
    {error ? <div className="admin-error-notice" role="alert"><span>{error}</span><button className="notification-retry" type="button" onClick={retryLoading}>Try again</button></div> : loading ? <div className="admin-empty">Loading notifications…</div> : notifications.length === 0 ? <Card className="notifications-empty"><span><Bell size={20} /></span><b>You're all caught up</b><p>New service requests and status changes will appear here.</p></Card> : <div className="notification-list" aria-label="All notifications">
      {notifications.map((notification) => {
        const isRead = readIds.has(notification.id)
        const Icon = notification.event_type === 'request_created' ? FileText : Clock3
        return <Card className={isRead ? 'notification-item' : 'notification-item is-unread'} key={notification.id}>
          <Link className="notification-item-link" to={`/admin/requests?reference=${encodeURIComponent(notification.request_reference)}`} onClick={() => markAsRead(notification.id)}>
            <span className="notification-icon"><Icon size={17} /></span>
            <span className="notification-copy"><span className="notification-title-row"><b>{notification.title}</b>{!isRead && <i>New</i>}</span><span>{notification.message}</span><small>{notification.request_reference} · {formatNotificationDate(notification.created_at)}</small></span>
            <ArrowUpRight className="notification-open-icon" size={17} />
          </Link>
        </Card>
      })}
    </div>}
  </section>
}
