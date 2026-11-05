import { useState } from 'react'
import {
  ArrowUpRight, Building2, ChevronLeft, ChevronRight, Factory, HardHat,
  Home, Image, MessageCircle, Phone, Plus, Sparkles,
} from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { services } from '../../data'

const serviceIcons = { Home, Building2, Factory, HardHat }
const navItems = [['Services', '/services#services'], ['Our work', '/gallery#gallery'], ['About us', '/about#about'], ['Contact', '/contact#contact-section']]

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
            <a className="header-whatsapp" href="https://wa.me/2348095389606" target="_blank" rel="noreferrer" aria-label="Chat with us on WhatsApp"><MessageCircle size={17} /><span>WhatsApp</span></a>
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
        <div><h4>Contact</h4><a href="tel:+2348095389606">+234 809 538 9606</a><a href="https://wa.me/2348095389606">WhatsApp us</a><a href="mailto:polishersdaelit@gmail.com">polishersdaelit@gmail.com</a></div>
        <div><h4>Visit</h4><span>Lagos, Nigeria</span><span>Lagos & nearby areas</span><span>Monday – Saturday, 8am – 6pm</span></div>
      </div>
      <div className="container footer-bottom"><span>© {new Date().getFullYear()} Polishers Da Elite Cleaning Services</span></div>
    </footer>
  )
}

export function PublicLayout({ children }) {
  return <><PublicHeader /><main>{children}</main><Footer /><PublicTabs /><a className="whatsapp-float" href="https://wa.me/2348095389606" target="_blank" rel="noreferrer" aria-label="Chat with us on WhatsApp"><MessageCircle size={22} /></a></>
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
