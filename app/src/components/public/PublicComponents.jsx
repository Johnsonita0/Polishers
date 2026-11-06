import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight, Building2, ChevronLeft, ChevronRight, Facebook, Factory, HardHat,
  Home, Image, Instagram, Linkedin, MessageCircle, Phone, Plus, Sparkles, X,
} from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { services } from '../../data'
import { businessWhatsAppPhone, whatsappHref } from '../../utils/whatsapp'

const serviceIcons = { Home, Building2, Factory, HardHat }
const navItems = [['Services', '/services#services'], ['Our work', '/gallery#gallery'], ['About us', '/about#about'], ['Contact', '/contact#contact-section']]
const generalWhatsAppMessage = 'Hi Polishers Da Elite, I would like to know more about your cleaning services. Could you help me get started?'
const socialLinks = [
  { label: 'Instagram', href: import.meta.env.VITE_INSTAGRAM_URL, Icon: Instagram },
  { label: 'Facebook', href: import.meta.env.VITE_FACEBOOK_URL, Icon: Facebook },
  { label: 'LinkedIn', href: import.meta.env.VITE_LINKEDIN_URL, Icon: Linkedin },
]

export function Brand({ light = false }) {
  return (
    <Link className={`brand ${light ? 'brand-light' : ''}`} to="/" aria-label="Polishers Da Elite home">
      <img src={`${import.meta.env.BASE_URL}Polishers%20DA%20Elite%20Logo.png`} alt="Polishers Da Elite — Sparkling Space, Happy Client" />
    </Link>
  )
}

export function PublicHeader() {
  return (
    <>
      <div className="topline"><span>Thoughtful cleaning. Exceptional results.</span><a href="tel:+2348095389606"><Phone size={13} /> +234 809 538 9606</a></div>
      <header className="site-header">
        <div className="container header-inner">
          <Brand />
          <nav className="main-nav" aria-label="Main navigation">
            {navItems.map(([label, path]) => <NavLink key={path} to={path}>{label}</NavLink>)}
            <Link className="nav-mobile-quote" to="/quote">Request a quote <ArrowUpRight size={15} /></Link>
          </nav>
          <div className="header-actions">
            <a className="header-phone" href="tel:+2348095389606" aria-label="Call Polishers Da Elite"><Phone size={17} /><span>+234 809 538 9606</span></a>
            <a className="header-whatsapp" href={whatsappHref(businessWhatsAppPhone, generalWhatsAppMessage)} target="_blank" rel="noreferrer" aria-label="Chat with us on WhatsApp"><MessageCircle size={17} /><span>WhatsApp</span></a>
            <Link className="button button-dark button-small" to="/quote">Request a quote <ArrowUpRight size={15} /></Link>
          </div>
        </div>
      </header>
    </>
  )
}

export function PublicTabs() {
  const links = [
    { label: 'Home', to: '/', Icon: Home },
    { label: 'Services', to: '/services#services', Icon: Sparkles },
    { label: 'Quote', to: '/quote', Icon: Plus },
    { label: 'Gallery', to: '/gallery#gallery', Icon: Image },
    { label: 'Contact', to: '/contact#contact-section', Icon: Phone },
  ]
  return <nav className="public-tabs" aria-label="Mobile navigation">{links.map(({ label, to, Icon }) =>
    <Link className={label === 'Quote' ? 'tab-quote' : ''} key={label} to={to}><span><Icon size={label === 'Quote' ? 22 : 19} /></span><small>{label}</small></Link>)}</nav>
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div className="footer-brand"><Brand light /><p>Sparkling space, happy client.</p></div>
        <div><h4>Contact</h4><a href="tel:+2348095389606">+234 809 538 9606</a><a href={whatsappHref(businessWhatsAppPhone, 'Hi Polishers Da Elite, I would like to request a cleaning quote. Please let me know what details you need.')} target="_blank" rel="noreferrer">WhatsApp us</a><a href="mailto:polishersdaelit@gmail.com">polishersdaelit@gmail.com</a></div>
        <div><h4>Visit</h4><span>Lagos, Nigeria</span><span>Lagos & nearby areas</span><span>Monday – Saturday, 8am – 6pm</span><nav className="footer-socials" aria-label="Social media">{socialLinks.map(({ label, href, Icon }) => href ? <a href={href} key={label} target="_blank" rel="noreferrer" aria-label={`Follow Polishers Da Elite on ${label}`}><Icon size={17} /></a> : <span className="footer-social-unconfigured" key={label} aria-label={`${label} profile link not configured`} title={`Set VITE_${label.toUpperCase()}_URL to enable this link`}><Icon size={17} /></span>)}</nav></div>
        <div><h4>Policies</h4><Link to="/privacy">Privacy policy</Link><Link to="/terms">Website &amp; system policy</Link></div>
      </div>
      <div className="container footer-bottom"><span>© {new Date().getFullYear()} Polishers Da Elite Cleaning Services</span><button type="button" className="footer-newsletter-trigger" onClick={() => window.dispatchEvent(new Event('open-newsletter'))}>Join our newsletter</button></div>
    </footer>
  )
}

export function PublicLayout({ children }) {
  return <><PublicHeader /><main>{children}</main><Footer /><PublicTabs /><a className="whatsapp-float" href={whatsappHref(businessWhatsAppPhone, generalWhatsAppMessage)} target="_blank" rel="noreferrer" aria-label="Chat with us on WhatsApp"><MessageCircle size={22} /></a><NewsletterSignup /></>
}

function NewsletterSignup() {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const emailInputRef = useRef(null)

  useEffect(() => {
    let timerId
    try {
      if (!window.sessionStorage.getItem('polishers-newsletter-dismissed')) {
        timerId = window.setTimeout(() => setIsOpen(true), 5000)
      }
    } catch {
      timerId = window.setTimeout(() => setIsOpen(true), 5000)
    }
    const openFromFooter = () => setIsOpen(true)
    window.addEventListener('open-newsletter', openFromFooter)
    return () => {
      window.clearTimeout(timerId)
      window.removeEventListener('open-newsletter', openFromFooter)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return undefined
    emailInputRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function closeOnEscape(event) {
      if (event.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  function rememberDismissal() {
    try {
      window.sessionStorage.setItem('polishers-newsletter-dismissed', '1')
    } catch {
      // The modal remains dismissible for this page session without storage.
    }
  }

  function closeModal() {
    setIsOpen(false)
    rememberDismissal()
  }

  async function submit(event) {
    event.preventDefault()
    setSubmitting(true)
    setFeedback(null)
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'We could not save your signup. Please try again.')
      setFeedback({ type: 'success', message: result.message || 'Thanks for subscribing. Please check your inbox.' })
      setEmail('')
      rememberDismissal()
    } catch (issue) {
      setFeedback({ type: 'error', message: issue.message || 'We could not save your signup. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null
  return <div className="newsletter-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal() }}><section className="newsletter-modal" role="dialog" aria-modal="true" aria-labelledby="newsletter-title"><button className="newsletter-close" type="button" aria-label="Close newsletter signup" onClick={closeModal}><X size={18} /></button><img className="newsletter-logo" src={`${import.meta.env.BASE_URL}Polishers%20DA%20Elite%20Logo.png`} alt="Polishers Da Elite" /><span className="eyebrow">A LITTLE MORE SHINE</span><h2 id="newsletter-title">Fresh ideas for a happier space.</h2><p className="newsletter-intro">Get occasional cleaning tips, service news, and thoughtful updates from our team.</p>{feedback?.type === 'success' ? <div className="newsletter-success" role="status"><b>You're on the list.</b><p>{feedback.message}</p><button className="button button-dark" type="button" onClick={closeModal}>Done</button></div> : <form className="newsletter-form" onSubmit={submit}><label htmlFor="newsletter-email">Email address</label><input ref={emailInputRef} id="newsletter-email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /><label className="newsletter-honeypot" aria-hidden="true">Leave this field empty<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>{feedback?.type === 'error' && <p className="newsletter-error" role="alert">{feedback.message}</p>}<button className="button button-dark button-large" type="submit" disabled={submitting}>{submitting ? 'Joining…' : 'Join the newsletter'}<ArrowUpRight size={16} /></button><small>By subscribing, you agree to receive occasional email updates. Read our <Link to="/privacy">Privacy policy</Link> and <Link to="/terms">Terms of use</Link>. Unsubscribe any time.</small></form>}</section></div>
}

export function SectionHeading({ eyebrow, title, copy, light = false, centered = false }) {
  return <div className={`section-heading ${light ? 'heading-light' : ''} ${centered ? 'heading-centered' : ''}`}>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{copy && <p>{copy}</p>}</div>
}

export function ServiceCard({ service, iconOnly = false }) {
  const Icon = serviceIcons[service.icon] || Sparkles
  return <Link className={`service-card ${iconOnly ? 'service-card-icon-only' : ''}`} to={`/services/${service.slug}`}>
    {iconOnly
      ? <span className="service-icon"><Icon size={24} /></span>
      : <div className="service-photo"><img src={service.image} alt="" loading="lazy" /><span className="service-icon"><Icon size={21} /></span></div>}
    <div className="service-card-body"><h3>{service.title}</h3><p>{service.short}</p><span className="text-link">Learn more <ArrowUpRight size={15} /></span></div>
  </Link>
}

export function BeforeAfter() {
  const [position, setPosition] = useState(52)
  return (
    <div className="comparison-card">
      <img className="comparison-after" src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1800&q=90" alt="Beautifully cleaned living room after service" />
      <div className="comparison-before" style={{ width: `${position}%` }}><img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=90" alt="Living room before cleaning" /></div>
      <span className="comparison-label label-before">BEFORE</span><span className="comparison-label label-after">AFTER</span>
      <div className="comparison-handle" style={{ left: `${position}%` }}><span><ChevronLeft size={14} /><ChevronRight size={14} /></span></div>
      <input className="comparison-input" aria-label="Compare before and after" type="range" min="8" max="92" value={position} onChange={(event) => setPosition(Number(event.target.value))} />
      <div className="comparison-caption"><span><Sparkles size={14} /> A little before & after magic</span><Link to="/gallery#gallery">See more spaces <ArrowUpRight size={14} /></Link></div>
    </div>
  )
}

export function PageHero({ eyebrow, title, copy, image }) {
  return <section className="page-hero"><div className="container page-hero-grid"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p><Link className="button button-aqua" to="/quote">Request a quote <ArrowUpRight size={15} /></Link></div><img src={image} alt="" /></div></section>
}
