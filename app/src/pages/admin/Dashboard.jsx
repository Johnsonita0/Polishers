import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, CalendarDays, CheckCircle2, Clock3, Eye, FileText, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import Badge from '../../components/ui/Badge.jsx'
import Card from '../../components/ui/Card.jsx'
import SearchSelect from '../../components/ui/SearchSelect'
import { useToast } from '../../components/ui/ToastProvider'
import { supabase, supabaseConfigured } from '../../supabase'
import { friendlyErrorMessage } from '../../utils/friendlyError'

const fallbackRequests = [
  { reference: 'PDE-000128', full_name: 'Johnson', service_type: 'Residential', address: 'Lekki Phase 1', status: 'new', created_at: new Date().toISOString() },
  { reference: 'PDE-000127', full_name: 'Tunde Adeyemi', service_type: 'Commercial', address: 'Victoria Island', status: 'contacted', created_at: new Date(Date.now() - 3_600_000).toISOString() },
  { reference: 'PDE-000126', full_name: 'Nneka Eze', service_type: 'Post-construction', address: 'Ikoyi', status: 'quoted', created_at: new Date(Date.now() - 86_400_000).toISOString() },
]

const statusTone = { new: 'aqua', contacted: 'blue', quoted: 'amber', scheduled: 'purple', in_progress: 'orange', completed: 'green', cancelled: 'neutral', lost: 'red' }
const serviceColors = ['#42c9ca', '#e0bd5a', '#7695d0', '#dce4e6']
const dayInMilliseconds = 24 * 60 * 60 * 1000

function buildTimeline(requests, range) {
  const days = range === 'Last 7 days' ? 7 : 30
  const bucketCount = days === 7 ? 7 : 6
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - days + 1)
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const date = new Date(start.getTime() + index * days / bucketCount * dayInMilliseconds)
    return {
      label: days === 7
        ? date.toLocaleDateString('en-GB', { weekday: 'short' })
        : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      count: 0,
    }
  })

  for (const request of requests) {
    const offset = new Date(request.created_at).getTime() - start.getTime()
    if (offset < 0) continue
    const index = Math.min(bucketCount - 1, Math.floor(offset / dayInMilliseconds * bucketCount / days))
    buckets[index].count += 1
  }

  return buckets
}

function buildServiceBreakdown(requests) {
  const counts = new Map()
  for (const request of requests) {
    const service = request.service_type || 'Other'
    counts.set(service, (counts.get(service) || 0) + 1)
  }
  const sorted = [...counts].sort((left, right) => right[1] - left[1])
  const services = sorted.slice(0, 3)
  const otherCount = sorted.slice(3).reduce((total, [, count]) => total + count, 0)
  if (otherCount) services.push(['Other', otherCount])
  const total = services.reduce((sum, [, count]) => sum + count, 0)
  let position = 0
  const items = services.map(([name, count], index) => {
    const start = position
    position += total ? count / total * 100 : 0
    return { name, count, percent: total ? Math.round(count / total * 100) : 0, color: serviceColors[index], start, end: position }
  })
  return {
    items,
    total,
    background: total
      ? `conic-gradient(${items.map(({ color, start, end }) => `${color} ${start}% ${end}%`).join(',')})`
      : '#e4eaec',
  }
}

export default function Dashboard() {
  const [requests, setRequests] = useState([])
  const [analyticsRequests, setAnalyticsRequests] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(supabaseConfigured)
  const [chartRange, setChartRange] = useState('Last 30 days')
  const showToast = useToast()

  useEffect(() => {
    let active = true
    async function loadRequests() {
      try {
        const now = new Date()
        const weekStart = new Date(now)
        weekStart.setHours(0, 0, 0, 0)
        weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
        const analyticsStart = new Date(now)
        analyticsStart.setHours(0, 0, 0, 0)
        analyticsStart.setDate(analyticsStart.getDate() - 29)
        const results = await Promise.all([
          supabase.from('service_requests').select('reference, full_name, service_type, address, status, created_at').order('created_at', { ascending: false }).limit(8),
          supabase.from('service_requests').select('id', { count: 'exact', head: true }).eq('status', 'new'),
          supabase.from('service_requests').select('id', { count: 'exact', head: true }).gte('created_at', weekStart.toISOString()),
          supabase.from('service_requests').select('id', { count: 'exact', head: true }).eq('status', 'scheduled'),
          supabase.from('service_requests').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
          supabase.from('service_requests').select('created_at, service_type').gte('created_at', analyticsStart.toISOString()).order('created_at', { ascending: true }),
        ])
        if (!active) return
        const failedResult = results.find((result) => result.error)
        if (failedResult) {
          const message = friendlyErrorMessage(failedResult.error, 'Could not load dashboard requests. Check your connection and try again.')
          setLoadError(message)
          showToast({ tone: 'error', title: 'Dashboard data unavailable', message })
          return
        }
        const [recentResult, newResult, weekResult, scheduledResult, completedResult, analyticsResult] = results
        setLoadError('')
        setRequests(recentResult.data || [])
        setAnalyticsRequests(analyticsResult.data || [])
        setMetrics({
          new: newResult.count || 0,
          week: weekResult.count || 0,
          scheduled: scheduledResult.count || 0,
          completed: completedResult.count || 0,
        })
      } catch (issue) {
        if (!active) return
        const message = friendlyErrorMessage(issue, 'Could not load dashboard requests. Check your connection and try again.')
        setLoadError(message)
        showToast({ tone: 'error', title: 'Dashboard data unavailable', message })
      } finally {
        if (active) setLoading(false)
      }
    }
    if (supabaseConfigured) loadRequests()
    return () => { active = false }
  }, [showToast])

  const rows = supabaseConfigured ? requests : fallbackRequests
  const chartRequests = supabaseConfigured ? analyticsRequests : fallbackRequests
  const timeline = useMemo(() => buildTimeline(chartRequests, chartRange), [chartRequests, chartRange])
  const servicesInRange = useMemo(() => buildServiceBreakdown(chartRequests), [chartRequests])
  const maxTimelineCount = Math.max(1, ...timeline.map((bucket) => bucket.count))
  const fallbackWeekStart = new Date()
  fallbackWeekStart.setHours(0, 0, 0, 0)
  fallbackWeekStart.setDate(fallbackWeekStart.getDate() - ((fallbackWeekStart.getDay() + 6) % 7))
  const fallbackMetrics = {
    new: fallbackRequests.filter((item) => item.status === 'new').length,
    week: fallbackRequests.filter((item) => new Date(item.created_at) >= fallbackWeekStart).length,
    scheduled: fallbackRequests.filter((item) => item.status === 'scheduled').length,
    completed: fallbackRequests.filter((item) => item.status === 'completed').length,
  }
  const displayMetrics = supabaseConfigured ? metrics : fallbackMetrics
  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const todayLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' }).toUpperCase()

  return (
    <div className="dashboard-page">
      <div className="admin-page-heading"><div><span className="eyebrow">{todayLabel}</span><h1>{greeting}, team <span>✦</span></h1><p>Here's what's happening with your spaces today.</p></div><Link className="admin-action-button" to="/admin/requests"><Users size={15} /> Review requests</Link></div>
      {!supabaseConfigured && <div className="admin-demo-notice"><Sparkles size={16} /><span><b>Preview mode</b> — connect your Supabase project to see live requests and metrics.</span></div>}
      {loadError && <div className="admin-error-notice">{loadError}</div>}
      <div className="admin-kpis">
        <Card className="admin-kpi"><div className="kpi-top"><span>New requests</span><span className="kpi-icon kpi-aqua"><FileText size={17} /></span></div><strong>{loading || !displayMetrics ? '—' : displayMetrics.new}</strong><small>Awaiting first response</small></Card>
        <Card className="admin-kpi"><div className="kpi-top"><span>Requests this week</span><span className="kpi-icon kpi-blue"><CalendarDays size={17} /></span></div><strong>{loading || !displayMetrics ? '—' : displayMetrics.week}</strong><small>Since Monday</small></Card>
        <Card className="admin-kpi"><div className="kpi-top"><span>Jobs scheduled</span><span className="kpi-icon kpi-purple"><Clock3 size={17} /></span></div><strong>{loading || !displayMetrics ? '—' : displayMetrics.scheduled}</strong><small>Marked as scheduled</small></Card>
        <Card className="admin-kpi"><div className="kpi-top"><span>Completed jobs</span><span className="kpi-icon kpi-green"><CheckCircle2 size={17} /></span></div><strong>{loading || !displayMetrics ? '—' : displayMetrics.completed}</strong><small>Marked as completed</small></Card>
      </div>
      <div className="admin-dashboard-grid">
        <Card className="admin-chart-card"><div className="admin-card-heading"><div><h2>Requests over time</h2><p>Requests received in the selected period</p></div><SearchSelect value={chartRange} onChange={setChartRange} options={[{ value: 'Last 30 days', label: 'Last 30 days' }, { value: 'Last 7 days', label: 'Last 7 days' }]} placeholder="Select range" className="admin-range-select" /></div><div className="chart-area"><div className="chart-y-labels"><span>{maxTimelineCount}</span><span>{Math.ceil(maxTimelineCount * .75)}</span><span>{Math.ceil(maxTimelineCount * .5)}</span><span>{Math.ceil(maxTimelineCount * .25)}</span><span>0</span></div><div className="chart-plot"><div className="chart-grid-lines"><i /><i /><i /><i /><i /></div><div className="chart-bars">{timeline.map(({ label, count }, index) => <span key={`${label}-${index}`} title={`${label}: ${count} requests`} style={{ height: `${count ? Math.max(5, count / maxTimelineCount * 100) : 3}%` }} />)}</div><div className="chart-x-labels">{timeline.map(({ label }, index) => <span key={`${label}-${index}`}>{label}</span>)}</div></div></div><div className="chart-legend"><span><i /> Requests</span></div></Card>
        <Card className="admin-service-card"><div className="admin-card-heading"><div><h2>By service</h2><p>Requests received in the last 30 days</p></div></div><div className="donut-wrap"><div className="donut-chart" style={{ background: servicesInRange.background }}><div><b>{servicesInRange.total}</b><small>requests</small></div></div></div><div className="service-legend">{servicesInRange.items.length ? servicesInRange.items.map((service) => <div key={service.name}><i style={{ background: service.color }} /><span>{service.name}</span><b>{service.percent}%</b></div>) : <p className="service-empty">No requests in this period</p>}</div></Card>
      </div>
      <Card className="admin-recent-card"><div className="admin-card-heading"><div><h2>Recent requests <span className="admin-count-pill">{loading ? '…' : displayMetrics ? `${displayMetrics.new} new` : 'Unavailable'}</span></h2><p>Your latest client enquiries, all in one place.</p></div><Link to="/admin/requests">View all requests <ArrowUpRight size={15} /></Link></div><div className="request-table-wrap"><table className="request-table"><thead><tr><th>CLIENT</th><th>SERVICE</th><th>AREA</th><th>STATUS</th><th>RECEIVED</th><th /></tr></thead><tbody>{rows.map((request) => <tr key={request.reference}><td><span className="request-avatar">{request.full_name?.[0]}</span><span className="request-client"><b>{request.full_name}</b><small>{request.reference}</small></span></td><td>{request.service_type}</td><td>{request.address || '—'}</td><td><Badge tone={statusTone[request.status] || 'neutral'}>{request.status?.replaceAll('_', ' ')}</Badge></td><td>{new Date(request.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td><td><Link className="table-arrow" to="/admin/requests" aria-label={`View ${request.reference}`}><Eye size={16} /></Link></td></tr>)}</tbody></table></div></Card>
      <div className="admin-quick-actions"><div><span className="quick-action-icon"><Sparkles size={16} /></span><div><b>Make the site shine</b><small>Keep your homepage feeling fresh.</small></div></div><Link to="/admin/content">Edit your content <ArrowUpRight size={14} /></Link><Link to="/admin/requests"><Users size={15} /> Review new requests</Link></div>
    </div>
  )
}
