export const businessWhatsAppPhone = '2348095389606'

export function whatsappHref(phone, message) {
  let digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = `234${digits.slice(1)}`

  const text = String(message || '').trim()
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
