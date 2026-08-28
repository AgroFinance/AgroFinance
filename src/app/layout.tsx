import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import './globals.css'
import OnboardingTour from '@/shared/components/OnboardingTour'
import KapiBubble from '@/modules/kapi-copilot/infrastructure/ui/KapiBubble'
import CopilotDrawer from '@/modules/kapi-copilot/infrastructure/ui/CopilotDrawer'
import { AuthProvider } from '@/core/providers/AuthContext'
import { ChatProvider } from '@/core/providers/ChatContext'
import { ThemeProvider } from '@/core/providers/ThemeContext'
import { AnalyticsProvider } from '@/core/providers/AnalyticsProvider'
import ErrorOverlay from '@/core/providers/ErrorOverlay'

export const metadata: Metadata = {
  title: 'AgroFinance AI — Climate Intelligence para Agroexportadoras',
  description: 'Plataforma de inteligencia climática con IA para automatizar tu huella de carbono, Scope 1/2/3, y cumplimiento ESG en minutos.',
  keywords: ['huella de carbono', 'ESG', 'agroexportadoras', 'Scope 3', 'HC Perú', 'climate finance', 'sustainability'],
  authors: [{ name: 'AgroFinance AI' }],
  creator: 'AgroFinance AI',
  openGraph: {
    title: 'AgroFinance AI — Climate Intelligence',
    description: 'Automatiza tu huella de carbono con IA.',
    type: 'website',
    locale: 'es_PE',
  },
}

export const viewport: Viewport = {
  themeColor: '#FBF4D6',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        {/* GitHub Pages SPA redirect: restaura la ruta codificada por 404.html */}
        <script dangerouslySetInnerHTML={{ __html: `(function(l){if(l.search[1]==='/'){var d=l.search.slice(1).split('&').map(function(s){return s.replace(/~and~/g,'&')}).join('?');window.history.replaceState(null,null,l.pathname.slice(0,-1)+d+l.hash)}}(window.location))` }} />
        {/* Aplica el tema guardado ANTES de hidratar — sin esto, la página
            siempre pinta en claro primero y "parpadea" a oscuro un instante
            después para quien tiene oscuro guardado. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{if(localStorage.getItem('agrofinance_tema')==='oscuro')document.documentElement.classList.add('dark')}catch(e){}}())` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌱</text></svg>" />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            <ChatProvider>
              <Suspense fallback={null}>
                <AnalyticsProvider>
                  {children}
                  <OnboardingTour />
                  <KapiBubble />
                  <CopilotDrawer />
                  <ErrorOverlay />
                </AnalyticsProvider>
              </Suspense>
            </ChatProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

