import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Download, MessageCircle, Minus, Plus, Search, X, ZoomIn } from 'lucide-react'
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
        setLoading(true)
        setError('')
        const pageSize = 500
        const allRequests = []
        let offset = 0
        while (true) {
          let query = supabase.from('service_requests')
            .select('id, reference, full_name, phone, email, service_type, property_type, size_note, address, preferred_date, preferred_time, message, photo_urls, status, created_at')
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range(offset, offset + pageSize - 1)
          if (requestedReference) query = query.eq('reference', requestedReference)
          const { data, error: requestError } = await query
          if (requestError) throw requestError
          allRequests.push(...(data || []))
          if (requestedReference || (data || []).length < pageSize) break
          offset += pageSize
        }
        if (!active) return
        const photoPaths = [...new Set(allRequests.flatMap((request) => request.photo_urls || []))]
        const signedUrlsByPath = new Map()
        if (photoPaths.length) {
          try {
            for (let index = 0; index < photoPaths.length; index += 100) {
              const { data: signedPhotos, error: signedPhotoError } = await supabase.storage
                .from('request-uploads')
                .createSignedUrls(photoPaths.slice(index, index + 100), 60 * 60)
              if (signedPhotoError) throw signedPhotoError
              for (const photo of signedPhotos || []) {
                if (photo.path && photo.signedUrl) signedUrlsByPath.set(photo.path, photo.signedUrl)
              }
            }
          } catch (issue) {
            showToast({ tone: 'error', title: 'Request photos unavailable', message: friendlyErrorMessage(issue, 'Client details loaded, but attached photos could not be opened.') })
          }
        }
        if (!active) return
        setRequests(allRequests.map((request) => ({
          ...request,
          photo_urls: (request.photo_urls || []).map((path) => signedUrlsByPath.get(path)).filter(Boolean),
        })))
        if (requestedReference && allRequests[0]) setExpandedRequests(new Set([allRequests[0].id]))
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
  }, [requestedReference, showToast])

  const visible = useMemo(() => {
    const searchTerm = search.trim().toLocaleLowerCase()
    return requests.filter((request) => {
      if (status !== 'all' && request.status !== status) return false
      if (!searchTerm) return true
      return [
        request.reference,
        request.full_name,
        request.phone,
        request.email,
        request.service_type,
        request.property_type,
        request.size_note,
        request.address,
        request.preferred_date,
        request.preferred_time,
        request.message,
        request.status,
      ].some((value) => String(value || '').toLocaleLowerCase().includes(searchTerm))
    })
  }, [requests, search, status])

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

  return <section className="requests-page"><div className="admin-page-heading"><div><span className="eyebrow">CLIENT RELATIONSHIPS</span><h1>Requests</h1><p>{requests.length.toLocaleString()} total requests · {requests.filter((request) => request.status === 'new').length.toLocaleString()} new</p></div><button className="admin-action-button" type="button" onClick={exportCsv}><Download size={15} /> Export CSV</button></div>
    <Card className="admin-request-list"><div className="request-list-tools"><div className="filter-chips">{filters.map((item) => <button key={item} className={status === item ? 'chip chip-active' : 'chip'} onClick={() => setStatus(item)}>{item === 'all' ? 'All requests' : item.replaceAll('_', ' ')}</button>)}</div><label className="admin-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, reference or area" /></label></div>
      {error && <div className="admin-inline-notice">{error}</div>}
      {loading ? <div className="admin-empty">Loading requests…</div> : visible.length === 0 ? <div className="admin-empty"><span>✦</span><b>No requests found</b><p>Try a different status or search term.</p></div> : <>
        <div className="request-table-wrap request-table-desktop"><table className="request-table"><thead><tr><th>CLIENT</th><th>SERVICE</th><th>AREA</th><th>PREFERRED DATE</th><th>STATUS</th><th>RECEIVED</th><th /></tr></thead><tbody>{visible.map((request) => <RequestTableRows key={request.id} request={request} expanded={expandedRequests.has(request.id)} onToggle={() => toggleExpanded(request.id)} updating={updatingId === request.id} onMarkContacted={() => markContacted(request)} />)}</tbody></table></div>
        <div className="request-cards-mobile">{visible.map((request) => <article className={`request-mobile-card ${expandedRequests.has(request.id) ? 'is-expanded' : ''}`} key={request.id}><button className="request-mobile-summary" type="button" aria-expanded={expandedRequests.has(request.id)} onClick={() => toggleExpanded(request.id)}><span className="request-avatar">{request.full_name?.[0]}</span><span className="request-client"><b>{request.full_name}</b><small>{request.reference}</small></span><Badge tone={tones[request.status] || 'neutral'}>{request.status?.replace('_', ' ')}</Badge>{expandedRequests.has(request.id) ? <Minus className="request-expand-icon" size={17} /> : <Plus className="request-expand-icon" size={17} />}</button>{expandedRequests.has(request.id) && <RequestDetail request={request} updating={updatingId === request.id} onMarkContacted={() => markContacted(request)} />}</article>)}</div>
      </>}
    </Card>
  </section>
}

function RequestTableRows({ request, expanded, onToggle, updating, onMarkContacted }) {
  return <>
    <tr className={expanded ? 'request-row-summary is-expanded' : 'request-row-summary'} tabIndex={0} aria-expanded={expanded} onClick={onToggle} onKeyDown={(event) => { if (event.target !== event.currentTarget || !['Enter', ' '].includes(event.key)) return; event.preventDefault(); onToggle() }}>
      <td><span className="request-avatar">{request.full_name?.[0]}</span><span className="request-client"><b>{request.full_name}</b><small>{request.reference}</small></span></td>
      <td>{request.service_type}</td><td>{request.address || '—'}</td><td>{request.preferred_date || 'Flexible'}</td>
      <td><Badge tone={tones[request.status] || 'neutral'}>{request.status?.replace('_', ' ')}</Badge></td>
      <td>{new Date(request.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
      <td><button className="request-expand-button" type="button" aria-label={`${expanded ? 'Hide' : 'Show'} details for ${request.reference}`} aria-expanded={expanded} onClick={(event) => { event.stopPropagation(); onToggle() }}>{expanded ? <Minus size={16} /> : <Plus size={16} />}</button></td>
    </tr>
    {expanded && <tr className="request-detail-row"><td colSpan="7"><RequestDetail request={request} updating={updating} onMarkContacted={onMarkContacted} /></td></tr>}
  </>
}

function RequestDetail({ request, updating, onMarkContacted }) {
  const [previewUrl, setPreviewUrl] = useState('')
  const service = request.service_type?.replaceAll('_', ' ') || 'cleaning service'
  const message = [`Hi ${request.full_name || 'there'}, this is the Polishers Da Elite team.`, `We received your request ${request.reference} for ${service}${request.address ? ` in ${request.address}` : ''}${request.preferred_date ? `, with a preferred date of ${request.preferred_date}` : ''}.`, 'Is this a good time to discuss how we can help?'].join(' ')
  const contactHref = whatsappHref(request.phone, message)

  useEffect(() => {
    if (!previewUrl) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function closeOnEscape(event) {
      if (event.key === 'Escape') setPreviewUrl('')
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [previewUrl])
  return <div className="request-detail-panel">{request.photo_urls?.length > 0 && <section className="request-photos" aria-label="Client building photos"><h3>Photos of the space</h3><div className="request-photo-grid">{request.photo_urls.map((photoUrl, index) => <button className="request-photo-button" type="button" aria-label={`Zoom photo ${index + 1} of ${request.full_name}'s space`} onClick={() => setPreviewUrl(photoUrl)} key={photoUrl}><img src={photoUrl} alt={`${request.full_name}'s space, photo ${index + 1}`} loading="lazy" /><span><ZoomIn size={13} /> Zoom</span></button>)}</div></section>}<dl><div><dt>Phone</dt><dd>{request.phone || 'Not provided'}</dd></div><div><dt>Email</dt><dd>{request.email || 'Not provided'}</dd></div><div><dt>Service</dt><dd>{request.service_type}</dd></div><div><dt>Area</dt><dd>{request.address || 'Not provided'}</dd></div><div><dt>Preferred date</dt><dd>{request.preferred_date || 'Flexible'}</dd></div><div><dt>Received</dt><dd>{new Date(request.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>{request.message && <div className="request-message-detail"><dt>Client message</dt><dd>{request.message}</dd></div>}</dl><div className="request-mobile-actions">{contactHref ? <a className="request-whatsapp-button" href={contactHref} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Message {request.full_name?.split(' ')[0] || 'client'}</a> : <span className="request-no-phone">No phone number supplied</span>}<button className="request-contacted-button" type="button" disabled={request.status === 'contacted' || updating} onClick={onMarkContacted}>{request.status === 'contacted' ? <><Check size={14} /> Contacted</> : updating ? 'Saving…' : 'Mark contacted'}</button></div>{previewUrl && <div className="request-photo-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewUrl('') }}><section role="dialog" aria-modal="true" aria-label={`Photo of ${request.full_name}'s space`}><button className="request-photo-modal-close" type="button" aria-label="Close photo" onClick={() => setPreviewUrl('')}><X size={20} /></button><img src={previewUrl} alt={`Full-size photo of ${request.full_name}'s space`} /></section></div>}</div>
}
