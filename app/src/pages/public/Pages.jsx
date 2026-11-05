import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Building2, Check, CheckCircle2,
  ChevronDown, ChevronRight, Factory, HardHat, Home, Image, Mail, MapPin,
  MessageCircle, Pause, Phone, Play, ShieldCheck, Sparkles, Star, X,
} from 'lucide-react'
import {
  Link, useLocation, useNavigate, useParams, useSearchParams,
} from 'react-router-dom'
import { faqs, gallery, services, steps, testimonials } from '../../data'
import { supabase, supabaseConfigured } from '../../supabase'
import {
  PageHero, PublicLayout, SectionHeading, ServiceCard,
} from '../../components/public/PublicComponents'

const serviceIcons = { Home, Building2, Factory, HardHat }
const serviceBySlug = Object.fromEntries(services.map((service) => [service.slug, service]))
const heroAssetBase = `${import.meta.env.BASE_URL}hero%20fallback%20photo/`
const heroVideoSource = `${heroAssetBase}vid1.mp4`
const heroSlides = [
  { type: 'image', src: `${heroAssetBase}pic3.jpeg`, title: 'Polishers Da Elite logo', position: 'center', fit: 'contain', background: '#fff' },
  { type: 'video', src: heroVideoSource, title: 'Featured cleaning video' },
  { type: 'image', src: `${heroAssetBase}pic1.jpeg`, title: 'Polishers team cleaning a window', position: 'center 38%', fit: 'cover' },
  { type: 'video', src: heroVideoSource, title: 'Featured cleaning video' },
  { type: 'image', src: `${heroAssetBase}pic2.jpeg`, title: 'Polishers team cleaning a window', position: 'center 42%', fit: 'cover' },
]

export function HomePage() {
  const [heroSlide, setHeroSlide] = useState(0)
  const heroVideoRef = useRef(null)
  const [openFaq, setOpenFaq] = useState(0)
  const [savedTestimonials, setSavedTestimonials] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('polishers-testimonials') || '[]')
      return Array.isArray(saved) ? saved : []
    } catch {
      return []
    }
  })
  const [testimonialIndex, setTestimonialIndex] = useState(0)
  const [testimonialForm, setTestimonialForm] = useState({ name: '', role: '', quote: '', rating: 5 })
  const [testimonialSent, setTestimonialSent] = useState(false)
  const [galleryPaused, setGalleryPaused] = useState(false)
  const galleryViewportRef = useRef(null)
  const galleryDragRef = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || heroSlides[heroSlide].type === 'video') return
    const timer = window.setTimeout(() => {
      setHeroSlide((current) => (current + 1) % heroSlides.length)
    }, 3500)
    return () => window.clearTimeout(timer)
  }, [heroSlide])

  useEffect(() => {
    const video = heroVideoRef.current
    if (!video) return
    if (heroSlides[heroSlide].type === 'video') {
      video.currentTime = 0
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [heroSlide])

  useEffect(() => {
    const viewport = galleryViewportRef.current
    if (!viewport || galleryPaused) return
    const firstGroup = viewport.querySelector('.home-gallery-group')
    if (!firstGroup) return

    const cycleWidth = firstGroup.getBoundingClientRect().width + 16
    viewport.scrollLeft = cycleWidth

    let frameId
    let previousTime
    const moveGallery = (time) => {
      if (previousTime !== undefined) {
        const delta = (time - previousTime) * 0.045
        viewport.scrollLeft -= delta

        if (viewport.scrollLeft <= 0) {
          viewport.scrollLeft += cycleWidth
        }
        if (viewport.scrollLeft >= cycleWidth * 2) {
          viewport.scrollLeft -= cycleWidth
        }
      }
      previousTime = time
      frameId = window.requestAnimationFrame(moveGallery)
    }
    frameId = window.requestAnimationFrame(moveGallery)
    return () => window.cancelAnimationFrame(frameId)
  }, [galleryPaused])

  const activeHeroSlide = heroSlides[heroSlide]
  const homeTestimonials = [...savedTestimonials, ...testimonials]
  const activeTestimonial = homeTestimonials[testimonialIndex] || testimonials[0]

  function updateTestimonial(key, value) {
    setTestimonialForm((current) => ({ ...current, [key]: value }))
    setTestimonialSent(false)
  }

  function submitTestimonial(event) {
    event.preventDefault()
    const submission = {
      name: testimonialForm.name.trim(),
      role: testimonialForm.role.trim(),
      quote: testimonialForm.quote.trim(),
      rating: testimonialForm.rating,
    }
    const nextTestimonials = [submission, ...savedTestimonials]
    setSavedTestimonials(nextTestimonials)
    try {
      window.localStorage.setItem('polishers-testimonials', JSON.stringify(nextTestimonials))
    } catch {
      // Keep the new testimonial available for this page session if storage is unavailable.
    }
    setTestimonialIndex(0)
    setTestimonialForm({ name: '', role: '', quote: '', rating: 5 })
    setTestimonialSent(true)
  }

  function startGalleryDrag(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    galleryDragRef.current = {
      pointerType: event.pointerType,
      startX: event.clientX,
      startScrollLeft: galleryViewportRef.current.scrollLeft,
      moved: false,
    }
    setGalleryPaused(true)
    if (event.currentTarget.setPointerCapture) event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveGalleryDrag(event) {
    const drag = galleryDragRef.current
    if (!drag) return
    const distance = event.clientX - drag.startX
    if (Math.abs(distance) > 4) {
      drag.moved = true
      event.preventDefault()
      galleryViewportRef.current.scrollLeft = drag.startScrollLeft - distance
    }
  }

  function endGalleryDrag() {
    galleryDragRef.current = null
    setGalleryPaused(false)
  }

  function handleGalleryItemClick(event) {
    if (galleryDragRef.current?.moved) event.preventDefault()
  }

  return (
    <PublicLayout>
      <section className="hero">
        <div className="container hero-layout">
          <div className="hero-copy">
            <span className="hero-services">Residential · Commercial · Industrial · Post-construction</span>
            <h1>Sparkling Space,<br /><em>Happy Client.</em></h1>
            <p>Professional cleaning delivered with precision, reliability and class, for homes, offices, factories and estates of every size.</p>
            <div className="hero-buttons">
              <Link to="/quote" className="button button-aqua button-large">Get a Free Quote</Link>
              <a className="button button-glass button-large" href="https://wa.me/2348095389606" target="_blank" rel="noreferrer">WhatsApp Us</a>
            </div>
            <div className="hero-stats">
              <div><b>JOBS DONE</b><span>Jobs completed</span></div>
              <div><b>CLIENTS</b><span>Happy clients</span></div>
              <div><b>YEARS</b><span>Years of service</span></div>
            </div>
          </div>
          <div className={`hero-visual ${activeHeroSlide.type === 'video' ? 'hero-visual-video' : activeHeroSlide.title === 'Polishers Da Elite logo' ? 'hero-visual-logo' : ''}`} style={activeHeroSlide.title === 'Polishers Da Elite logo' ? { '--hero-mobile-image': `url(${heroSlides[2].src})` } : undefined} role="group" aria-roledescription="carousel" aria-label="Featured cleaning spaces">
            {heroSlides.map((slide, index) => slide.type === 'image' && <img className={`hero-slide ${index === heroSlide ? 'hero-slide-active' : ''}`} key={slide.src} src={slide.src} alt={index === heroSlide ? slide.title : ''} aria-hidden={index !== heroSlide} style={{ objectPosition: slide.position, objectFit: slide.fit, backgroundColor: slide.background }} />)}
            <video className={`hero-slide ${activeHeroSlide.type === 'video' ? 'hero-slide-active' : ''}`} ref={heroVideoRef} src={heroVideoSource} muted playsInline preload="metadata" onEnded={() => setHeroSlide((current) => (current + 1) % heroSlides.length)} aria-label="Featured cleaning video" aria-hidden={activeHeroSlide.type !== 'video'} tabIndex={-1} />
            <div className="hero-note"><b>Free site inspection</b><span>Response within 24 hours</span></div>
          </div>
        </div>
      </section>

      <section className="section services-section">
        <div className="container">
          <div className="home-services-heading"><SectionHeading eyebrow="WHAT WE DO" title="Our Services" /><Link to="/services">See all <ArrowRight size={15} /></Link></div>
          <div className="service-grid">{services.map((service) => <ServiceCard key={service.slug} service={service} iconOnly />)}</div>
        </div>
      </section>

      <section className="home-gallery-section section">
        <div className="container">
          <div className="home-section-heading">
            <SectionHeading eyebrow="A PICTURE OF CARE" title="Spaces, polished." copy="A few recent spaces we have cared for." />
            <div className="home-gallery-actions">
              <button className="home-gallery-motion-control" type="button" title={galleryPaused ? 'Play gallery' : 'Pause gallery'} aria-label={galleryPaused ? 'Play gallery' : 'Pause gallery'} aria-pressed={galleryPaused} onClick={() => setGalleryPaused((paused) => !paused)}>{galleryPaused ? <Play size={16} /> : <Pause size={16} />}</button>
              <Link to="/gallery" className="text-link">View all work <ArrowUpRight size={15} /></Link>
            </div>
          </div>
          <div className="home-gallery-viewport" ref={galleryViewportRef} role="region" aria-label="Recent cleaning work" onPointerDown={startGalleryDrag} onPointerMove={moveGalleryDrag} onPointerUp={endGalleryDrag} onPointerCancel={endGalleryDrag}>
            <div className="home-gallery-track" onClickCapture={handleGalleryItemClick}>
              {[0, 1].map((group) => <div className="home-gallery-group" key={group} aria-hidden={group === 1 || undefined}>
                {gallery.map((item, index) => <Link className="home-gallery-item" to="/gallery" key={`${item.title}-${index}`} tabIndex={group === 1 ? -1 : undefined}>
                  <img src={item.image} alt={group === 1 ? '' : item.title} loading="lazy" />
                  <span><small>{item.category}</small><b>{item.title}</b></span>
                </Link>)}
              </div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="process-section section">
        <div className="container">
          <SectionHeading eyebrow="SIMPLE FROM THE START" title="How It Works" centered />
          <div className="process-steps">
            {[
              ['Request a quote', 'Tell us what needs cleaning in a few quick steps.'],
              ['We confirm', 'Our team calls, inspects if needed and agrees a price and date.'],
              ['You relax', 'We clean to a high standard and you enjoy the result.'],
            ].map(([title, copy]) => <article className="process-step" key={title}><h3>{title}</h3><p>{copy}</p></article>)}
          </div>
        </div>
      </section>

      <section className="values-section section">
        <div className="container">
          <SectionHeading eyebrow="OUR PROMISE" title="Why Choose Polishers" centered />
          <div className="values-grid">{[['P', 'Professionalism'], ['O', 'Ownership'], ['L', 'Leadership'], ['I', 'Integrity'], ['S', 'Service'], ['H', 'High Standards'], ['E', 'Excellence'], ['R', 'Reliability'], ['S', 'Satisfaction']].map(([letter, name]) => <article className="value-item" key={name}><b>{letter}</b><span>{name}</span></article>)}</div>
        </div>
      </section>

      <section className="home-faq-section section">
        <div className="container home-faq-layout">
          <SectionHeading eyebrow="GOOD TO KNOW" title="A few quick answers." copy="Have a different question? Get in touch and we will help." />
          <div className="home-faq-list">
            {faqs.map((item, index) => <article className="home-faq-item" key={item.question}>
              <h3>
                <button type="button" aria-expanded={openFaq === index} aria-controls={`home-faq-answer-${index}`} onClick={() => setOpenFaq((current) => current === index ? -1 : index)}>
                  <span>{item.question}</span><ChevronDown size={18} aria-hidden="true" />
                </button>
              </h3>
              {openFaq === index && <div className="home-faq-answer" id={`home-faq-answer-${index}`}><p>{item.answer}</p></div>}
            </article>)}
          </div>
        </div>
      </section>

      <section className="home-testimonials-section section">
        <div className="container">
          <SectionHeading eyebrow="KIND WORDS" title="A clean that stays with you." copy="Notes from people who have trusted us with their spaces." />
          <div className="home-testimonials-layout">
            <div className="home-testimonial-slider">
              <article className="home-testimonial-slide" aria-live="polite">
                <div className="home-testimonial-stars" role="img" aria-label={`${activeTestimonial.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }, (_, index) => <Star key={index} size={16} fill={index < activeTestimonial.rating ? 'currentColor' : 'none'} />)}
                </div>
                <blockquote>“{activeTestimonial.quote}”</blockquote>
                <div className="home-testimonial-author"><b>{activeTestimonial.name}</b><span>{activeTestimonial.role}</span></div>
              </article>
              <div className="home-testimonial-controls">
                <button className="round-control" type="button" aria-label="Previous testimonial" onClick={() => setTestimonialIndex((current) => (current - 1 + homeTestimonials.length) % homeTestimonials.length)}><ArrowLeft size={16} /></button>
                <span>{testimonialIndex + 1}<i>/</i>{homeTestimonials.length}</span>
                <button className="round-control" type="button" aria-label="Next testimonial" onClick={() => setTestimonialIndex((current) => (current + 1) % homeTestimonials.length)}><ArrowRight size={16} /></button>
              </div>
            </div>
            <form className="home-testimonial-form" onSubmit={submitTestimonial}>
              <span className="eyebrow">SHARE YOUR EXPERIENCE</span>
              <h3>Leave a testimonial</h3>
              <label>Your name<input name="testimonial-name" autoComplete="name" maxLength={70} required value={testimonialForm.name} onChange={(event) => updateTestimonial('name', event.target.value)} /></label>
              <label>Your role<input name="testimonial-role" maxLength={70} required value={testimonialForm.role} onChange={(event) => updateTestimonial('role', event.target.value)} placeholder="e.g. Homeowner" /></label>
              <label>Your note<textarea name="testimonial-quote" rows="3" maxLength={500} required value={testimonialForm.quote} onChange={(event) => updateTestimonial('quote', event.target.value)} /></label>
              <fieldset className="home-testimonial-rating">
                <legend>Your rating</legend>
                <div>{[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" aria-label={`${rating} star${rating === 1 ? '' : 's'}`} aria-pressed={testimonialForm.rating === rating} onClick={() => updateTestimonial('rating', rating)}><Star size={21} fill={rating <= testimonialForm.rating ? 'currentColor' : 'none'} /></button>)}</div>
              </fieldset>
              <button className="button button-dark button-large" type="submit">Send testimonial <ArrowUpRight size={16} /></button>
              {testimonialSent && <p className="home-testimonial-success" role="status">Thank you. Your testimonial has been added.</p>}
            </form>
          </div>
        </div>
      </section>

      <section className="final-cta"><div className="container final-cta-inner"><h2>Dirt doesn't stand a chance!</h2><Link className="button button-dark button-large" to="/quote">Request a Quote <ArrowUpRight size={17} /></Link></div></section>
    </PublicLayout>
  )
}

export function ServicesPage() {
  return <PublicLayout><PageHero eyebrow="THOUGHTFUL BY DESIGN" title={<>A considered clean<br /><em>for every space.</em></>} copy="From the place you call home to the place you get things done — we've got it covered." image={services[1].image} /><section className="section page-services"><div className="container"><div className="service-grid">{services.map((service) => <ServiceCard key={service.slug} service={service} />)}</div><div className="services-note"><Sparkles size={20} /><span>Not sure where to start? <Link to="/contact">Tell us a little about your space <ArrowRight size={15} /></Link></span></div></div></section></PublicLayout>
}

export function ServiceDetail() {
  const { slug } = useParams()
  const service = serviceBySlug[slug]
  if (!service) return <PublicLayout><NotFound /></PublicLayout>
  const Icon = serviceIcons[service.icon] || Sparkles
  return <PublicLayout>
    <div className="container breadcrumb"><Link to="/">Home</Link><ChevronRight size={13} /><Link to="/services">Services</Link><ChevronRight size={13} /><span>{service.title}</span></div>
    <section className="detail-hero"><div className="container detail-hero-grid"><div><span className="eyebrow">THE ELITE STANDARD</span><span className="detail-icon"><Icon size={22} /></span><h1>{service.title}<br /><em>done thoughtfully.</em></h1><p>{service.description}</p><Link className="button button-aqua button-large" to={`/quote?service=${service.slug}`}>Get a quote for this service <ArrowUpRight size={16} /></Link><div className="detail-benefits"><span><Check size={15} /> Fully tailored</span><span><Check size={15} /> Trusted professionals</span></div></div><div className="detail-image"><img src={service.image} alt={service.title} /><span className="image-caption"><Sparkles size={14} /> A higher standard of clean</span></div></div></section>
    <section className="section detail-includes"><div className="container detail-includes-grid"><SectionHeading eyebrow="THE LITTLE DETAILS" title={<>What a good clean<br /><em>looks like.</em></>} copy="Every space is different. Here's what you can expect from this service." /><div className="included-list">{service.includes.map((item) => <div key={item}><b>{item}</b><CheckCircle2 size={19} /></div>)}</div></div></section>
    <section className="detail-cta"><div className="container"><span className="eyebrow eyebrow-light">READY WHEN YOU ARE</span><h2>Let's make your space<br /><em>feel like yours again.</em></h2><Link className="button button-aqua" to={`/quote?service=${service.slug}`}>Request a quote <ArrowUpRight size={15} /></Link></div></section>
  </PublicLayout>
}

export function GalleryPage() {
  const categories = ['All', 'Residential', 'Commercial', 'Industrial', 'Post-construction']
  const [category, setCategory] = useState('All')
  const [lightbox, setLightbox] = useState(null)
  const visible = category === 'All' ? gallery : gallery.filter((item) => item.category === category)
  return <PublicLayout><PageHero eyebrow="A PICTURE OF CARE" title={<>The feeling of a<br /><em>space well kept.</em></>} copy="Every photo is a little reminder: the details make all the difference." image={gallery[0].image} />
    <section className="section gallery-section"><div className="container"><div className="gallery-toolbar"><div className="filter-chips">{categories.map((item) => <button key={item} className={category === item ? 'chip chip-active' : 'chip'} onClick={() => setCategory(item)}>{item}</button>)}</div><span>{visible.length} spaces</span></div><div className="gallery-grid">{visible.map((item, index) => <button className={`gallery-tile gallery-tile-${index % 4}`} key={item.title} onClick={() => setLightbox(item)}><img src={item.image} alt={item.title} loading="lazy" /><span className="gallery-tile-caption"><span><small>{item.category}</small><b>{item.title}</b></span><span className="gallery-tile-arrow"><ArrowUpRight size={17} /></span></span></button>)}</div><div className="gallery-bottom"><Sparkles size={17} /><span>There's always more to see. <Link to="/quote">Let us make your space next.</Link></span></div></div></section>
    {lightbox && <div className="lightbox" role="dialog" aria-modal="true" aria-label={lightbox.title} onClick={() => setLightbox(null)}><button aria-label="Close image" className="lightbox-close"><X /></button><img src={lightbox.image} alt={lightbox.title} /><div><small>{lightbox.category}</small><b>{lightbox.title}</b></div></div>}
  </PublicLayout>
}

export function AboutPage() {
  return <PublicLayout><PageHero eyebrow="A LITTLE ABOUT US" title={<>Good people.<br /><em>Beautifully clean.</em></>} copy="Polishers Da Elite is built on a simple belief: every space deserves care, and every client deserves to feel looked after." image="https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1300&q=85" />
    <section className="section story-section"><div className="container story-grid"><div className="story-photo"><img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1100&q=85" alt="A professional cleaning team at work" /><span><Sparkles size={18} /> CARE IN EVERY CORNER</span></div><div><SectionHeading eyebrow="OUR STORY" title={<>We believe in<br /><em>the fresh start.</em></>} /><p>It's more than a tidy room. A clean, cared-for space gives you room to think, focus, rest and feel at home. That's why our team brings a little extra thought to every visit.</p><p>From the first hello to the final walkthrough, we're here to make the whole experience feel easy, respectful and genuinely excellent.</p><div className="story-signoff"><span className="story-signature">The Polishers team</span><span>Made with care in Lagos</span></div></div></div></section>
    <section className="values-section section"><div className="container values-layout"><div className="values-intro"><span className="eyebrow eyebrow-light">WHAT WE STAND FOR</span><h2>Our name is<br />our <em>promise.</em></h2><p>The POLISHERS values are more than words. They're how we show up, every single time.</p></div><div className="values-grid">{[['P', 'Professionalism'], ['O', 'Ownership'], ['L', 'Leadership'], ['I', 'Integrity'], ['S', 'Service'], ['H', 'High standards'], ['E', 'Excellence'], ['R', 'Reliability'], ['S', 'Satisfaction']].map(([letter, name]) => <div className="value-item" key={name}><span>{letter}</span><b>{name}</b></div>)}</div></div></section>
    <section className="about-cta"><div className="container about-cta-inner"><div><span className="eyebrow">YOUR SPACE IS IN GOOD HANDS</span><h2>We'd love to look<br /><em>after your space.</em></h2></div><Link to="/quote" className="button button-dark button-large">Let's talk cleaning <ArrowUpRight size={16} /></Link></div></section>
  </PublicLayout>
}

export function ContactPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const payload = { full_name: form.get('name'), phone: form.get('phone'), email: form.get('email') || null, service_type: 'enquiry', message: form.get('message') }
    try {
      await saveRequest(payload)
      setSent(true)
    } catch (issue) {
      setError(issue.message || 'We could not send your message. Please try again.')
    }
  }
  return <PublicLayout><PageHero eyebrow="WE'RE RIGHT HERE" title={<>A little hello<br /><em>goes a long way.</em></>} copy="Questions, plans, a space that needs a fresh start? We'd love to hear from you." image={services[0].image} />
    <section className="section contact-section"><div className="container contact-grid"><div><SectionHeading eyebrow="TALK TO A HUMAN" title={<>Let's make it<br /><em>easy to get in touch.</em></>} /><div className="contact-details"><a href="tel:+2348095389606"><span><Phone size={19} /></span><div><small>GIVE US A CALL</small><b>+234 809 538 9606</b></div><ArrowUpRight size={16} /></a><a href="mailto:hello@polishersdaelite.com"><span><Mail size={19} /></span><div><small>DROP US A NOTE</small><b>hello@polishersdaelite.com</b></div><ArrowUpRight size={16} /></a><a href="https://wa.me/2348095389606"><span><MessageCircle size={19} /></span><div><small>WE'RE ON WHATSAPP</small><b>Let's have a chat</b></div><ArrowUpRight size={16} /></a><div className="contact-hours"><MapPin size={18} /><div><small>WHERE WE WORK</small><b>Lagos & nearby areas</b><small>Monday – Saturday, 8am – 6pm</small></div></div></div></div><div className="contact-form-card"><span className="eyebrow">SEND A QUICK MESSAGE</span><h3>What's on your mind?</h3>{sent ? <div className="form-success"><CheckCircle2 size={32} /><b>Thanks for reaching out.</b><p>Our team will be in touch soon.</p></div> : <form onSubmit={submit}><label>Your name<input name="name" required placeholder="e.g. Amara Okafor" /></label><div className="field-row"><label>Phone number<input type="tel" name="phone" required placeholder="+234" /></label><label>Email <span>(optional)</span><input type="email" name="email" placeholder="you@example.com" /></label></div><label>Your message<textarea name="message" rows="4" required placeholder="Tell us a little about what you need..." /></label>{error && <p className="form-error">{error}</p>}<button className="button button-dark button-large" type="submit">Send your message <ArrowUpRight size={16} /></button></form>}</div></div></section>
  </PublicLayout>
}

function saveLocalRequest(payload) {
  const current = JSON.parse(localStorage.getItem('polishers-requests') || '[]')
  const reference = `PDE-${String(Date.now()).slice(-6)}`
  const request = { ...payload, reference, status: 'new', created_at: new Date().toISOString() }
  localStorage.setItem('polishers-requests', JSON.stringify([request, ...current]))
  return request
}

async function saveRequest(payload) {
  if (!supabaseConfigured) return saveLocalRequest(payload)
  const { data, error } = await supabase.rpc('submit_request', { request_data: payload })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return { ...payload, reference: typeof row === 'string' ? row : row?.reference }
}

export function QuotePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const initialService = serviceBySlug[params.get('service')] ? params.get('service') : ''
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ service_type: initialService, property_type: '', size_note: '', address: '', preferred_date: '', preferred_time: '', full_name: '', phone: '', email: '', message: '', photo: null })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const serviceLabel = serviceBySlug[form.service_type]?.title || form.service_type
  const canContinue = [
    Boolean(form.service_type),
    Boolean(form.property_type && form.address),
    Boolean(form.preferred_date && form.preferred_time),
    Boolean(form.full_name.trim() && form.phone.trim()),
    true,
  ][step]
  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (step < steps.length - 1) {
      if (!canContinue) {
        setError(step === 0 ? 'Choose a service to continue.' : 'Please complete the required fields.')
        return
      }
      setStep(step + 1)
      return
    }
    setBusy(true)
    try {
      let photoPath = null
      if (form.photo && supabaseConfigured) {
        const path = `requests/${crypto.randomUUID()}-${form.photo.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
        const { error: uploadError } = await supabase.storage.from('request-uploads').upload(path, form.photo, { upsert: false })
        if (uploadError) throw uploadError
        photoPath = path
      }
      const { photo, ...values } = form
      const result = await saveRequest({ ...values, photo_urls: photoPath ? [photoPath] : [] })
      navigate('/quote/success', { state: { reference: result.reference || `PDE-${String(Date.now()).slice(-6)}` } })
    } catch (issue) {
      setError(issue.message || 'We could not submit your request. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return <PublicLayout><section className="quote-page"><div className="container quote-layout"><div className="quote-aside"><span className="eyebrow">YOUR FRESH START</span><h1>Tell us what<br />your space <em>needs.</em></h1><p>A few quick details help us put together the right plan for you. We'll be in touch within 24 hours.</p><div className="quote-promise"><ShieldCheck size={20} /><span><b>Thoughtful, no-pressure quotes.</b><small>Your details stay safe with us.</small></span></div><div className="quote-aside-image"><img src={services[0].image} alt="Freshly cleaned living room" /><span><Sparkles size={14} /> Your space, in good hands.</span></div></div>
      <div className="quote-form-wrap"><div className="quote-form-top"><div><span className="eyebrow">REQUEST A QUOTE</span><h2>Let's get the details.</h2></div></div><div className="quote-progress" role="progressbar" aria-label="Quote request progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1}><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div><div className="quote-step-labels">{steps.map((label, index) => <span className={index === step ? 'step-label-current' : index < step ? 'step-label-done' : ''} key={label}>{label}</span>)}</div>
        <form className="quote-form" onSubmit={handleSubmit}>
          {step === 0 && <div className="quote-step"><h3>What can we help with?</h3><p>Choose the service that best fits your space.</p><div className="service-choice-grid">{services.map((service) => { const Icon = serviceIcons[service.icon] || Sparkles; return <button type="button" className={`service-choice ${form.service_type === service.slug ? 'choice-selected' : ''}`} onClick={() => update('service_type', service.slug)} key={service.slug}><Icon size={20} /><span>{service.title}</span>{form.service_type === service.slug && <CheckCircle2 size={17} />}</button> })}<button type="button" className={`service-choice ${form.service_type === 'other' ? 'choice-selected' : ''}`} onClick={() => update('service_type', 'other')}><Sparkles size={20} /><span>Something else</span>{form.service_type === 'other' && <CheckCircle2 size={17} />}</button></div></div>}
          {step === 1 && <div className="quote-step"><h3>Tell us about your space.</h3><p>The more we know, the better we can prepare.</p><label>What kind of property?<select required value={form.property_type} onChange={(event) => update('property_type', event.target.value)}><option value="">Choose one</option><option>House</option><option>Apartment</option><option>Office</option><option>Shop or retail space</option><option>Warehouse or facility</option><option>Other</option></select></label><div className="field-row"><label>Approx. size or rooms<input value={form.size_note} onChange={(event) => update('size_note', event.target.value)} placeholder="e.g. 3 bedrooms" /></label><label>Area / location<input required value={form.address} onChange={(event) => update('address', event.target.value)} placeholder="e.g. Lekki Phase 1" /></label></div><label>Anything else we should know?<textarea rows="3" value={form.message} onChange={(event) => update('message', event.target.value)} placeholder="A little note about your space..." /></label></div>}
          {step === 2 && <div className="quote-step"><h3>When works for you?</h3><p>We'll confirm a time with you before anything is booked.</p><label>Preferred date<input type="date" min={new Date().toISOString().slice(0, 10)} required value={form.preferred_date} onChange={(event) => update('preferred_date', event.target.value)} /></label><span className="input-label">Preferred time</span><div className="time-choice">{['Morning', 'Afternoon', 'Flexible'].map((time) => <button type="button" key={time} onClick={() => update('preferred_time', time)} className={form.preferred_time === time ? 'time-selected' : ''}>{time}</button>)}</div></div>}
<<<<<<< HEAD
          {step === 3 && <div className="quote-step"><h3>How can we reach you?</h3><p>We'll get back to you within 24 hours.</p><label>Your full name<input autoComplete="name" required value={form.full_name} onChange={(event) => update('full_name', event.target.value)} placeholder="e.g. Amara Okafor" /></label><div className="field-row"><label>Phone number<input type="tel" autoComplete="tel" required value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="+234 809 538 9606" /></label><label>Email address <span>(optional)</span><input type="email" autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="you@example.com" /></label></div><label className="upload-field"><Image size={20} /><span><b>{form.photo?.name || 'Add a photo of your space'}</b><small>Optional · JPG, PNG or WebP · up to 5 MB</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file && file.size > 5 * 1024 * 1024) { setError('Photos must be smaller than 5 MB.'); return } update('photo', file || null); setError('') }} /></label></div>}
=======
          {step === 3 && <div className="quote-step"><h3>How can we reach you?</h3><p>We'll get back to you within 24 hours.</p><label>Your full name<input autoComplete="name" required value={form.full_name} onChange={(event) => update('full_name', event.target.value)} placeholder="e.g. Amara Okafor" /></label><div className="field-row"><label>Phone number<input type="tel" autoComplete="tel" required value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="+234 809 538 9606" /></label><label>Email address <span>(optional)</span><input type="email" autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="you@example.com" /></label></div><label className="upload-field"><Image size={20} /><span><b>{form.photo?.name || 'Add a photo of your space'}</b><small>Optional · JPG, PNG or WebP · up to 5 MB</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file && file.size > 5 * 1024 * 1024) { setError('Photos must be smaller than 5 MB.'); return } update('photo', file || null); setError('') }} /></label></div>}
>>>>>>> a318371 (Update contact details and gallery behavior)
          {step === 4 && <div className="quote-step"><h3>Does this look right?</h3><p>Have a final look before we send your request.</p><div className="review-card">{[['Service', serviceLabel, 0], ['Your space', `${form.property_type}${form.size_note ? ` · ${form.size_note}` : ''}`, 1], ['Area', form.address, 1], ['Preferred time', `${form.preferred_date} · ${form.preferred_time}`, 2], ['Your details', `${form.full_name} · ${form.phone}${form.email ? ` · ${form.email}` : ''}`, 3]].map(([label, value, editStep]) => <div key={label}><span><small>{label}</small><b>{value}</b></span><button type="button" className="text-link" onClick={() => setStep(editStep)}>Edit</button></div>)}</div><p className="review-note"><ShieldCheck size={16} /> This is a request, not a confirmed booking. We'll be in touch to discuss the details.</p></div>}
          {error && <p className="form-error">{error}</p>}
          <div className="quote-form-actions">{step > 0 && <button type="button" className="button button-quiet" onClick={() => { setStep(step - 1); setError('') }}><ArrowLeft size={15} /> Back</button>}<button className="button button-dark button-large" type="submit" disabled={busy}>{busy ? 'Sending…' : step === steps.length - 1 ? 'Send my request' : 'Continue'}{!busy && <ArrowRight size={16} />}</button></div>
        </form>
        <div className="quote-safe"><ShieldCheck size={14} /> Your details are only used to help us prepare your quote.</div>
      </div></div></section></PublicLayout>
}

export function QuoteSuccess() {
  const location = useLocation()
  return <PublicLayout><section className="success-page"><div className="success-card"><span className="success-icon"><CheckCircle2 size={37} /></span><span className="eyebrow">REQUEST RECEIVED</span><h1>Well, this is a<br /><em>good start.</em></h1><p>Your space is on our mind already. Our team will be in touch within 24 hours to talk through the details.</p><div className="reference-number"><small>YOUR REFERENCE</small><b>{location.state?.reference || 'PDE-000000'}</b></div><a className="button button-aqua button-large" href="https://wa.me/2348095389606" target="_blank" rel="noreferrer"><MessageCircle size={17} /> Chat with us on WhatsApp</a><Link to="/" className="success-home">Back to home <ArrowRight size={14} /></Link></div></section></PublicLayout>
}

export function NotFound() {
  return <section className="not-found"><span className="eyebrow">A LITTLE DETOUR</span><h1>This page seems<br /><em>to need a tidy-up.</em></h1><Link to="/" className="button button-dark">Back to home <ArrowUpRight size={15} /></Link></section>
}
