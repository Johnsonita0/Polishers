import { Navigate, Route, Routes } from 'react-router-dom'
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

export default function App() {
  return (
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
  )
}
