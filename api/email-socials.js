function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character])
}

function safeHttpUrl(value) {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

module.exports = function socialLinksHtml({ siteUrl, unsubscribeHref } = {}) {
  const canonicalUrl = (siteUrl || process.env.SITE_URL || 'https://www.polishersdaelit.com.ng').replace(/\/$/, '')
  const subscribeUrl = `${canonicalUrl}/?newsletter=1`
  const unsubscribeButton = unsubscribeHref
    ? `<td style="padding:0 0 0 8px"><a href="${escapeHtml(unsubscribeHref)}" style="display:inline-block;padding:11px 15px;border:1px solid #8799a6;border-radius:4px;color:#fff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold">Unsubscribe</a></td>`
    : ''
  const actions = `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:18px 0 20px"><tr><td bgcolor="#a0c514" style="border-radius:4px"><a href="${escapeHtml(subscribeUrl)}" style="display:inline-block;padding:12px 17px;border-radius:4px;color:#10294a;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold">Subscribe to updates</a></td>${unsubscribeButton}</tr></table>`
  const links = [
    ['Instagram', process.env.VITE_INSTAGRAM_URL, 'IG'],
    ['Facebook', process.env.VITE_FACEBOOK_URL, 'f'],
    ['LinkedIn', process.env.VITE_LINKEDIN_URL, 'in'],
  ].map(([label, url, icon]) => ({ label, url: safeHttpUrl(url), icon }))

  const items = links.map(({ label, url, icon }) => {
    const tag = url ? 'a' : 'span'
    const href = url ? ` href="${escapeHtml(url)}"` : ''
    return `<td style="padding:0 12px 0 0"><${tag}${href} aria-label="${label}" style="display:inline-block;color:#e5edf1;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:11px;white-space:nowrap"><span style="display:inline-block;width:28px;height:28px;margin-right:6px;border:1px solid #71879a;border-radius:50%;color:#fff;text-align:center;vertical-align:middle;font-size:11px;font-weight:bold;line-height:28px">${icon}</span><span style="vertical-align:middle">${label}</span></${tag}></td>`
  }).join('')
  return `${actions}<p style="margin:0 0 9px;color:#aabdc8;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:bold;letter-spacing:1px">FOLLOW ALONG</p><table role="presentation" cellspacing="0" cellpadding="0"><tr>${items}</tr></table>`
}