import { useEffect, useLayoutEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AdminLayout from './components/layout/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import AdminLogin from './pages/admin/AdminLogin'
import Requests from './pages/admin/Requests'
import Notifications from './pages/admin/Notifications'
import NewsletterAdmin from './pages/admin/NewsletterAdmin'
import { ContentPage, TeamPage } from './pages/admin/WorkspacePages'
import {
  AboutPage,
  ContactPage,
  GalleryPage,
  HomePage,
  NotFound,
  PrivacyPolicyPage,
  QuotePage,
  QuoteSuccess,
  ServiceDetail,
  ServicesPage,
  TermsPage,
} from './pages/public/Pages'
import { services } from './data'

const canonicalOrigin = 'https://www.polishersdaelit.com.ng'
const pageMetadata = {
  '/': { title: 'Professional Cleaning Services in Lagos | Polishers Da Elite', description: 'Premium residential, commercial, industrial and post-construction cleaning across Lagos. Request a free quote from Polishers Da Elite.' },
  '/services': { title: 'Cleaning Services in Lagos | Polishers Da Elite', description: 'Explore residential, commercial, industrial and post-construction cleaning services from Polishers Da Elite in Lagos.' },
  '/gallery': { title: 'Our Cleaning Work | Polishers Da Elite', description: 'See recent residential, commercial and industrial cleaning work by the Polishers Da Elite team in Lagos.' },
  '/about': { title: 'About Us | Polishers Da Elite', description: 'Learn about Polishers Da Elite and our professional cleaning team serving homes and businesses across Lagos.' },
  '/contact': { title: 'Contact Polishers Da Elite | Cleaning in Lagos', description: 'Contact Polishers Da Elite to discuss cleaning services, availability and a free quote in Lagos.' },
  '/privacy': { title: 'Privacy Policy | Polishers Da Elite', description: 'Read the Polishers Da Elite privacy policy and learn how we handle information submitted through our website.' },
  '/terms': { title: 'Terms of Service | Polishers Da Elite', description: 'Review the terms for using the Polishers Da Elite website and requesting cleaning services.' },
}

function setMeta(attribute, name, content) {
  let element = document.head.querySelector(`meta[${attribute}="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, name)
    document.head.append(element)
  }
  element.setAttribute('content', content)
}

function RouteSeo() {
  const location = useLocation()

  useEffect(() => {
    const path = location.pathname.replace(/\/+$/, '') || '/'
    const service = path.startsWith('/services/')
      ? services.find((item) => item.slug === path.slice('/services/'.length))
      : null
    const metadata = service
      ? { title: `${service.title} Cleaning in Lagos | Polishers Da Elite`, description: service.description }
      : pageMetadata[path]
    const isPrivate = path.startsWith('/admin') || path.startsWith('/quote') || !metadata
    const title = metadata?.title || 'Page Not Found | Polishers Da Elite'
    const description = metadata?.description || 'The page you requested could not be found.'

    document.title = title
    setMeta('name', 'description', description)
    setMeta('name', 'robots', isPrivate ? 'noindex, nofollow' : 'index, follow')
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', `${canonicalOrigin}${path}`)
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)

    let canonical = document.head.querySelector('link[rel="canonical"]')
    if (!isPrivate) {
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.rel = 'canonical'
        document.head.append(canonical)
      }
      canonical.href = `${canonicalOrigin}${path}`
    } else {
      canonical?.remove()
    }
  }, [location.pathname])

  return null
}

function ScrollToHash() {
  const location = useLocation()

  useLayoutEffect(() => {
    const hash = location.hash.slice(1)
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      return
    }

    const target = document.getElementById(hash) || document.querySelector(`[data-section="${hash}"]`)
    if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' })
    else window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [location.key, location.pathname, location.hash])

  return null
}

export default function App() {
  return (
    <>
      <RouteSeo />
      <ScrollToHash />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/services/:slug" element={<ServiceDetail />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/quote" element={<QuotePage />} />
        <Route path="/quote/success" element={<QuoteSuccess />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="requests" element={<Requests />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="newsletter" element={<NewsletterAdmin />} />
          <Route path="content" element={<ContentPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="settings" element={<Navigate to="/admin" replace />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
