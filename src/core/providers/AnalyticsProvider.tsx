'use client'

// ============================================================
// AgroFinance — Analítica de uso (Firebase Analytics / GA4)
// ------------------------------------------------------------
// Firebase Analytics ya estaba configurado (MEASUREMENT_ID en las env
// vars, getFirebaseAnalytics() ya escrito) pero nadie lo llamaba — GA4
// nunca se inicializaba, así que no se registraba ni una sola vista de
// página ni un solo click. Este provider hace 3 cosas:
//
//   1. Inicializa Analytics una vez, al montar la app.
//   2. Registra un evento `page_view` en cada navegación — Next.js App
//      Router es un SPA: sin esto, GA solo ve la primera carga y nunca
//      se entera de que alguien navegó a /dashboard, /reportes, etc.
//   3. Escucha CADA click en la app (captura en el document, sin tocar
//      un componente por uno) y manda un evento `click` con la etiqueta
//      del elemento (texto visible o aria-label) y la ruta donde pasó —
//      así en GA4 (Informes → Interacción → Eventos) se ve qué botones
//      y vistas usa más la gente, sin construir un panel propio.
//
// Solo mide interacción con la interfaz — nunca datos de huella, montos
// de crédito, ni nada del negocio del cliente.
// ============================================================

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { logEvent, type Analytics } from 'firebase/analytics'
import { getFirebaseAnalytics } from '@/core/config/firebase.client'

let analyticsPromise: Promise<Analytics | null> | null = null
function analyticsInstance() {
  if (!analyticsPromise) analyticsPromise = getFirebaseAnalytics()
  return analyticsPromise
}

/** Texto legible más cercano al elemento clickeado, para que el evento
 *  diga QUÉ se tocó ("Exportar reporte PDF") y no solo la etiqueta HTML. */
function etiquetaDe(el: Element | null): string {
  let n: Element | null = el
  for (let i = 0; i < 4 && n; i++, n = n.parentElement) {
    const aria = n.getAttribute?.('aria-label')
    if (aria) return aria.trim().slice(0, 80)
    const titulo = n.getAttribute?.('title')
    if (titulo) return titulo.trim().slice(0, 80)
    if (n.tagName === 'BUTTON' || n.tagName === 'A') {
      const texto = n.textContent?.trim()
      if (texto) return texto.slice(0, 80)
    }
  }
  return (el as HTMLElement)?.tagName?.toLowerCase() || 'desconocido'
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Vista de página — cada navegación SPA cuenta como una.
  useEffect(() => {
    analyticsInstance().then((analytics) => {
      if (!analytics) return
      const query = searchParams.toString()
      logEvent(analytics, 'page_view', {
        page_path: query ? `${pathname}?${query}` : pathname,
        page_location: typeof window !== 'undefined' ? window.location.href : undefined,
      })
    })
  }, [pathname, searchParams])

  // Click global — un solo listener para toda la app, sin instrumentar
  // botón por botón.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null
      const interactivo = target?.closest('button, a, [role="button"], input[type="submit"]')
      if (!interactivo) return
      analyticsInstance().then((analytics) => {
        if (!analytics) return
        logEvent(analytics, 'click', {
          label: etiquetaDe(interactivo),
          tag: interactivo.tagName.toLowerCase(),
          page_path: window.location.pathname,
        })
      })
    }
    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [])

  return <>{children}</>
}
