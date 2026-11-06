import { useLayoutEffect } from 'react'
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
