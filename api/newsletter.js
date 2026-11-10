const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
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

function emailTemplate({ title, intro, detail, siteUrl, logoUrl, socialHtml }) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3f6f7;font-family:Arial,Helvetica,sans-serif;color:#17314a"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(intro)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6f7;padding:32px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e3eaed;border-radius:8px;overflow:hidden"><tr><td style="background:#0b295b;padding:24px 28px;text-align:left"><a href="${siteUrl}" style="display:inline-block"><img src="${logoUrl}" width="176" alt="Polishers Da Elite" style="display:block;max-width:100%;height:auto;border:0"></a><div style="height:3px;width:50px;margin-top:18px;background:#a0c514"></div></td></tr><tr><td style="padding:32px 28px"><p style="margin:0 0 10px;color:#168d94;font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase">POLISHERS DA ELITE</p><h1 style="margin:0 0 16px;color:#0b295b;font-size:25px;line-height:1.3">${escapeHtml(title)}</h1><p style="margin:0 0 16px;color:#52636d;font-size:15px;line-height:1.7">${escapeHtml(intro)}</p><p style="margin:0;color:#52636d;font-size:14px;line-height:1.7">${detail}</p><p style="margin:24px 0 0"><a href="${siteUrl}" style="display:inline-block;padding:12px 18px;border-radius:4px;background:#0b295b;color:#ffffff;text-decoration:none;font-size:13px;font-weight:bold">Visit our website</a></p></td></tr><tr><td style="padding:22px 28px;background:#0b295b;color:#dce7ec"><p style="margin:0 0 8px;color:#ffffff;font-size:13px;font-weight:bold">Polishers Da Elite Cleaning Services</p><p style="margin:0 0 6px;font-size:12px;line-height:1.6">Lagos, Nigeria · Lagos &amp; nearby areas</p><p style="margin:0 0 14px;font-size:12px;line-height:1.6"><a href="tel:+2348095389606" style="color:#dce7ec;text-decoration:none">+234 809 538 9606</a> · <a href="mailto:polishersdaelit@gmail.com" style="color:#dce7ec;text-decoration:none">polishersdaelit@gmail.com</a></p><div style="font-size:12px">${socialHtml}</div><p style="margin:16px 0 0;color:#aabdc8;font-size:10px">You are receiving this message because you subscribed to updates from Polishers Da Elite.</p></td></tr></table></td></tr></table></body></html>`
}

async function resendRequest(path, apiKey, body) {
  const response = await fetch(`https://api.resend.com${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const result = await response.json().catch(() => ({}))
  return { response, result }
}

function signupResponse(res, isNewSubscriber, deliveryUnavailable = false) {
  const message = deliveryUnavailable
    ? 'Your email has been saved, but email delivery is temporarily unavailable.'
    : isNewSubscriber
      ? 'Thanks for subscribing. Your email has been added to our newsletter list.'
      : 'This email is already subscribed.'
  return res.status(isNewSubscriber ? 201 : 200).json({ ok: true, alreadySubscribed: !isNewSubscriber, message })
}

module.exports = async function handler(req, res) {
  res.setHeader('Allow', 'POST')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })

  const email = String(req.body?.email || '').trim().toLowerCase()
  if (req.body?.website) return res.status(200).json({ ok: true })
  if (email.length > 254 || !emailPattern.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' })

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(503).json({ error: 'Newsletter signups are temporarily unavailable. Please try again later.' })
  }

  let isNewSubscriber
  try {
    const saveResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/subscribe_to_newsletter`, {
      method: 'POST',
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriber_email: email }),
    })
    isNewSubscriber = await saveResponse.json().catch(() => false)
    if (!saveResponse.ok) {
      console.error('Newsletter subscription could not be saved', { status: saveResponse.status })
      return res.status(502).json({ error: 'We could not save your subscription. Please try again.' })
    }
  } catch {
    console.error('Newsletter subscription could not be saved')
    return res.status(502).json({ error: 'We could not save your subscription. Please try again.' })
  }

  const apiKey = process.env.RESEND_API_KEY
  const segmentId = process.env.RESEND_SEGMENT_ID || process.env.RESEND_AUDIENCE_ID
  const from = process.env.RESEND_FROM_EMAIL
  const adminEmail = process.env.NEWSLETTER_ADMIN_EMAIL
  if (!apiKey || !segmentId) {
    return signupResponse(res, isNewSubscriber, true)
  }

  const siteUrl = (process.env.SITE_URL || 'https://www.polishersdaelit.com.ng').replace(/\/$/, '')
  const logoUrl = `${siteUrl}/Polishers%20DA%20Elite%20Logo.png`
  const socialHtml = socialLinksHtml({ siteUrl })
  const subscriberSocialHtml = socialLinksHtml({
    siteUrl,
    unsubscribeHref: 'mailto:polishersdaelit@gmail.com?subject=Unsubscribe%20from%20Polishers%20Da%20Elite',
  })

  try {
    const { response: contactResponse } = await resendRequest(
      '/contacts',
      apiKey,
      { email, unsubscribed: false, segments: [{ id: segmentId }] },
    )

    if (contactResponse.status === 409) {
      const { response: segmentResponse } = await resendRequest(
        `/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(segmentId)}`,
        apiKey,
        {},
      )
      if (!segmentResponse.ok && segmentResponse.status !== 409) {
        console.error('Existing Resend contact could not be added to newsletter segment', { status: segmentResponse.status })
        return signupResponse(res, isNewSubscriber, true)
      }
      return signupResponse(res, isNewSubscriber)
    }
    if (!contactResponse.ok) {
      console.error('Newsletter audience request failed', { status: contactResponse.status })
      return signupResponse(res, isNewSubscriber, true)
    }

    const safeEmail = escapeHtml(email)
    const subscriberHtml = emailTemplate({
      title: 'Welcome to a little more shine.',
      intro: 'Thanks for joining the Polishers Da Elite newsletter. We’ll share occasional cleaning tips, service news, and updates from our team.',
      detail: 'Whenever you need a hand with your space, simply reply to this email or reach us on WhatsApp. We’re happy to help.',
      siteUrl,
      logoUrl,
      socialHtml: subscriberSocialHtml,
    })
    const adminHtml = emailTemplate({
      title: 'A new newsletter subscriber',
      intro: 'A visitor has joined the Polishers Da Elite newsletter.',
      detail: `<strong style="color:#0b295b">Subscriber email:</strong> ${safeEmail}`,
      siteUrl,
      logoUrl,
      socialHtml,
    })

    const emails = []
    if (from) {
      emails.push(resendRequest('/emails', apiKey, { from, to: [email], subject: 'Welcome to Polishers Da Elite', html: subscriberHtml }))
      if (adminEmail) emails.push(resendRequest('/emails', apiKey, { from, to: [adminEmail], subject: 'New Polishers newsletter subscriber', html: adminHtml, reply_to: email }))
    }
    const emailResults = await Promise.all(emails)
    const failedEmail = emailResults.find(({ response }) => !response.ok)
    if (failedEmail) {
      console.error('Newsletter email delivery failed', { status: failedEmail.response.status })
      return signupResponse(res, isNewSubscriber, true)
    }

    return signupResponse(res, isNewSubscriber)
  } catch {
    console.error('Newsletter service request failed')
    return signupResponse(res, isNewSubscriber, true)
  }
}
