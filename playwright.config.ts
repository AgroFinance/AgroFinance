import { defineConfig, devices } from '@playwright/test'

// Pruebas contra el motor WebKit real (el mismo que usa Safari en macOS/iOS,
// ya que Apple obliga a que TODO navegador en iOS use WebKit por debajo —
// Chrome/Firefox de iPhone tienen la misma restricción aunque su UA diga
// "CriOS"/"FxiOS"). Esto no reemplaza probar en un Mac/iPhone real: no
// reproduce el permiso de "Archivos y Carpetas" que exige macOS a nivel de
// sistema operativo (ver memoria plan-tecnico-infraestructura-2026), pero sí
// detecta bugs de API no soportada por WebKit (como `webkitdirectory`, la
// causa raíz ya encontrada y corregida) sin depender de un dispositivo real.
//
// baseURL apunta al deploy de Vercel por defecto porque el objetivo es
// verificar el problema reportado ahí mismo, no el dev server local — se
// puede sobreescribir con PLAYWRIGHT_BASE_URL para probar contra localhost.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://agrofinance-produccion.vercel.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'webkit-iphone',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'webkit-ipad',
      use: { ...devices['iPad Pro 11'] },
    },
  ],
})
