import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, ChevronDown, Download, MessageCircle, Search } from 'lucide-react'
import Badge from '../../components/ui/Badge.jsx'
import Card from '../../components/ui/Card.jsx'
import { useToast } from '../../components/ui/ToastProvider'
import { supabase, supabaseConfigured } from '../../supabase'
import { friendlyErrorMessage } from '../../utils/friendlyError'
import { whatsappHref } from '../../utils/whatsapp'

const filters = ['all', 'new', 'contacted', 'quoted', 'scheduled', 'in_progress', 'completed', 'cancelled', 'lost']
const tones = { new: 'aqua', contacted: 'blue', quoted: 'amber', scheduled: 'purple', in_progress: 'orange', completed: 'green', cancelled: 'neutral', lost: 'red' }

export default function Requests() {
  const [searchParams] = useSearchParams()
  const requestedReference = searchParams.get('reference') || ''
  const [requests, setRequests] = useState([])
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState(requestedReference)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState('')
  const [expandedRequests, setExpandedRequests] = useState(() => new Set())
  const showToast = useToast()

  useEffect(() => {
    let active = true
    async function load() {
      if (!supabaseConfigured) {
        setLoading(false)
        const message = 'Your request inbox is unavailable because Supabase is not connected.'
        setError(message)
        showToast({ tone: 'error', title: 'Request inbox unavailable', message })
        return
      }
      try {
        let query = supabase.from('service_requests').select('id, reference, full_name, phone, email, service_type, address, preferred_date, message, status, created_at').order('created_at', { ascending: false })
        if (requestedReference) query = query.eq('reference', requestedReference).limit(1)
        else {
          if (status !== 'all') query = query.eq('status', status)
          query = query.limit(100)
        }
        const { data, error: requestError } = await query
        if (!active) return
        if (requestError) {
          const message = friendlyErrorMessage(requestError, 'Could not load requests. Check your connection and try again.')
          setError(message)
          showToast({ tone: 'error', title: 'Could not load requests', message })
        } else {
          setError('')
          setRequests(data || [])
          if (requestedReference && data?.[0]) setExpandedRequests(new Set([data[0].id]))
        }
      } catch (issue) {
        if (!active) return
        const message = friendlyErrorMessage(issue, 'Could not load requests. Check your connection and try again.')
        setError(message)
        showToast({ tone: 'error', title: 'Could not load requests', message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [requestedReference, status, showToast])

  const visible = useMemo(() => requests.filter((request) =>
    [request.reference, request.full_name, request.service_type, request.address]
      .some((value) => value?.toLowerCase().includes(search.toLowerCase())),
  ), [requests, search])

  function toggleExpanded(requestId) {
    setExpandedRequests((current) => {
      const next = new Set(current)
      if (next.has(requestId)) next.delete(requestId)
      else next.add(requestId)
      return next
    })
  }

  async function markContacted(request) {
    if (request.status === 'contacted' || updatingId) return
    setUpdatingId(request.id)
    try {
      const { error: updateError } = await supabase
        .from('service_requests')
        .update({ status: 'contacted' })
        .eq('id', request.id)
      if (updateError) throw updateError
      setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status: 'contacted' } : item))
      showToast({ tone: 'success', title: 'Request updated', message: `${request.full_name}'s request is now marked as contacted.` })
    } catch (issue) {
      const message = friendlyErrorMessage(issue, 'We could not update this request. Check your connection and try again.')
      showToast({ tone: 'error', title: 'Status not updated', message })
    } finally {
      setUpdatingId('')
    }
  }

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
    <Card className="admin-request-list"><div className="request-list-tools"><div className="filter-chips">{filters.map((item) => <button key={item} className={status === item ? 'chip chip-active' : 'chip'} onClick={() => setStatus(item)}>{item === 'all' ? 'All requests' : item.replaceAll('_', ' ')}</button>)}</div><label className="admin-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, reference or area" /></label></div>
      {error && <div className="admin-inline-notice">{error}</div>}
      {loading ? <div className="admin-empty">Loading requests…</div> : visible.length === 0 ? <div className="admin-empty"><span>✦</span><b>No requests found</b><p>Try a different status or search term.</p></div> : <>
        <div className="request-table-wrap request-table-desktop"><table className="request-table"><thead><tr><th>CLIENT</th><th>SERVICE</th><th>AREA</th><th>PREFERRED DATE</th><th>STATUS</th><th>RECEIVED</th><th /></tr></thead><tbody>{visible.map((request) => <RequestTableRows key={request.id} request={request} expanded={expandedRequests.has(request.id)} onToggle={() => toggleExpanded(request.id)} updating={updatingId === request.id} onMarkContacted={() => markContacted(request)} />)}</tbody></table></div>
        <div className="request-cards-mobile">{visible.map((request) => <article className={`request-mobile-card ${expandedRequests.has(request.id) ? 'is-expanded' : ''}`} key={request.id}><button className="request-mobile-summary" type="button" aria-expanded={expandedRequests.has(request.id)} onClick={() => toggleExpanded(request.id)}><span className="request-avatar">{request.full_name?.[0]}</span><span className="request-client"><b>{request.full_name}</b><small>{request.reference}</small></span><Badge tone={tones[request.status] || 'neutral'}>{request.status?.replace('_', ' ')}</Badge><ChevronDown className="request-expand-icon" size={17} /></button>{expandedRequests.has(request.id) && <RequestDetail request={request} updating={updatingId === request.id} onMarkContacted={() => markContacted(request)} />}</article>)}</div>
      </>}
    </Card>
  </section>
}

function RequestTableRows({ request, expanded, onToggle, updating, onMarkContacted }) {
  return <>
    <tr className={expanded ? 'request-row-summary is-expanded' : 'request-row-summary'} onClick={onToggle}>
      <td><span className="request-avatar">{request.full_name?.[0]}</span><span className="request-client"><b>{request.full_name}</b><small>{request.reference}</small></span></td>
      <td>{request.service_type}</td><td>{request.address || '—'}</td><td>{request.preferred_date || 'Flexible'}</td>
      <td><Badge tone={tones[request.status] || 'neutral'}>{request.status?.replace('_', ' ')}</Badge></td>
      <td>{new Date(request.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
      <td><button className="request-expand-button" type="button" aria-label={`${expanded ? 'Hide' : 'Show'} details for ${request.reference}`} aria-expanded={expanded} onClick={(event) => { event.stopPropagation(); onToggle() }}><ChevronDown size={16} /></button></td>
    </tr>
    {expanded && <tr className="request-detail-row"><td colSpan="7"><RequestDetail request={request} updating={updating} onMarkContacted={onMarkContacted} /></td></tr>}
  </>
}

function RequestDetail({ request, updating, onMarkContacted }) {
  const service = request.service_type?.replaceAll('_', ' ') || 'cleaning service'
  const message = [`Hi ${request.full_name || 'there'}, this is the Polishers Da Elite team.`, `We received your request ${request.reference} for ${service}${request.address ? ` in ${request.address}` : ''}${request.preferred_date ? `, with a preferred date of ${request.preferred_date}` : ''}.`, 'Is this a good time to discuss how we can help?'].join(' ')
  const contactHref = whatsappHref(request.phone, message)
  return <div className="request-detail-panel"><dl><div><dt>Phone</dt><dd>{request.phone || 'Not provided'}</dd></div><div><dt>Email</dt><dd>{request.email || 'Not provided'}</dd></div><div><dt>Service</dt><dd>{request.service_type}</dd></div><div><dt>Area</dt><dd>{request.address || 'Not provided'}</dd></div><div><dt>Preferred date</dt><dd>{request.preferred_date || 'Flexible'}</dd></div><div><dt>Received</dt><dd>{new Date(request.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>{request.message && <div className="request-message-detail"><dt>Client message</dt><dd>{request.message}</dd></div>}</dl><div className="request-mobile-actions">{contactHref ? <a className="request-whatsapp-button" href={contactHref} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Message {request.full_name?.split(' ')[0] || 'client'}</a> : <span className="request-no-phone">No phone number supplied</span>}<button className="request-contacted-button" type="button" disabled={request.status === 'contacted' || updating} onClick={onMarkContacted}>{request.status === 'contacted' ? <><Check size={14} /> Contacted</> : updating ? 'Saving…' : 'Mark contacted'}</button></div></div>
}
