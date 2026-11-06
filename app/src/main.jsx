import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ToastProvider } from './components/ui/ToastProvider.jsx'
import { SiteContentProvider } from './components/ui/SiteContentProvider.jsx'
import './styles/global.css'
import './styles/admin.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ToastProvider>
        <SiteContentProvider>
          <App />
        </SiteContentProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
