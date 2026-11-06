import { useEffect, useState } from 'react'
import { Eye, Image as ImageIcon, Mail, Plus, Save, Send, Trash2, Upload } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import { useToast } from '../../components/ui/ToastProvider'
import { supabase, supabaseConfigured } from '../../supabase'
import { friendlyErrorMessage } from '../../utils/friendlyError'

const emptyCampaign = {
  title: '',
  subject: '',
  preheader: '',
  body: '',
  image_url: '',
  cta_label: '',
  cta_url: '',
}
const allowedImages = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Draft'
}

async function loadSubscribers(accessToken) {
  const response = await fetch('/api/newsletter-admin?action=subscribers', {
    headers: { Authorization: `Bearer ${accessToken || ''}` },
  }).catch(() => null)
  const contentType = response?.headers.get('content-type') || ''
  if (response?.ok && contentType.includes('application/json')) {
    return { ...(await response.json()), viaFallback: false }
  }

  const { data, error, count } = await supabase
    .from('newsletter_subscribers')
    .select('email, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(1000)
  if (error) throw error
  return {
    subscribers: data || [],
    count: count || 0,
    hasMore: (count || 0) > (data || []).length,
    viaFallback: true,
  }
}

export default function NewsletterAdmin() {
  const [campaigns, setCampaigns] = useState([])
  const [subscribers, setSubscribers] = useState([])
  const [subscriberCount, setSubscriberCount] = useState(0)
  const [hasMoreSubscribers, setHasMoreSubscribers] = useState(false)
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deliveryNotice, setDeliveryNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const showToast = useToast()

  useEffect(() => {
    let active = true
    async function loadPage() {
      if (!supabaseConfigured) {
        setError('Connect Supabase and run the latest supabase-schema.sql to manage newsletter campaigns.')
        setLoading(false)
        return
      }
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        const [campaignResult, subscriberData] = await Promise.all([
          supabase.from('newsletter_campaigns').select('id, title, subject, preheader, body, image_url, cta_label, cta_url, status, resend_broadcast_id, created_at, updated_at, sent_at').order('created_at', { ascending: false }),
          loadSubscribers(sessionData.session?.access_token),
        ])
        if (campaignResult.error) throw campaignResult.error
        if (!active) return
        setCampaigns(campaignResult.data || [])
        setSubscribers(subscriberData.subscribers || [])
        setSubscriberCount(subscriberData.count || 0)
        setHasMoreSubscribers(Boolean(subscriberData.hasMore))
        setDeliveryNotice(subscriberData.viaFallback
          ? 'Subscriber emails are loaded from Supabase. Campaign sending requires the newsletter API and Resend configuration.'
          : '')
        setError('')
      } catch (issue) {
        if (!active) return
        const message = issue?.code === 'PGRST205'
          ? 'The newsletter tables are not installed yet. Run the latest supabase-schema.sql in your Supabase SQL Editor, then reload this page.'
          : friendlyErrorMessage(issue, 'Newsletter campaigns could not be loaded. Check your connection and try again.')
        setError(message)
        showToast({ tone: 'error', title: 'Could not load newsletter', message })
      } finally {
        if (active) setLoading(false)
      }
    }
    loadPage()
    return () => { active = false }
  }, [showToast])

  function updateDraft(key, value) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function saveDraft(event) {
    event.preventDefault()
    if (!draft || saving) return
    setSaving(true)
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      const record = {
        title: draft.title.trim(),
        subject: draft.subject.trim(),
        preheader: draft.preheader.trim(),
        body: draft.body.trim(),
        image_url: draft.image_url || null,
        cta_label: draft.cta_label.trim(),
        cta_url: draft.cta_url.trim(),
        status: 'draft',
        updated_by: userData.user.id,
      }
      const result = draft.id
        ? await supabase.from('newsletter_campaigns').update(record).eq('id', draft.id).eq('status', 'draft').select().single()
        : await supabase.from('newsletter_campaigns').insert({ ...record, created_by: userData.user.id }).select().single()
      if (result.error) throw result.error
      setDraft(result.data)
      setCampaigns((current) => [result.data, ...current.filter((item) => item.id !== result.data.id)])
      showToast({ tone: 'success', title: 'Newsletter saved', message: 'Your draft is ready to preview or send.' })
    } catch (issue) {
      const message = friendlyErrorMessage(issue, 'The newsletter draft could not be saved.')
      showToast({ tone: 'error', title: 'Could not save newsletter', message })
    } finally {
      setSaving(false)
    }
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!allowedImages[file.type] || file.size > 10 * 1024 * 1024) {
      showToast({ tone: 'error', title: 'Unsupported newsletter image', message: 'Choose a JPG, PNG, or WebP image up to 10 MB.' })
      return
    }

    setUploading(true)
    const path = `newsletter/${crypto.randomUUID()}.${allowedImages[file.type]}`
    try {
      const { error: uploadError } = await supabase.storage.from('newsletter-media').upload(path, file, { cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('newsletter-media').getPublicUrl(path)
      updateDraft('image_url', data.publicUrl)
      showToast({ tone: 'success', title: 'Image uploaded', message: 'Save the draft to keep this image with the campaign.' })
    } catch (issue) {
      await supabase.storage.from('newsletter-media').remove([path])
      const message = friendlyErrorMessage(issue, 'The newsletter image could not be uploaded.')
      showToast({ tone: 'error', title: 'Image upload failed', message })
    } finally {
      setUploading(false)
    }
  }

  async function sendCampaign() {
    if (!draft?.id || draft.status !== 'draft' || sending) return
    if (!window.confirm(`Send “${draft.subject}” to ${subscriberCount} subscribed contacts now?`)) return
    setSending(true)
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      const response = await fetch('/api/newsletter-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token || ''}` },
        body: JSON.stringify({ action: 'send', campaignId: draft.id }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'The newsletter could not be sent.')
      await reloadCampaigns()
      setDraft((current) => ({ ...current, status: 'sent', resend_broadcast_id: result.broadcastId, sent_at: new Date().toISOString() }))
      showToast({ tone: result.warning ? 'info' : 'success', title: 'Newsletter sent', message: result.warning || `Sent to ${subscriberCount} subscribed contacts.` })
    } catch (issue) {
      showToast({ tone: 'error', title: 'Could not send newsletter', message: friendlyErrorMessage(issue, 'Please try again after checking your Resend setup.') })
    } finally {
      setSending(false)
    }
  }

  async function reloadCampaigns() {
    const { data, error: loadError } = await supabase.from('newsletter_campaigns').select('id, title, subject, preheader, body, image_url, cta_label, cta_url, status, resend_broadcast_id, created_at, updated_at, sent_at').order('created_at', { ascending: false })
    if (loadError) throw loadError
    setCampaigns(data || [])
  }

  async function deleteDraft(campaign) {
    if (campaign.status !== 'draft' || !window.confirm(`Delete “${campaign.title}”? This cannot be undone.`)) return
    const { error: deleteError } = await supabase.from('newsletter_campaigns').delete().eq('id', campaign.id).eq('status', 'draft')
    if (deleteError) {
      showToast({ tone: 'error', title: 'Could not delete draft', message: friendlyErrorMessage(deleteError, 'Try again.') })
      return
    }
    setCampaigns((current) => current.filter((item) => item.id !== campaign.id))
    if (draft?.id === campaign.id) setDraft(null)
    showToast({ tone: 'success', title: 'Draft deleted', message: 'The newsletter draft has been removed.' })
  }

  const previewHtml = draft?.body?.trim() || 'Your newsletter message will appear here.'

  return <section className="newsletter-admin-page">
    <div className="admin-page-heading"><div><span className="eyebrow">EMAIL MARKETING</span><h1>Newsletter</h1><p>Create a campaign and send it to subscribed contacts.</p></div><button className="admin-action-button" type="button" onClick={() => setDraft({ ...emptyCampaign })}><Plus size={15} /> New newsletter</button></div>
    {error && <div className="admin-error-notice">{error}</div>}
    {deliveryNotice && <div className="admin-demo-notice"><Mail size={15} /><span>{deliveryNotice}</span></div>}
    <div className="newsletter-admin-overview">
      <Card className="newsletter-subscriber-card"><div><span className="kpi-icon kpi-aqua"><Mail size={17} /></span><span className="eyebrow">SUBSCRIBERS</span></div><strong>{subscriberCount}</strong><p>Collected newsletter subscribers</p>{subscribers.length > 0 && <div className="newsletter-subscriber-list"><b>Subscriber emails{hasMoreSubscribers ? ' (latest 1,000)' : ''}</b>{subscribers.map((subscriber) => <span key={subscriber.email}>{subscriber.email}</span>)}</div>}</Card>
      <Card className="newsletter-campaign-list"><div className="newsletter-panel-heading"><div><h2>Saved newsletters</h2><p>{campaigns.length} saved campaign{campaigns.length === 1 ? '' : 's'}</p></div></div>{loading ? <div className="admin-empty">Loading campaigns…</div> : campaigns.length === 0 ? <div className="newsletter-no-campaigns">No campaigns yet. Create a draft to get started.</div> : <div className="newsletter-campaign-rows">{campaigns.map((campaign) => <article className="newsletter-campaign-row" key={campaign.id}><button type="button" onClick={() => setDraft(campaign)}><span className={`newsletter-campaign-status is-${campaign.status}`}>{campaign.status}</span><b>{campaign.title}</b><small>{campaign.subject}</small><time>{formatDate(campaign.sent_at || campaign.updated_at)}</time></button>{campaign.status === 'draft' && <button className="newsletter-delete-button" type="button" aria-label={`Delete ${campaign.title}`} onClick={() => deleteDraft(campaign)}><Trash2 size={15} /></button>}</article>)}</div>}</Card>
    </div>
    {draft && <div className="newsletter-editor-layout"><Card className="newsletter-editor-card"><form onSubmit={saveDraft}><div className="newsletter-panel-heading"><div><span className="eyebrow">{draft.id ? draft.status === 'sent' ? 'SENT CAMPAIGN' : 'EDIT DRAFT' : 'NEW DRAFT'}</span><h2>{draft.id ? draft.title : 'Compose newsletter'}</h2></div><button className="content-icon-action" type="button" onClick={() => setDraft(null)}>Close</button></div><label className="newsletter-field">Campaign title / email headline<input required maxLength={120} value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} disabled={draft.status !== 'draft'} placeholder="e.g. Fresh ideas for a happier space" /></label><label className="newsletter-field">Email subject<input required maxLength={150} value={draft.subject} onChange={(event) => updateDraft('subject', event.target.value)} disabled={draft.status !== 'draft'} placeholder="A fresh start for your home" /></label><label className="newsletter-field">Preview text<input maxLength={180} value={draft.preheader || ''} onChange={(event) => updateDraft('preheader', event.target.value)} disabled={draft.status !== 'draft'} placeholder="A short line shown beside the subject" /></label><label className="newsletter-field">Message<textarea required rows={8} maxLength={10000} value={draft.body} onChange={(event) => updateDraft('body', event.target.value)} disabled={draft.status !== 'draft'} placeholder="Write your newsletter message. Separate paragraphs with a blank line." /></label><div className="newsletter-field"><span>Campaign image</span><div className="newsletter-image-upload">{draft.image_url ? <img src={draft.image_url} alt="Newsletter campaign" /> : <span className="newsletter-image-empty"><ImageIcon size={20} />No image uploaded</span>}<label className="newsletter-upload-button"><Upload size={15} />{uploading ? 'Uploading…' : draft.image_url ? 'Replace image' : 'Upload image'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} disabled={uploading || draft.status !== 'draft' || !supabaseConfigured} /></label>{draft.image_url && draft.status === 'draft' && <button type="button" className="content-icon-action is-danger" onClick={() => updateDraft('image_url', '')}>Remove image</button>}</div><small>JPG, PNG, or WebP up to 10 MB. Image is public so email clients can display it.</small></div><div className="newsletter-cta-fields"><label className="newsletter-field">Button label<input maxLength={50} value={draft.cta_label || ''} onChange={(event) => updateDraft('cta_label', event.target.value)} disabled={draft.status !== 'draft'} placeholder="Explore our services" /></label><label className="newsletter-field">Button URL<input type="url" value={draft.cta_url || ''} onChange={(event) => updateDraft('cta_url', event.target.value)} disabled={draft.status !== 'draft'} placeholder="https://polishers.vercel.app/services" /></label></div><div className="newsletter-editor-actions">{draft.status === 'draft' && <><button className="button button-quiet" type="button" onClick={() => setDraft({ ...emptyCampaign })}>New draft</button><button className="button button-dark" type="submit" disabled={saving || uploading}><Save size={15} />{saving ? 'Saving…' : 'Save draft'}</button><button className="button button-aqua" type="button" onClick={sendCampaign} disabled={!draft.id || !subscriberCount || saving || sending}>{sending ? 'Sending…' : <><Send size={15} /> Send to subscribers</>}</button></>}</div></form></Card><Card className="newsletter-preview-card"><div className="newsletter-panel-heading"><div><span className="eyebrow">EMAIL PREVIEW</span><h2>{draft.subject || 'Your subject line'}</h2></div><Eye size={16} /></div><div className="newsletter-preview"><header><img src={`${import.meta.env.BASE_URL}Polishers%20DA%20Elite%20Logo.png`} alt="Polishers Da Elite" /></header>{draft.preheader && <small className="newsletter-preview-preheader">{draft.preheader}</small>}<div className="newsletter-preview-body"><span className="eyebrow">POLISHERS DA ELITE</span><h3>{draft.title || 'Your newsletter headline'}</h3>{draft.image_url && <img className="newsletter-preview-image" src={draft.image_url} alt="Newsletter preview" />}<p>{previewHtml}</p>{draft.cta_label && <span className="newsletter-preview-cta">{draft.cta_label}</span>}</div><footer><b>Polishers Da Elite Cleaning Services</b><span>Lagos, Nigeria · +234 809 538 9606</span><small>Unsubscribe from these updates at any time.</small></footer></div></Card></div>}
  </section>
}
