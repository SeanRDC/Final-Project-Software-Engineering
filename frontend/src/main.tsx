import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import App from '@/App'
import { AuthProvider } from '@/auth/AuthProvider'
import { LiveProvider } from '@/live/LiveProvider'
import { Toaster } from '@/components/ui/sonner'
import { createQueryClient } from '@/lib/queryClient'

import './index.css'

const queryClient = createQueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LiveProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </LiveProvider>
        <Toaster position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
