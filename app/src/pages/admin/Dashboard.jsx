import { useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, CalendarDays, CheckCircle2, Clock3, FileText, Plus, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import Badge from '../../components/ui/Badge.jsx'
import Card from '../../components/ui/Card.jsx'
import { supabase, supabaseConfigured } from '../../supabase'

const fallbackRequests = [
  { reference: 'PDE-000128', full_name: 'Johnson', service_type: 'Residential', address: 'Lekki Phase 1', status: 'new', created_at: new Date().toISOString() },
  { reference: 'PDE-000127', full_name: 'Tunde Adeyemi', service_type: 'Commercial', address: 'Victoria Island', status: 'contacted', created_at: new Date(Date.now() - 3_600_000).toISOString() },
  { reference: 'PDE-000126', full_name: 'Nneka Eze', service_type: 'Post-construction', address: 'Ikoyi', status: 'quoted', created_at: new Date(Date.now() - 86_400_000).toISOString() },
]

const statusTone = { new: 'aqua', contacted: 'blue', quoted: 'amber', scheduled: 'purple', in_progress: 'orange', completed: 'green', cancelled: 'neutral', lost: 'red' }

export default function Dashboard() {
  const [requests, setRequests] = useState([])
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    async function loadRequests() {
      const { data, error } = await supabase
        .from('service_requests')
        .select('reference, full_name, service_type, address, status, created_at')
        .order('created_at', { ascending: false })
        .limit(8)
      if (!active) return
      if (error) {
        setLoadError(error.message)
        return
      }
      setRequests(data || [])
    }
    if (supabaseConfigured) loadRequests()
    return () => { active = false }
  }, [])

  const rows = supabaseConfigured ? requests : fallbackRequests
  const newCount = useMemo(() => rows.filter((item) => item.status === 'new').length, [rows])

  return (
    <div className="dashboard-page">
      <div className="admin-page-heading"><div><span className="eyebrow">MONDAY, 04 NOVEMBER</span><h1>Good morning, team <span>✦</span></h1><p>Here's what's happening with your spaces today.</p></div><Link className="admin-action-button" to="/admin/requests"><Plus size={16} /> New request</Link></div>
      {!supabaseConfigured && <div className="admin-demo-notice"><Sparkles size={16} /><span><b>Preview mode</b> — connect your Supabase project to see live requests and metrics.</span></div>}
      {loadError && <div className="admin-error-notice">Could not load request data: {loadError}</div>}
      <div className="admin-kpis">
        <Card className="admin-kpi"><div className="kpi-top"><span>New requests</span><span className="kpi-icon kpi-aqua"><FileText size={17} /></span></div><strong>{supabaseConfigured ? newCount : '12'}</strong><small><b className="trend-up"><ArrowUpRight size={13} /> 8.2%</b> from last week</small><span className="kpi-sparkline spark-aqua">▁▂▁▃▂▄▃▅</span></Card>
        <Card className="admin-kpi"><div className="kpi-top"><span>Requests this week</span><span className="kpi-icon kpi-blue"><CalendarDays size={17} /></span></div><strong>{supabaseConfigured ? rows.length : '38'}</strong><small><b className="trend-up"><ArrowUpRight size={13} /> 12.4%</b> from last week</small><span className="kpi-sparkline spark-blue">▂▃▂▄▃▅▄▆</span></Card>
        <Card className="admin-kpi"><div className="kpi-top"><span>Jobs scheduled</span><span className="kpi-icon kpi-purple"><Clock3 size={17} /></span></div><strong>09</strong><small><b>3</b> coming up tomorrow</small><span className="kpi-sparkline spark-purple">▁▂▃▂▄▃▅▄</span></Card>
        <Card className="admin-kpi"><div className="kpi-top"><span>Completed jobs</span><span className="kpi-icon kpi-green"><CheckCircle2 size={17} /></span></div><strong>84<span className="kpi-percent">%</span></strong><small><b className="trend-up"><ArrowUpRight size={13} /> 4.1%</b> this month</small><span className="kpi-sparkline spark-green">▂▃▄▃▄▅▆▅</span></Card>
      </div>
      <div className="admin-dashboard-grid">
        <Card className="admin-chart-card"><div className="admin-card-heading"><div><h2>Requests over time</h2><p>A look at your incoming requests</p></div><select aria-label="Chart range"><option>Last 30 days</option><option>Last 7 days</option></select></div><div className="chart-area"><div className="chart-y-labels"><span>40</span><span>30</span><span>20</span><span>10</span><span>0</span></div><div className="chart-plot"><div className="chart-grid-lines"><i /><i /><i /><i /><i /></div><div className="chart-bars">{[32, 46, 37, 60, 48, 73, 56, 83, 68, 91, 62, 77, 97, 72].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}</div><div className="chart-x-labels"><span>Oct 1</span><span>Oct 7</span><span>Oct 14</span><span>Oct 21</span><span>Oct 28</span></div></div></div><div className="chart-legend"><span><i /> This month</span><span><i /> Last month</span></div></Card>
        <Card className="admin-service-card"><div className="admin-card-heading"><div><h2>By service</h2><p>Requests by service type</p></div><button aria-label="More service options">···</button></div><div className="donut-wrap"><div className="donut-chart"><div><b>38</b><small>requests</small></div></div></div><div className="service-legend"><div><i className="legend-aqua" /><span>Residential</span><b>42%</b></div><div><i className="legend-gold" /><span>Commercial</span><b>28%</b></div><div><i className="legend-blue" /><span>Post-construction</span><b>18%</b></div><div><i className="legend-gray" /><span>Industrial & other</span><b>12%</b></div></div></Card>
      </div>
      <Card className="admin-recent-card"><div className="admin-card-heading"><div><h2>Recent requests <span className="admin-count-pill">{newCount} new</span></h2><p>Your latest client enquiries, all in one place.</p></div><Link to="/admin/requests">View all requests <ArrowUpRight size={15} /></Link></div><div className="request-table-wrap"><table className="request-table"><thead><tr><th>CLIENT</th><th>SERVICE</th><th>AREA</th><th>STATUS</th><th>RECEIVED</th><th /></tr></thead><tbody>{rows.map((request) => <tr key={request.reference}><td><span className="request-avatar">{request.full_name?.[0]}</span><span className="request-client"><b>{request.full_name}</b><small>{request.reference}</small></span></td><td>{request.service_type}</td><td>{request.address || '—'}</td><td><Badge tone={statusTone[request.status] || 'neutral'}>{request.status?.replace('_', ' ')}</Badge></td><td>{new Date(request.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td><td><button className="table-arrow" aria-label={`Open ${request.reference}`}><ArrowDownRight size={16} /></button></td></tr>)}</tbody></table></div></Card>
      <div className="admin-quick-actions"><div><span className="quick-action-icon"><Sparkles size={16} /></span><div><b>Make the site shine</b><small>Keep your homepage feeling fresh.</small></div></div><Link to="/admin/content">Edit your content <ArrowUpRight size={14} /></Link><Link to="/admin/requests"><Users size={15} /> Review new requests</Link></div>
    </div>
  )
}
