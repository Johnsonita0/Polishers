import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight, ArrowUpRight, Building2, Check, CheckCircle2, ChevronRight,
  Factory, HardHat, Home, Image, Mail, MapPin, MessageCircle, Minus, Pause,
  Phone, Play, Plus, ShieldCheck, Sparkles, Star, X,
} from 'lucide-react'
import {
  Link, useLocation, useNavigate, useParams, useSearchParams,
} from 'react-router-dom'
import { faqs, gallery, services, steps, testimonials } from '../../data'
import { supabase, supabaseConfigured } from '../../supabase'
import SearchSelect from '../../components/ui/SearchSelect'
import { usePublishedContent, usePublishedHeroMedia } from '../../components/ui/SiteContentProvider'
import { useToast } from '../../components/ui/ToastProvider'
import { friendlyErrorMessage } from '../../utils/friendlyError'
import { businessWhatsAppPhone, whatsappHref } from '../../utils/whatsapp'
import {
  PageHero, PublicLayout, SectionHeading, ServiceCard,
} from '../../components/public/PublicComponents'

const serviceIcons = { Home, Building2, Factory, HardHat }
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
  const heroContent = usePublishedContent('hero', {
    eyebrow: 'Residential · Commercial · Industrial · Post-construction',
    headline: 'Sparkling Space,',
    highlight: 'Happy Client.',
    body: 'Professional cleaning delivered with precision, reliability and class, for homes, offices, factories and estates of every size.',
  }) || {}
  const homeServices = usePublishedContent('services', services)
  const homeGallery = usePublishedContent('gallery', gallery)
  const homeFaqs = usePublishedContent('faqs', faqs)
  const curatedTestimonials = usePublishedContent('testimonials', testimonials)
  const heroMedia = usePublishedHeroMedia()
  const activeHeroSlide = heroMedia
    ? { type: heroMedia.type, src: heroMedia.url, title: 'Uploaded hero background' }
    : heroSlides[heroSlide]

  useEffect(() => {
    if (heroMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches || activeHeroSlide.type === 'video') return
    const timer = window.setTimeout(() => {
      setHeroSlide((current) => (current + 1) % heroSlides.length)
    }, 3500)
    return () => window.clearTimeout(timer)
  }, [activeHeroSlide.type, heroMedia, heroSlide])

  useEffect(() => {
    const video = heroVideoRef.current
    if (!video) return
    if (activeHeroSlide.type === 'video') {
      video.src = activeHeroSlide.src
      video.currentTime = 0
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [activeHeroSlide.src, activeHeroSlide.type])

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

  const homeTestimonials = [...savedTestimonials, ...curatedTestimonials]
  const activeTestimonial = homeTestimonials[testimonialIndex] || null

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
            <span className="hero-services">{heroContent.eyebrow}</span>
            <h1>{heroContent.headline}<br /><em>{heroContent.highlight}</em></h1>
            <p>{heroContent.body}</p>
            <div className="hero-buttons">
              <Link to="/quote" className="button button-aqua button-large">Get a Free Quote</Link>
              <a className="button button-glass button-large" href={whatsappHref(businessWhatsAppPhone, 'Hi Polishers Da Elite, I would like a cleaning quote. Could you help me get started?')} target="_blank" rel="noreferrer">WhatsApp Us</a>
            </div>
            <div className="hero-stats">
              <div><b>JOBS DONE</b><span>Jobs completed</span></div>
              <div><b>CLIENTS</b><span>Happy clients</span></div>
              <div><b>YEARS</b><span>Years of service</span></div>
            </div>
          </div>
          <div className={`hero-visual ${activeHeroSlide.type === 'video' ? 'hero-visual-video' : activeHeroSlide.title === 'Polishers Da Elite logo' ? 'hero-visual-logo' : ''}`} style={activeHeroSlide.title === 'Polishers Da Elite logo' ? { '--hero-mobile-image': `url(${heroSlides[2].src})` } : undefined} role="group" aria-roledescription="carousel" aria-label="Featured cleaning spaces">
            {heroMedia?.type === 'image' && <img className="hero-slide hero-slide-active" src={heroMedia.url} alt="Hero background" />}
            {!heroMedia && heroSlides.map((slide, index) => slide.type === 'image' && <img className={`hero-slide ${index === heroSlide ? 'hero-slide-active' : ''}`} key={slide.src} src={slide.src} alt={index === heroSlide ? slide.title : ''} aria-hidden={index !== heroSlide} style={{ objectPosition: slide.position, objectFit: slide.fit, backgroundColor: slide.background }} />)}
            <video className={`hero-slide ${activeHeroSlide.type === 'video' ? 'hero-slide-active' : ''}`} ref={heroVideoRef} src={activeHeroSlide.type === 'video' ? activeHeroSlide.src : heroVideoSource} muted playsInline preload="metadata" onEnded={() => { if (!heroMedia) setHeroSlide((current) => (current + 1) % heroSlides.length) }} aria-label="Featured cleaning video" aria-hidden={activeHeroSlide.type !== 'video'} tabIndex={-1} />
            <div className="hero-note"><b>Free site inspection</b><span>Response within 24 hours</span></div>
          </div>
        </div>
      </section>

      <section className="section services-section" id="services">
        <div className="container">
          <div className="home-services-heading"><SectionHeading eyebrow="WHAT WE DO" title="Our Services" /><Link to="/services#services">See all <ArrowRight size={15} /></Link></div>
          <div className="service-grid">{homeServices.map((service) => <ServiceCard key={service.slug} service={service} iconOnly />)}</div>
        </div>
      </section>

      <section className="home-gallery-section section" id="gallery">
        <div className="container">
          <div className="home-section-heading">
            <SectionHeading eyebrow="A PICTURE OF CARE" title="Spaces, polished." copy="A few recent spaces we have cared for." />
            <div className="home-gallery-actions">
              <button className="home-gallery-motion-control" type="button" title={galleryPaused ? 'Play gallery' : 'Pause gallery'} aria-label={galleryPaused ? 'Play gallery' : 'Pause gallery'} aria-pressed={galleryPaused} onClick={() => setGalleryPaused((paused) => !paused)}>{galleryPaused ? <Play size={16} /> : <Pause size={16} />}</button>
              <Link to="/gallery#gallery" className="text-link">View all work <ArrowUpRight size={15} /></Link>
            </div>
          </div>
          <div className="home-gallery-viewport" ref={galleryViewportRef} role="region" aria-label="Recent cleaning work" onPointerDown={startGalleryDrag} onPointerMove={moveGalleryDrag} onPointerUp={endGalleryDrag} onPointerCancel={endGalleryDrag}>
            <div className="home-gallery-track" onClickCapture={handleGalleryItemClick}>
              {[0, 1].map((group) => <div className="home-gallery-group" key={group} aria-hidden={group === 1 || undefined}>
                {homeGallery.map((item, index) => <Link className="home-gallery-item" to="/gallery#gallery" key={`${item.title}-${index}`} tabIndex={group === 1 ? -1 : undefined}>
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
            {homeFaqs.map((item, index) => <article className="home-faq-item" key={item.question}>
              <h3>
                <button type="button" aria-expanded={openFaq === index} aria-controls={`home-faq-answer-${index}`} onClick={() => setOpenFaq((current) => current === index ? -1 : index)}>
                  <span>{item.question}</span>{openFaq === index ? <Minus size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
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
                {activeTestimonial ? <>
                  <div className="home-testimonial-stars" role="img" aria-label={`${activeTestimonial.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }, (_, index) => <Star key={index} size={16} fill={index < activeTestimonial.rating ? 'currentColor' : 'none'} />)}
                  </div>
                  <blockquote>“{activeTestimonial.quote}”</blockquote>
                  <div className="home-testimonial-author"><b>{activeTestimonial.name}</b><span>{activeTestimonial.role}</span></div>
                </> : <p>No testimonials have been published yet.</p>}
              </article>
              {homeTestimonials.length > 1 && <div className="home-testimonial-controls">
                <button className="round-control" type="button" aria-label="Previous testimonial" onClick={() => setTestimonialIndex((current) => (current - 1 + homeTestimonials.length) % homeTestimonials.length)}>Prev</button>
                <span>{testimonialIndex + 1}<i>/</i>{homeTestimonials.length}</span>
                <button className="round-control" type="button" aria-label="Next testimonial" onClick={() => setTestimonialIndex((current) => (current + 1) % homeTestimonials.length)}>Next</button>
              </div>}
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
  const publishedServices = usePublishedContent('services', services)
  return <PublicLayout><PageHero eyebrow="THOUGHTFUL BY DESIGN" title={<>A considered clean<br /><em>for every space.</em></>} copy="From the place you call home to the place you get things done — we've got it covered." image={publishedServices[1]?.image || services[1].image} /><section className="section page-services" id="services"><div className="container"><div className="service-grid">{publishedServices.map((service) => <ServiceCard key={service.slug} service={service} />)}</div><div className="services-note"><Sparkles size={20} /><span>Not sure where to start? <Link to="/contact#contact-section">Tell us a little about your space <ArrowRight size={15} /></Link></span></div></div></section></PublicLayout>
}

export function ServiceDetail() {
  const { slug } = useParams()
  const publishedServices = usePublishedContent('services', services)
  const service = publishedServices.find((item) => item.slug === slug)
  if (!service) return <PublicLayout><NotFound /></PublicLayout>
  const Icon = serviceIcons[service.icon] || Sparkles
  return <PublicLayout>
    <div className="container breadcrumb"><Link to="/">Home</Link><ChevronRight size={13} /><Link to="/services#services">Services</Link><ChevronRight size={13} /><span>{service.title}</span></div>
    <section className="detail-hero"><div className="container detail-hero-grid"><div><span className="eyebrow">THE ELITE STANDARD</span><span className="detail-icon"><Icon size={22} /></span><h1>{service.title}<br /><em>done thoughtfully.</em></h1><p>{service.description}</p><Link className="button button-aqua button-large" to={`/quote?service=${service.slug}`}>Get a quote for this service <ArrowUpRight size={16} /></Link><div className="detail-benefits"><span><Check size={15} /> Fully tailored</span><span><Check size={15} /> Trusted professionals</span></div></div><div className="detail-image"><img src={service.image} alt={service.title} /><span className="image-caption"><Sparkles size={14} /> A higher standard of clean</span></div></div></section>
    <section className="section detail-includes"><div className="container detail-includes-grid"><SectionHeading eyebrow="THE LITTLE DETAILS" title={<>What a good clean<br /><em>looks like.</em></>} copy="Every space is different. Here's what you can expect from this service." /><div className="included-list">{service.includes.map((item) => <div key={item}><b>{item}</b><CheckCircle2 size={19} /></div>)}</div></div></section>
    <section className="detail-cta"><div className="container"><span className="eyebrow eyebrow-light">READY WHEN YOU ARE</span><h2>Let's make your space<br /><em>feel like yours again.</em></h2><Link className="button button-aqua" to={`/quote?service=${service.slug}`}>Request a quote <ArrowUpRight size={15} /></Link></div></section>
  </PublicLayout>
}

export function GalleryPage() {
  const publishedGallery = usePublishedContent('gallery', gallery)
  const categories = ['All', 'Residential', 'Commercial', 'Industrial', 'Post-construction']
  const [category, setCategory] = useState('All')
  const [lightbox, setLightbox] = useState(null)
  const visible = category === 'All' ? publishedGallery : publishedGallery.filter((item) => item.category === category)
  return <PublicLayout><PageHero eyebrow="A PICTURE OF CARE" title={<>The feeling of a<br /><em>space well kept.</em></>} copy="Every photo is a little reminder: the details make all the difference." image={publishedGallery[0]?.image || gallery[0].image} />
    <section className="section gallery-section" id="gallery"><div className="container"><div className="gallery-toolbar"><div className="filter-chips">{categories.map((item) => <button key={item} className={category === item ? 'chip chip-active' : 'chip'} onClick={() => setCategory(item)}>{item}</button>)}</div><span>{visible.length} spaces</span></div><div className="gallery-grid">{visible.map((item, index) => <button className={`gallery-tile gallery-tile-${index % 4}`} key={item.title} onClick={() => setLightbox(item)}><img src={item.image} alt={item.title} loading="lazy" /><span className="gallery-tile-caption"><span><small>{item.category}</small><b>{item.title}</b></span><span className="gallery-tile-arrow"><ArrowUpRight size={17} /></span></span></button>)}</div><div className="gallery-bottom"><Sparkles size={17} /><span>There's always more to see. <Link to="/quote">Let us make your space next.</Link></span></div></div></section>
    {lightbox && <div className="lightbox" role="dialog" aria-modal="true" aria-label={lightbox.title} onClick={() => setLightbox(null)}><button aria-label="Close image" className="lightbox-close"><X /></button><img src={lightbox.image} alt={lightbox.title} /><div><small>{lightbox.category}</small><b>{lightbox.title}</b></div></div>}
  </PublicLayout>
}

export function AboutPage() {
  return <PublicLayout><PageHero eyebrow="A LITTLE ABOUT US" title={<>Good people.<br /><em>Beautifully clean.</em></>} copy="Polishers Da Elite is built on a simple belief: every space deserves care, and every client deserves to feel looked after." image="https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1300&q=85" />
    <section className="section story-section" id="about"><div className="container story-grid"><div className="story-photo"><img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1100&q=85" alt="A professional cleaning team at work" /><span><Sparkles size={18} /> CARE IN EVERY CORNER</span></div><div><SectionHeading eyebrow="OUR STORY" title={<>We believe in<br /><em>the fresh start.</em></>} /><p>It's more than a tidy room. A clean, cared-for space gives you room to think, focus, rest and feel at home. That's why our team brings a little extra thought to every visit.</p><p>From the first hello to the final walkthrough, we're here to make the whole experience feel easy, respectful and genuinely excellent.</p><div className="story-signoff"><span className="story-signature">The Polishers team</span><span>Made with care in Lagos</span></div></div></div></section>
    <section className="values-section section"><div className="container values-layout"><div className="values-intro"><span className="eyebrow eyebrow-light">WHAT WE STAND FOR</span><h2>Our name is<br />our <em>promise.</em></h2><p>The POLISHERS values are more than words. They're how we show up, every single time.</p></div><div className="values-grid">{[['P', 'Professionalism'], ['O', 'Ownership'], ['L', 'Leadership'], ['I', 'Integrity'], ['S', 'Service'], ['H', 'High standards'], ['E', 'Excellence'], ['R', 'Reliability'], ['S', 'Satisfaction']].map(([letter, name]) => <div className="value-item" key={name}><span>{letter}</span><b>{name}</b></div>)}</div></div></section>
    <section className="about-cta"><div className="container about-cta-inner"><div><span className="eyebrow">YOUR SPACE IS IN GOOD HANDS</span><h2>We'd love to look<br /><em>after your space.</em></h2></div><Link to="/quote" className="button button-dark button-large">Let's talk cleaning <ArrowUpRight size={16} /></Link></div></section>
  </PublicLayout>
}

export function ContactPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const showToast = useToast()
  async function submit(event) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const payload = { full_name: form.get('name'), phone: form.get('phone'), email: form.get('email') || null, service_type: 'enquiry', message: form.get('message') }
    try {
      await saveRequest(payload)
      setSent(true)
      showToast({ tone: 'success', title: 'Message sent', message: 'Thanks for reaching out. Our team will be in touch soon.' })
    } catch (issue) {
      const message = friendlyErrorMessage(issue, 'We could not send your message. Check your connection and try again.')
      setError(message)
      showToast({ tone: 'error', title: 'Message not sent', message })
    }
  }
  return <PublicLayout><PageHero eyebrow="WE'RE RIGHT HERE" title={<>A little hello<br /><em>goes a long way.</em></>} copy="Questions, plans, a space that needs a fresh start? We'd love to hear from you." image={services[0].image} />
    <section className="section contact-section" id="contact-section"><div className="container contact-grid"><div><SectionHeading eyebrow="TALK TO A HUMAN" title={<>Let's make it<br /><em>easy to get in touch.</em></>} /><div className="contact-details"><a href="tel:+2348095389606"><span><Phone size={19} /></span><div><small>GIVE US A CALL</small><b>+234 809 538 9606</b></div><ArrowUpRight size={16} /></a><a href="mailto:polishersdaelit@gmail.com"><span><Mail size={19} /></span><div><small>DROP US A NOTE</small><b>polishersdaelit@gmail.com</b></div><ArrowUpRight size={16} /></a><a href={whatsappHref(businessWhatsAppPhone, 'Hi Polishers Da Elite, I have a question about your cleaning services. Could someone help me?')} target="_blank" rel="noreferrer"><span><MessageCircle size={19} /></span><div><small>WE'RE ON WHATSAPP</small><b>Let's have a chat</b></div><ArrowUpRight size={16} /></a><div className="contact-hours"><MapPin size={18} /><div><small>WHERE WE WORK</small><b>Lagos & nearby areas</b><small>Monday – Saturday, 8am – 6pm</small></div></div></div></div><div className="contact-form-card"><span className="eyebrow">SEND A QUICK MESSAGE</span><h3>What's on your mind?</h3>{sent ? <div className="form-success"><CheckCircle2 size={32} /><b>Thanks for reaching out.</b><p>Our team will be in touch soon.</p></div> : <form onSubmit={submit}><label>Your name<input name="name" required placeholder="e.g. Johnson Ime" /></label><div className="field-row"><label>Phone number<input type="tel" name="phone" required placeholder="+234" /></label><label>Email <span>(optional)</span><input type="email" name="email" placeholder="you@example.com" /></label></div><label>Your message<textarea name="message" rows="4" required placeholder="Tell us a little about what you need..." /></label>{error && <p className="form-error">{error}</p>}<button className="button button-dark button-large" type="submit">Send your message <ArrowUpRight size={16} /></button></form>}</div></div></section>
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
  if (!import.meta.env.DEV) {
    const response = await fetch('/api/service-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || 'The request could not be saved.')
    return { ...payload, reference: result.reference }
  }
  const { data, error } = await supabase.rpc('submit_request', { request_data: payload })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return { ...payload, reference: typeof row === 'string' ? row : row?.reference }
}

export function QuotePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const publishedServices = usePublishedContent('services', services)
  const requestedService = params.get('service') || ''
  const initialService = publishedServices.some((service) => service.slug === requestedService) ? requestedService : ''
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ service_type: initialService, property_type: '', size_note: '', address: '', preferred_date: '', preferred_time: '', full_name: '', phone: '', email: '', message: '', photo: null })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const showToast = useToast()
  useEffect(() => {
    if (!form.service_type && publishedServices.some((service) => service.slug === requestedService)) {
      setForm((current) => ({ ...current, service_type: requestedService }))
    }
  }, [form.service_type, publishedServices, requestedService])
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const serviceLabel = publishedServices.find((service) => service.slug === form.service_type)?.title || form.service_type
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
        const message = step === 0 ? 'Choose a service to continue.' : 'Complete the required fields to continue.'
        setError(message)
        showToast({ tone: 'error', title: 'A few details are missing', message })
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
      showToast({ tone: 'success', title: 'Quote request sent', message: 'We received your request and will be in touch within 24 hours.' })
      navigate('/quote/success', { state: { reference: result.reference || `PDE-${String(Date.now()).slice(-6)}`, full_name: values.full_name, service: serviceLabel, address: values.address, preferred_date: values.preferred_date } })
    } catch (issue) {
      const message = friendlyErrorMessage(issue, 'We could not submit your request. Check your connection and try again.')
      setError(message)
      showToast({ tone: 'error', title: 'Request not sent', message })
    } finally {
      setBusy(false)
    }
  }
  return <PublicLayout><section className="quote-page"><div className="container quote-layout"><div className="quote-aside"><span className="eyebrow">YOUR FRESH START</span><h1>Tell us what<br />your space <em>needs.</em></h1><p>A few quick details help us put together the right plan for you. We'll be in touch within 24 hours.</p><div className="quote-promise"><ShieldCheck size={20} /><span><b>Thoughtful, no-pressure quotes.</b><small>Your details stay safe with us.</small></span></div><div className="quote-aside-image"><img src={services[0].image} alt="Freshly cleaned living room" /><span><Sparkles size={14} /> Your space, in good hands.</span></div></div>
      <div className="quote-form-wrap"><div className="quote-form-top"><div><span className="eyebrow">REQUEST A QUOTE</span><h2>Let's get the details.</h2></div></div><div className="quote-progress" role="progressbar" aria-label="Quote request progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1}><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div><div className="quote-step-labels">{steps.map((label, index) => <span className={index === step ? 'step-label-current' : index < step ? 'step-label-done' : ''} key={label}>{label}</span>)}</div>
        <form className="quote-form" onSubmit={handleSubmit}>
          {step === 0 && <div className="quote-step"><h3>What can we help with?</h3><p>Choose the service that best fits your space.</p><div className="service-choice-grid">{services.map((service) => { const Icon = serviceIcons[service.icon] || Sparkles; return <button type="button" className={`service-choice ${form.service_type === service.slug ? 'choice-selected' : ''}`} onClick={() => update('service_type', service.slug)} key={service.slug}><Icon size={20} /><span>{service.title}</span>{form.service_type === service.slug && <CheckCircle2 size={17} />}</button> })}<button type="button" className={`service-choice ${form.service_type === 'other' ? 'choice-selected' : ''}`} onClick={() => update('service_type', 'other')}><Sparkles size={20} /><span>Something else</span>{form.service_type === 'other' && <CheckCircle2 size={17} />}</button></div></div>}
          {step === 1 && <div className="quote-step"><h3>Tell us about your space.</h3><p>The more we know, the better we can prepare.</p><label>What kind of property?<SearchSelect value={form.property_type} onChange={(value) => update('property_type', value)} options={[{ value: '', label: 'Choose one' }, { value: 'House', label: 'House' }, { value: 'Apartment', label: 'Apartment' }, { value: 'Office', label: 'Office' }, { value: 'Shop or retail space', label: 'Shop or retail space' }, { value: 'Warehouse or facility', label: 'Warehouse or facility' }, { value: 'Other', label: 'Other' }]} placeholder="Choose one" /></label><div className="field-row"><label>Approx. size or rooms<input value={form.size_note} onChange={(event) => update('size_note', event.target.value)} placeholder="e.g. 3 bedrooms" /></label><label>Area / location<input required value={form.address} onChange={(event) => update('address', event.target.value)} placeholder="e.g. Lekki Phase 1" /></label></div><label>Anything else we should know?<textarea rows="3" value={form.message} onChange={(event) => update('message', event.target.value)} placeholder="A little note about your space..." /></label></div>}
          {step === 2 && <div className="quote-step"><h3>When works for you?</h3><p>We'll confirm a time with you before anything is booked.</p><label>Preferred date<input type="date" min={new Date().toISOString().slice(0, 10)} required value={form.preferred_date} onChange={(event) => update('preferred_date', event.target.value)} /></label><span className="input-label">Preferred time</span><div className="time-choice">{['Morning', 'Afternoon', 'Flexible'].map((time) => <button type="button" key={time} onClick={() => update('preferred_time', time)} className={form.preferred_time === time ? 'time-selected' : ''}>{time}</button>)}</div></div>}
          {step === 3 && <div className="quote-step"><h3>How can we reach you?</h3><p>We'll get back to you within 24 hours.</p><label>Your full name<input autoComplete="name" required value={form.full_name} onChange={(event) => update('full_name', event.target.value)} placeholder="e.g. Johnson Ime" /></label><div className="field-row"><label>Phone number<input type="tel" autoComplete="tel" required value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="+234 809 538 9606" /></label><label>Email address <span>(optional)</span><input type="email" autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="you@example.com" /></label></div><label className="upload-field"><Image size={20} /><span><b>{form.photo?.name || 'Add a photo of your space'}</b><small>Optional · JPG, PNG or WebP · up to 5 MB</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file && file.size > 5 * 1024 * 1024) { const message = 'Photos must be under 5 MB. Choose a smaller image and try again.'; setError(message); showToast({ tone: 'error', title: 'Photo too large', message }); return } update('photo', file || null); setError('') }} /></label></div>}
          {step === 4 && <div className="quote-step"><h3>Does this look right?</h3><p>Have a final look before we send your request.</p><div className="review-card">{[['Service', serviceLabel, 0], ['Your space', `${form.property_type}${form.size_note ? ` · ${form.size_note}` : ''}`, 1], ['Area', form.address, 1], ['Preferred time', `${form.preferred_date} · ${form.preferred_time}`, 2], ['Your details', `${form.full_name} · ${form.phone}${form.email ? ` · ${form.email}` : ''}`, 3]].map(([label, value, editStep]) => <div key={label}><span><small>{label}</small><b>{value}</b></span><button type="button" className="text-link" onClick={() => setStep(editStep)}>Edit</button></div>)}</div><p className="review-note"><ShieldCheck size={16} /> This is a request, not a confirmed booking. We'll be in touch to discuss the details.</p></div>}
          {error && <p className="form-error">{error}</p>}
          <div className="quote-form-actions">{step > 0 && <button type="button" className="button button-quiet" onClick={() => { setStep(step - 1); setError('') }}><ArrowLeft size={15} /> Back</button>}<button className="button button-dark button-large" type="submit" disabled={busy}>{busy ? 'Sending…' : step === steps.length - 1 ? 'Send my request' : 'Continue'}{!busy && <ArrowRight size={16} />}</button></div>
        </form>
        <div className="quote-safe"><ShieldCheck size={14} /> Your details are only used to help us prepare your quote.</div>
      </div></div></section></PublicLayout>
}

export function QuoteSuccess() {
  const location = useLocation()
  const request = location.state || {}
  const message = [`Hi Polishers Da Elite, I just submitted a quote request.`, request.reference && `Reference: ${request.reference}`, request.full_name && `Name: ${request.full_name}`, request.service && `Service: ${request.service}`, request.address && `Area: ${request.address}`, request.preferred_date && `Preferred date: ${request.preferred_date}`, 'Could you please help me with the next steps?'].filter(Boolean).join('\n')
  return <PublicLayout><section className="success-page"><div className="success-card"><span className="success-icon"><CheckCircle2 size={37} /></span><span className="eyebrow">REQUEST RECEIVED</span><h1>Well, this is a<br /><em>good start.</em></h1><p>Your space is on our mind already. Our team will be in touch within 24 hours to talk through the details.</p><div className="reference-number"><small>YOUR REFERENCE</small><b>{request.reference || 'PDE-000000'}</b></div><a className="button button-aqua button-large" href={whatsappHref(businessWhatsAppPhone, message)} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Chat with us on WhatsApp</a><Link to="/" className="success-home">Back to home <ArrowRight size={14} /></Link></div></section></PublicLayout>
}

export function NotFound() {
  return <section className="not-found"><span className="eyebrow">A LITTLE DETOUR</span><h1>This page seems<br /><em>to need a tidy-up.</em></h1><Link to="/" className="button button-dark">Back to home <ArrowUpRight size={15} /></Link></section>
}

function PolicyPage({ eyebrow, title, description, children }) {
  return <PublicLayout><PageHero eyebrow={eyebrow} title={title} copy={description} image={services[0].image} /><section className="policy-section"><div className="container policy-content">{children}</div></section></PublicLayout>
}

export function PrivacyPolicyPage() {
  return <PolicyPage eyebrow="YOUR INFORMATION, RESPECTED" title="Privacy policy" description="How Polishers Da Elite collects, uses, and protects information shared through this website.">
    <p className="policy-updated">Last updated: 6 November 2026</p>
    <h2>Information we collect</h2><p>When you request a quote or contact us, we collect the details you provide, such as your name, phone number, email address, service and property details, preferred date, message, and any photos you choose to upload. If you subscribe to the newsletter, we collect your email address and subscription status.</p>
    <h2>How we use your information</h2><ul><li>To respond to enquiries, prepare quotes, and provide requested cleaning services.</li><li>To send newsletter updates when you subscribe. You can unsubscribe from any newsletter email.</li><li>To operate, secure, and improve this website and our customer service.</li></ul>
    <h2>Service providers and storage</h2><p>We use Supabase to securely store service requests, uploaded request photos, and website content. Newsletter subscribers and campaign delivery are managed through Resend. These providers process information only to provide their services to us and under their applicable privacy and security terms. Request photos are stored privately and are only available to authorized administrators.</p>
    <h2>Retention and your choices</h2><p>We keep enquiry and service records for as long as needed to respond, provide services, and meet legitimate record-keeping requirements. Newsletter details are retained until you unsubscribe or ask us to remove them. You may request access, correction, or deletion of your personal information, or withdraw newsletter consent, by contacting us.</p>
    <h2>Browser storage</h2><p>We use session storage in your browser to remember that you have dismissed the newsletter signup prompt during the current browsing session. This setting does not identify you or track activity across other websites.</p>
    <h2>Security and sharing</h2><p>We apply access controls to administrative records and do not sell personal information. No online storage or transmission method can be guaranteed completely secure, but we work to protect information from unauthorized access and use.</p>
    <h2>Contact</h2><p>For privacy questions or requests, email <a href="mailto:polishersdaelit@gmail.com">polishersdaelit@gmail.com</a> or call <a href="tel:+2348095389606">+234 809 538 9606</a>.</p>
  </PolicyPage>
}

export function TermsPage() {
  return <PolicyPage eyebrow="CLEAR EXPECTATIONS" title="Website & system policy" description="The terms and acceptable-use expectations for this website, quote requests, and email updates.">
    <p className="policy-updated">Last updated: 6 November 2026</p>
    <h2>Quote requests and bookings</h2><p>Submitting a quote form or contacting us is a request for information, not a confirmed booking or a final price. We will review the details, confirm service availability, and agree the scope, price, and schedule with you before work is booked.</p>
    <h2>Accurate information</h2><p>Please provide accurate contact and property information. You confirm that you have permission to share any photos you upload and that they do not contain material you are not authorized to provide.</p>
    <h2>Newsletter updates</h2><p>Newsletter subscription is optional. We use your email to send occasional company and cleaning-service updates. You can unsubscribe using the link in any newsletter email.</p>
    <h2>Website content</h2><p>Website copy, photographs, logos, and other materials belong to Polishers Da Elite or their respective rights holders. Please do not reproduce or use them commercially without permission. We may update website content and these terms as our services change.</p>
    <h2>Service availability</h2><p>Services depend on location, availability, and the details agreed with you. Any booking changes or cancellations should be discussed directly with our team.</p>
    <h2>Contact</h2><p>Questions about these terms? Contact <a href="mailto:polishersdaelit@gmail.com">polishersdaelit@gmail.com</a> or call <a href="tel:+2348095389606">+234 809 538 9606</a>.</p>
  </PolicyPage>
}
