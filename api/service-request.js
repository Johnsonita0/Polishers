const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const resendApiKey = process.env.RESEND_API_KEY
const resendFromEmail = process.env.RESEND_FROM_EMAIL
const adminEmail = process.env.QUOTE_ADMIN_EMAIL || process.env.NEWSLETTER_ADMIN_EMAIL || 'polishersdaelit@gmail.com'
const socialLinksHtml = require('./email-socials')

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character])
}

function requestEmailHtml(request, reference) {
  const fields = [
    ['Reference', reference],
    ['Name', request.full_name],
    ['Phone', request.phone],
    ['Email', request.email],
    ['Service', request.service_type],
    ['Property', request.property_type],
    ['Size', request.size_note],
    ['Area', request.address],
    ['Preferred date', request.preferred_date],
    ['Preferred time', request.preferred_time],
    ['Message', request.message],
  ].filter(([, value]) => value)

  const rows = fields.map(([label, value]) => `<tr><th align="left" style="padding:9px 12px;color:#52636d;font-size:13px;border-bottom:1px solid #e3eaed">${escapeHtml(label)}</th><td style="padding:9px 12px;color:#17314a;font-size:13px;border-bottom:1px solid #e3eaed">${escapeHtml(value).replace(/\r?\n/g, '<br>')}</td></tr>`).join('')
  const siteUrl = (process.env.SITE_URL || 'https://www.polishersdaelit.com.ng').replace(/\/$/, '')
  const logoUrl = `${siteUrl}/Polishers%20DA%20Elite%20Logo.png`

  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f2f5f6;font-family:Arial,Helvetica,sans-serif;color:#17314a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:auto;background:#fff;border:1px solid #e1e8e9;border-radius:8px;overflow:hidden"><tr><td style="height:7px;background:#a0c514"></td></tr><tr><td style="padding:24px"><a href="${siteUrl}"><img src="${logoUrl}" width="150" alt="Polishers Da Elite" style="display:block;height:auto;border:0"></a><p style="margin:24px 0 6px;color:#168d94;font-size:10px;font-weight:bold;letter-spacing:1.2px">NEW SERVICE REQUEST</p><h1 style="margin:0 0 18px;color:#0b295b;font-size:24px">${escapeHtml(request.full_name)} submitted a request</h1><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table><p style="margin:20px 0 0;color:#52636d;font-size:12px">This request is also available in the admin dashboard.</p></td></tr><tr><td style="padding:20px 24px;background:#0b295b;color:#dce7ec"><p style="margin:0 0 6px;color:#fff;font-size:13px;font-weight:bold">Polishers Da Elite Cleaning Services</p><p style="margin:0;font-size:12px"><a href="mailto:polishersdaelit@gmail.com" style="color:#dce7ec;text-decoration:none">polishersdaelit@gmail.com</a> · <a href="tel:+2348095389606" style="color:#dce7ec;text-decoration:none">+234 809 538 9606</a></p>${socialLinksHtml()}</td></tr></table></body></html>`
}

async function sendAdminEmail(request, reference) {
  if (!resendApiKey || !resendFromEmail) return false

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: resendFromEmail,
      to: [adminEmail],
      ...(request.email ? { reply_to: request.email } : {}),
      subject: `New quote request ${reference}: ${request.full_name}`,
      html: requestEmailHtml(request, reference),
      text: [
        `New service request ${reference}`,
        `Name: ${request.full_name}`,
        `Phone: ${request.phone}`,
        `Email: ${request.email || 'Not provided'}`,
        `Service: ${request.service_type}`,
        `Property: ${request.property_type || 'Not provided'}`,
        `Size: ${request.size_note || 'Not provided'}`,
        `Area: ${request.address || 'Not provided'}`,
        `Preferred date: ${request.preferred_date || 'Not provided'}`,
        `Preferred time: ${request.preferred_time || 'Not provided'}`,
        `Message: ${request.message || 'Not provided'}`,
      ].join('\n'),
    }),
  })

  if (!response.ok) console.error('Quote request admin email failed', { status: response.status })
  return response.ok
}

module.exports = async function handler(req, res) {
  res.setHeader('Allow', 'POST')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })
  if (!supabaseUrl || !supabaseAnonKey) return res.status(503).json({ error: 'Request submission is not configured.' })

  const request = req.body
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    return res.status(400).json({ error: 'A valid request is required.' })
  }

  try {
    const saveResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/submit_request`, {
      method: 'POST',
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_data: request }),
    })
    const saved = await saveResponse.json().catch(() => null)
    if (!saveResponse.ok) {
      console.error('Service request could not be saved', { status: saveResponse.status })
      return res.status(502).json({ error: 'The request could not be saved. Please try again.' })
    }

    const row = Array.isArray(saved) ? saved[0] : saved
    const reference = typeof row === 'string' ? row : row?.reference
    if (!reference) return res.status(502).json({ error: 'The request was saved but its reference could not be read.' })

    const notificationSent = await sendAdminEmail(request, reference).catch(() => false)
    return res.status(200).json({ ok: true, reference, notificationSent })
  } catch {
    console.error('Service request submission failed')
    return res.status(502).json({ error: 'The request could not be submitted. Please try again.' })
  }
}