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
  const siteUrl = (process.env.SITE_URL || 'https://polishers.vercel.app').replace(/\/$/, '')
  const logoUrl = `${siteUrl}/Polishers%20DA%20Elite%20Logo.png`
  const title = emailEscape(campaign.title)
  const preheader = emailEscape(campaign.preheader)
  const body = emailEscape(campaign.body).replace(/\r?\n/g, '<br>')
  const imageUrl = safeHttpUrl(campaign.image_url)
  const ctaUrl = safeHttpUrl(campaign.cta_url)
  const imageHtml = imageUrl ? `<img src="${emailEscape(imageUrl)}" alt="${title}" width="544" style="display:block;width:100%;max-width:544px;height:auto;margin:22px 0;border-radius:6px;border:0">` : ''
  const ctaHtml = ctaUrl && campaign.cta_label ? `<p style="margin:26px 0 0"><a href="${emailEscape(ctaUrl)}" style="display:inline-block;padding:13px 20px;border-radius:4px;background:#0b295b;color:#fff;text-decoration:none;font-size:14px;font-weight:bold">${emailEscape(campaign.cta_label)}</a></p>` : ''
  const socialLinks = [
    ['Instagram', process.env.VITE_INSTAGRAM_URL, 'IG'],
    ['Facebook', process.env.VITE_FACEBOOK_URL, 'f'],
    ['LinkedIn', process.env.VITE_LINKEDIN_URL, 'in'],
  ].map(([label, url, icon]) => {
    const tag = url ? 'a' : 'span'
    const href = url ? ` href="${emailEscape(url)}"` : ''
    return `<${tag}${href} aria-label="${label}" style="display:inline-block;width:28px;height:28px;margin-right:8px;border:1px solid #71879a;border-radius:50%;color:#fff;text-align:center;text-decoration:none;font-family:Arial,sans-serif;font-size:11px;font-weight:bold;line-height:28px">${icon}</${tag}>`
  }).join('')

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3f6f7;font-family:Arial,Helvetica,sans-serif;color:#17314a"><div style="display:none;max-height:0;overflow:hidden">${preheader}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:30px 12px;background:#f3f6f7"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #e3eaed;border-radius:8px;overflow:hidden"><tr><td style="height:6px;background:#a0c514"></td></tr><tr><td style="padding:32px 28px"><p style="margin:0 0 10px;color:#168d94;font-size:11px;font-weight:bold;letter-spacing:1.5px">POLISHERS DA ELITE</p><h1 style="margin:0 0 16px;color:#0b295b;font-size:28px;line-height:1.25">${title}</h1>${body ? `<p style="margin:0;color:#52636d;font-size:15px;line-height:1.8">${body}</p>` : ''}${imageHtml}${ctaHtml}</td></tr><tr><td style="padding:24px 28px;background:#0b295b;color:#dce7ec"><a href="${siteUrl}" style="display:inline-block;margin-bottom:16px"><img src="${logoUrl}" width="150" alt="Polishers Da Elite" style="display:block;width:150px;max-width:100%;height:auto;border:0"></a><p style="margin:0 0 7px;color:#fff;font-size:13px;font-weight:bold">Polishers Da Elite Cleaning Services</p><p style="margin:0 0 5px;font-size:12px;line-height:1.6">Lagos, Nigeria · Lagos &amp; nearby areas</p><p style="margin:0 0 14px;font-size:12px"><a href="tel:+2348095389606" style="color:#dce7ec;text-decoration:none">+234 809 538 9606</a> · <a href="mailto:polishersdaelit@gmail.com" style="color:#dce7ec;text-decoration:none">polishersdaelit@gmail.com</a></p>${socialLinks}<p style="margin:16px 0 0;color:#b8c9d2;font-size:10px;line-height:1.6">You’re receiving this email because you subscribed to Polishers Da Elite updates. <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#fff;text-decoration:underline">Unsubscribe</a>.</p></td></tr></table></td></tr></table></body></html>`
}

async function updateCampaign(authorization, id, fields) {
  return fetch(`${supabaseUrl}/rest/v1/newsletter_campaigns?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: supabaseHeaders(authorization, { 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify(fields),
  })
}

module.exports = async function handler(req, res) {
  res.setHeader('Allow', 'GET, POST')
  const admin = await verifyAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ error: 'Sign in with an active admin account to manage the newsletter.' })
  if (!resendApiKey || !resendSegmentId) return res.status(503).json({ error: 'Newsletter sending is not configured yet.' })

  if (req.method === 'GET') {
    const url = new URL(req.url, 'http://localhost')
    if (url.searchParams.get('action') !== 'subscribers') return res.status(400).json({ error: 'Unknown newsletter action.' })
    const contactsResponse = await fetch(`https://api.resend.com/segments/${encodeURIComponent(resendSegmentId)}/contacts?limit=100`, {
      headers: { Authorization: `Bearer ${resendApiKey}` },
    })
    const contactsResult = await contactsResponse.json().catch(() => ({}))
    if (!contactsResponse.ok) {
      console.error('Resend subscriber list failed', { status: contactsResponse.status })
      return res.status(502).json({ error: 'The subscriber list could not be loaded.' })
    }
    const contacts = (contactsResult.data || []).filter((contact) => !contact.unsubscribed)
    return res.status(200).json({
      count: contacts.length,
      hasMore: Boolean(contactsResult.has_more),
      subscribers: contacts.slice(0, 20).map(({ email, created_at }) => ({ email, created_at })),
    })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })
  if (req.body?.action !== 'send' || !req.body?.campaignId) return res.status(400).json({ error: 'A saved campaign is required.' })

  let claimed = false
  const campaignId = req.body.campaignId
  try {
    const campaignResponse = await fetch(`${supabaseUrl}/rest/v1/newsletter_campaigns?id=eq.${encodeURIComponent(campaignId)}&select=*`, {
      headers: supabaseHeaders(req.headers.authorization),
    })
    const campaigns = await campaignResponse.json().catch(() => [])
    if (!campaignResponse.ok || !campaigns[0]) return res.status(404).json({ error: 'Campaign not found.' })
    const campaign = campaigns[0]
    if (campaign.status !== 'draft') return res.status(409).json({ error: 'This campaign has already been sent or is currently sending.' })
    if (!campaign.title?.trim() || !campaign.subject?.trim() || !campaign.body?.trim()) return res.status(400).json({ error: 'Add a title, subject, and message before sending.' })

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
        subject: campaign.subject,
        html: campaignEmailHtml(campaign),
        text: `${campaign.title}\n\n${campaign.body}${campaign.cta_url ? `\n\n${campaign.cta_label || 'Learn more'}: ${campaign.cta_url}` : ''}\n\nUnsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`,
        name: campaign.title,
        send: true,
      }),
    })
    const broadcast = await broadcastResponse.json().catch(() => ({}))
    if (!broadcastResponse.ok) {
      console.error('Resend broadcast failed', { status: broadcastResponse.status })
      throw new Error('Resend could not send this campaign. Check your sender domain and Segment configuration.')
    }

    const savedResponse = await updateCampaign(req.headers.authorization, campaignId, {
      status: 'sent',
      resend_broadcast_id: broadcast.id || null,
      sent_at: new Date().toISOString(),
      updated_by: admin.id,
    })
    if (!savedResponse.ok) {
      console.error('Sent newsletter status could not be saved', { campaignId })
      return res.status(200).json({ ok: true, warning: 'The broadcast was accepted by Resend, but its sent status could not be saved.' })
    }
    return res.status(200).json({ ok: true, broadcastId: broadcast.id })
  } catch (issue) {
    if (claimed) await updateCampaign(req.headers.authorization, campaignId, { status: 'draft', updated_by: admin.id }).catch(() => {})
    const message = issue.message || 'The newsletter could not be sent.'
    return res.status(502).json({ error: message })
  }
}
