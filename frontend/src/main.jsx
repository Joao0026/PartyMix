import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { api } from './utils/api'
import './index.css'

const queryClient = new QueryClient()

window.addEventListener('error', (event) => {
  api.observe({ type: 'client_error', message: String(event?.message || 'erro').slice(0, 180) })
})
window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason
  const message = typeof reason === 'string' ? reason : reason?.message
  api.observe({ type: 'client_error', message: String(message || 'erro').slice(0, 180) })
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
