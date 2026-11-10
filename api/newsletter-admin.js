const emailEscape = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[character])

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const resendApiKey = process.env.RESEND_API_KEY
const resendSegmentId = process.env.RESEND_SEGMENT_ID || process.env.RESEND_AUDIENCE_ID
const socialLinksHtml = require('./email-socials')

async function verifyAdmin(authorization) {
  if (!authorization || !supabaseUrl || !supabaseAnonKey) return null
  const headers = { apikey: supabaseAnonKey, Authorization: authorization }
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers })
  if (!userResponse.ok) return null
  const user = await userResponse.json()
  if (!user.id) return null

  const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role,is_active`, { headers })
  if (!profileResponse.ok) return null
  const profiles = await profileResponse.json()
  const profile = profiles[0]
  if (!profile?.is_active || !['admin', 'super_admin'].includes(profile.role)) return null
  return { id: user.id }
}

function supabaseHeaders(authorization, extra = {}) {
  return { apikey: supabaseAnonKey, Authorization: authorization, ...extra }
}

function safeHttpUrl(value) {
  if (!value) return ''
  try {
    const parsed = new URL(value)
    return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : ''
  } catch {
    return ''
  }
}

function campaignEmailHtml(campaign) {
  const siteUrl = (process.env.SITE_URL || 'https://www.polishersdaelit.com.ng').replace(/\/$/, '')
  const logoUrl = `${siteUrl}/Polishers%20DA%20Elite%20Logo.png`
  const title = emailEscape(campaign.title)
  const preheader = emailEscape(campaign.preheader)
  const body = String(campaign.body || '').split(/\r?\n\s*\r?\n/).filter(Boolean).map((paragraph) => `<p style="margin:0 0 16px;color:#52636d;font-size:15px;line-height:1.75">${emailEscape(paragraph).replace(/\r?\n/g, '<br>')}</p>`).join('')
  const imageUrl = safeHttpUrl(campaign.image_url)
  const ctaUrl = safeHttpUrl(campaign.cta_url)
  const imageHtml = imageUrl ? `<tr><td style="padding:0 30px 26px"><img src="${emailEscape(imageUrl)}" alt="${title}" width="580" style="display:block;width:100%;max-width:580px;height:auto;border:0;border-radius:6px"></td></tr>` : ''
  const ctaHtml = ctaUrl && campaign.cta_label ? `<tr><td style="padding:8px 30px 30px"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="#0b295b" style="border-radius:4px"><a href="${emailEscape(ctaUrl)}" style="display:inline-block;padding:14px 22px;color:#fff;text-decoration:none;font-size:14px;font-weight:bold">${emailEscape(campaign.cta_label)}</a></td></tr></table></td></tr>` : ''
  const socialHtml = socialLinksHtml({ siteUrl, unsubscribeHref: '{{{RESEND_UNSUBSCRIBE_URL}}}' })

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f2f5f6;font-family:Arial,Helvetica,sans-serif;color:#17314a"><div style="display:none;max-height:0;overflow:hidden">${preheader}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f5f6;padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #e1e8e9;border-radius:8px;overflow:hidden"><tr><td style="height:7px;background:#a0c514;font-size:0;line-height:0">&nbsp;</td></tr><tr><td align="center" style="padding:22px 24px 18px"><a href="${emailEscape(siteUrl)}"><img src="${emailEscape(logoUrl)}" width="176" alt="Polishers Da Elite" style="display:block;width:176px;max-width:100%;height:auto;border:0"></a></td></tr><tr><td style="padding:28px 30px 18px;border-top:1px solid #edf1f2"><p style="margin:0 0 9px;color:#168d94;font-size:10px;font-weight:bold;letter-spacing:1.4px">A NOTE FROM POLISHERS DA ELITE</p><h1 style="margin:0 0 18px;color:#0b295b;font-size:27px;line-height:1.25">${title}</h1>${body}</td></tr>${imageHtml}${ctaHtml}<tr><td style="padding:24px 30px;background:#0b295b;color:#e2ebef"><p style="margin:0 0 6px;color:#fff;font-size:13px;font-weight:bold">Polishers Da Elite Cleaning Services</p><p style="margin:0 0 6px;font-size:12px;line-height:1.6">Lagos, Nigeria · Lagos &amp; nearby areas</p><p style="margin:0;font-size:12px;line-height:1.6"><a href="tel:+2348095389606" style="color:#e2ebef;text-decoration:none">+234 809 538 9606</a> · <a href="mailto:polishersdaelit@gmail.com" style="color:#e2ebef;text-decoration:none">polishersdaelit@gmail.com</a></p>${socialHtml}<p style="margin:18px 0 0;padding-top:13px;border-top:1px solid #3c526f;color:#b8c9d2;font-size:10px;line-height:1.6">You’re receiving this email because you subscribed to Polishers Da Elite updates. Use the Unsubscribe button above to opt out.</p></td></tr></table></td></tr></table></body></html>`
}

async function updateCampaign(authorization, id, fields) {
  return fetch(`${supabaseUrl}/rest/v1/newsletter_campaigns?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: supabaseHeaders(authorization, { 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify(fields),
  })
}

async function resendBroadcastRequest(path, method = 'GET', body) {
  return fetch(`https://api.resend.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

module.exports = async function handler(req, res) {
  res.setHeader('Allow', 'GET, POST')
  const admin = await verifyAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ error: 'Sign in with an active admin account to manage the newsletter.' })

  if (req.method === 'GET') {
    const url = new URL(req.url, 'http://localhost')
    const action = url.searchParams.get('action')
    if (action === 'sync-campaigns') {
      if (!resendApiKey) return res.status(200).json({ ok: true, synced: 0 })
      const campaignResponse = await fetch(`${supabaseUrl}/rest/v1/newsletter_campaigns?status=eq.scheduled&select=id,resend_broadcast_id`, {
        headers: supabaseHeaders(req.headers.authorization),
      })
      const scheduledCampaigns = await campaignResponse.json().catch(() => [])
      if (!campaignResponse.ok) return res.status(502).json({ error: 'Scheduled campaigns could not be refreshed.' })

      let synced = 0
      await Promise.all(scheduledCampaigns.map(async (campaign) => {
        if (!campaign.resend_broadcast_id) return
        const broadcastResponse = await resendBroadcastRequest(`/broadcasts/${encodeURIComponent(campaign.resend_broadcast_id)}`)
        const broadcast = await broadcastResponse.json().catch(() => ({}))
        if (!broadcastResponse.ok) return
        let fields = null
        if (broadcast.status === 'sent') {
          fields = { status: 'sent', sent_at: broadcast.sent_at || new Date().toISOString() }
        } else if (['canceled', 'cancelled'].includes(broadcast.status)) {
          fields = { status: 'draft', scheduled_at: null, resend_broadcast_id: null }
        }
        if (!fields) return
        const updateResponse = await updateCampaign(req.headers.authorization, campaign.id, { ...fields, updated_by: admin.id })
        if (updateResponse.ok) synced += 1
      }))
      return res.status(200).json({ ok: true, synced })
    }
    if (action !== 'subscribers') return res.status(400).json({ error: 'Unknown newsletter action.' })
    const subscribersResponse = await fetch(`${supabaseUrl}/rest/v1/newsletter_subscribers?select=email,created_at&order=created_at.desc&limit=1000`, {
      headers: supabaseHeaders(req.headers.authorization, { Prefer: 'count=exact' }),
    })
    const subscribers = await subscribersResponse.json().catch(() => [])
    if (!subscribersResponse.ok) {
      console.error('Newsletter subscriber list failed', { status: subscribersResponse.status })
      return res.status(502).json({ error: 'The subscriber list could not be loaded.' })
    }
    const contentRange = subscribersResponse.headers.get('content-range') || ''
    const total = Number(contentRange.split('/').pop())
    const count = Number.isFinite(total) ? total : subscribers.length
    return res.status(200).json({
      count,
      hasMore: count > subscribers.length,
      subscribers,
    })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })
  const action = req.body?.action
  if (!['send', 'schedule', 'cancel'].includes(action) || !req.body?.campaignId) {
    return res.status(400).json({ error: 'Choose a saved campaign action.' })
  }
  if (!resendApiKey) return res.status(503).json({ error: 'Newsletter sending is not configured yet.' })
  if (action !== 'cancel' && !resendSegmentId) return res.status(503).json({ error: 'Newsletter sending is not configured yet.' })

  let claimed = false
  let broadcastAccepted = false
  const campaignId = req.body.campaignId
  try {
    const campaignResponse = await fetch(`${supabaseUrl}/rest/v1/newsletter_campaigns?id=eq.${encodeURIComponent(campaignId)}&select=*`, {
      headers: supabaseHeaders(req.headers.authorization),
    })
    const campaigns = await campaignResponse.json().catch(() => [])
    if (!campaignResponse.ok || !campaigns[0]) return res.status(404).json({ error: 'Campaign not found.' })
    const campaign = campaigns[0]

    if (action === 'cancel') {
      if (campaign.status !== 'scheduled' || !campaign.resend_broadcast_id) {
        return res.status(409).json({ error: 'This campaign has no scheduled delivery to cancel.' })
      }
      const cancelResponse = await resendBroadcastRequest(`/broadcasts/${encodeURIComponent(campaign.resend_broadcast_id)}/cancel`, 'POST')
      const cancelResult = await cancelResponse.json().catch(() => ({}))
      if (!cancelResponse.ok) {
        console.error('Scheduled newsletter cancellation failed', { status: cancelResponse.status })
        return res.status(502).json({ error: cancelResult.message || 'The scheduled newsletter could not be cancelled.' })
      }
      const savedResponse = await updateCampaign(req.headers.authorization, campaignId, {
        status: 'draft',
        scheduled_at: null,
        resend_broadcast_id: null,
        updated_by: admin.id,
      })
      if (!savedResponse.ok) {
        return res.status(200).json({ ok: true, warning: 'The send was cancelled, but its draft status could not be saved. Reload the page.' })
      }
      return res.status(200).json({ ok: true, status: 'draft' })
    }

    if (campaign.status !== 'draft') return res.status(409).json({ error: 'This campaign has already been sent or is currently sending.' })
    if (!campaign.title?.trim() || !campaign.subject?.trim() || !campaign.body?.trim()) return res.status(400).json({ error: 'Add a title, subject, and message before sending.' })
    const subject = campaign.subject.replace(/\[test\]/ig, '').replace(/\s{2,}/g, ' ').trim()
    if (!subject) return res.status(400).json({ error: 'Add a subject other than the test marker before sending.' })

    let scheduledAt = null
    if (action === 'schedule') {
      const requestedTime = Date.parse(req.body.scheduledAt)
      if (!Number.isFinite(requestedTime) || requestedTime < Date.now() + 5 * 60 * 1000) {
        return res.status(400).json({ error: 'Choose a delivery time at least five minutes from now.' })
      }
      scheduledAt = new Date(requestedTime).toISOString()
    }

    const claimResponse = await fetch(`${supabaseUrl}/rest/v1/newsletter_campaigns?id=eq.${encodeURIComponent(campaignId)}&status=eq.draft`, {
      method: 'PATCH',
      headers: supabaseHeaders(req.headers.authorization, { 'Content-Type': 'application/json', Prefer: 'return=representation' }),
      body: JSON.stringify({ status: 'sending', updated_by: admin.id }),
    })
    const claimedRows = await claimResponse.json().catch(() => [])
    if (!claimResponse.ok || !claimedRows.length) return res.status(409).json({ error: 'Another admin is already sending this campaign.' })
    claimed = true

    const from = process.env.RESEND_FROM_EMAIL
    if (!from) throw new Error('Newsletter sender is not configured.')
    const broadcastResponse = await fetch('https://api.resend.com/broadcasts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        segment_id: resendSegmentId,
        from,
        subject,
        html: campaignEmailHtml(campaign),
        text: `${campaign.title}\n\n${campaign.body}${campaign.cta_url ? `\n\n${campaign.cta_label || 'Learn more'}: ${campaign.cta_url}` : ''}\n\nUnsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`,
        name: campaign.title,
        send: true,
        ...(scheduledAt ? { scheduled_at: scheduledAt } : {}),
      }),
    })
    const broadcast = await broadcastResponse.json().catch(() => ({}))
    if (!broadcastResponse.ok) {
      console.error('Resend broadcast failed', { status: broadcastResponse.status })
      throw new Error('Resend could not send this campaign. Check your sender domain and Segment configuration.')
    }
    broadcastAccepted = true

    const resultFields = action === 'schedule'
      ? { status: 'scheduled', scheduled_at: scheduledAt, sent_at: null }
      : { status: 'sent', scheduled_at: null, sent_at: new Date().toISOString() }
    const savedResponse = await updateCampaign(req.headers.authorization, campaignId, {
      ...resultFields,
      resend_broadcast_id: broadcast.id || null,
      updated_by: admin.id,
    })
    if (!savedResponse.ok) {
      console.error('Newsletter delivery status could not be saved', { campaignId })
      const deliveryVerb = action === 'schedule' ? 'scheduled' : 'sent'
      return res.status(200).json({ ok: true, status: action === 'schedule' ? 'scheduled' : 'sent', warning: `The broadcast was ${deliveryVerb} by Resend, but its status could not be saved.` })
    }
    return res.status(200).json({ ok: true, status: resultFields.status, broadcastId: broadcast.id, scheduledAt })
  } catch (issue) {
    if (claimed && !broadcastAccepted) await updateCampaign(req.headers.authorization, campaignId, { status: 'draft', updated_by: admin.id }).catch(() => {})
    const message = issue.message || 'The newsletter could not be sent.'
    return res.status(502).json({ error: message })
  }
}
