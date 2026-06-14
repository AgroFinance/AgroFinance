import type { Metadata, Viewport } from 'next'
import './globals.css'
import OnboardingTour from '@/components/mascot/OnboardingTour'

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
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌱</text></svg>" />
      </head>
      <body className="antialiased">
        {children}
        <OnboardingTour />
      </body>
    </html>
  )
}

