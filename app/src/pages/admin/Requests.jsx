import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Download, Search } from 'lucide-react'
import Badge from '../../components/ui/Badge.jsx'
import Card from '../../components/ui/Card.jsx'
import { supabase, supabaseConfigured } from '../../supabase'

const filters = ['all', 'new', 'contacted', 'quoted', 'scheduled', 'completed']
const tones = { new: 'aqua', contacted: 'blue', quoted: 'amber', scheduled: 'purple', in_progress: 'orange', completed: 'green', cancelled: 'neutral', lost: 'red' }

export default function Requests() {
  const [requests, setRequests] = useState([])
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabaseConfigured) {
        setLoading(false)
        setError('Connect Supabase to load your request inbox.')
        return
      }
      let query = supabase.from('service_requests').select('id, reference, full_name, phone, service_type, address, preferred_date, status, created_at').order('created_at', { ascending: false }).limit(100)
      if (status !== 'all') query = query.eq('status', status)
      const { data, error: requestError } = await query
      if (!active) return
      if (requestError) setError(requestError.message)
      else setRequests(data || [])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [status])

  const visible = useMemo(() => requests.filter((request) =>
    [request.reference, request.full_name, request.service_type, request.address]
      .some((value) => value?.toLowerCase().includes(search.toLowerCase())),
  ), [requests, search])

  function exportCsv() {
    const columns = ['reference', 'full_name', 'phone', 'service_type', 'address', 'preferred_date', 'status', 'created_at']
    const body = [columns.join(','), ...visible.map((row) => columns.map((key) => `"${String(row[key] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'polishers-requests.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return <section className="requests-page"><div className="admin-page-heading"><div><span className="eyebrow">CLIENT RELATIONSHIPS</span><h1>Requests</h1><p>Every new space starts with a conversation.</p></div><button className="admin-action-button" onClick={exportCsv}><Download size={15} /> Export CSV</button></div>
    <Card className="admin-request-list"><div className="request-list-tools"><div className="filter-chips">{filters.map((item) => <button key={item} className={status === item ? 'chip chip-active' : 'chip'} onClick={() => setStatus(item)}>{item === 'all' ? 'All requests' : item.replace('_', ' ')}</button>)}</div><label className="admin-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, reference or area" /></label></div>
      {error && <div className="admin-inline-notice">{error}</div>}
      {loading ? <div className="admin-empty">Loading requests…</div> : visible.length === 0 ? <div className="admin-empty"><span>✦</span><b>No requests found</b><p>Try a different status or search term.</p></div> : <div className="request-table-wrap"><table className="request-table"><thead><tr><th>CLIENT</th><th>SERVICE</th><th>AREA</th><th>PREFERRED DATE</th><th>STATUS</th><th>RECEIVED</th><th /></tr></thead><tbody>{visible.map((request) => <tr key={request.id}><td><span className="request-avatar">{request.full_name?.[0]}</span><span className="request-client"><b>{request.full_name}</b><small>{request.reference}</small></span></td><td>{request.service_type}</td><td>{request.address || '—'}</td><td>{request.preferred_date || 'Flexible'}</td><td><Badge tone={tones[request.status] || 'neutral'}>{request.status?.replace('_', ' ')}</Badge></td><td>{new Date(request.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td><td><a className="table-arrow" href={`mailto:${request.email || ''}`} aria-label={`Open ${request.reference}`}><ArrowUpRight size={16} /></a></td></tr>)}</tbody></table></div>}
    </Card>
  </section>
}
