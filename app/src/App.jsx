import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AdminLayout from './components/layout/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import AdminLogin from './pages/admin/AdminLogin'
import Requests from './pages/admin/Requests'
import { ContentPage, TeamPage } from './pages/admin/WorkspacePages'
import {
  AboutPage,
  ContactPage,
  GalleryPage,
  HomePage,
  NotFound,
  QuotePage,
  QuoteSuccess,
  ServiceDetail,
  ServicesPage,
} from './pages/public/Pages'

function ScrollToHash() {
  const location = useLocation()

  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      return
    }

    const target = document.getElementById(hash) || document.querySelector(`[data-section="${hash}"]`)
    if (!target) return

    window.setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 40)
  }, [location.pathname, location.hash])

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
        <Route path="/quote" element={<QuotePage />} />
        <Route path="/quote/success" element={<QuoteSuccess />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="requests" element={<Requests />} />
          <Route path="content" element={<ContentPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="settings" element={<Navigate to="/admin" replace />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
