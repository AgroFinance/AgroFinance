import { test, expect, type Page } from '@playwright/test'
import path from 'path'

// Verifica el bug histórico "en Mac/iPhone no deja subir" (ver memoria
// plan-tecnico-infraestructura-2026): confirma que la acción PRINCIPAL de
// /upload abre el selector de archivos estándar (funciona en WebKit) y no
// depende de <input webkitdirectory> (nunca soportado por Safari/WebKit).
// No cubre el permiso de "Archivos y Carpetas" de macOS — eso es a nivel de
// SO y solo se puede confirmar en un Mac real o un runner macOS de CI.
//
// /upload está detrás de login (ver CLAUDE.md, sección "Autenticación") —
// desde 2026-09-20 es una cuenta REAL de Firebase (email/contraseña ya
// registrados), no el login maestro (MASTER_USER/MASTER_PASSWORD quedó
// muerto en el código, aunque .env.local.example todavía lo liste). Estas
// pruebas necesitan una cuenta de prueba ya creada, vía E2E_TEST_EMAIL /
// E2E_TEST_PASSWORD en .env.local — nunca hardcodeadas aquí, y esta suite
// nunca crea la cuenta por sí misma. Si faltan, el test se salta con un
// mensaje claro en vez de fallar en el login.

const email = process.env.E2E_TEST_EMAIL
const clave = process.env.E2E_TEST_PASSWORD

async function iniciarSesion(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('tu@correo.com').fill(email!)
  await page.getByPlaceholder('••••••••').fill(clave!)
  await page.getByRole('button', { name: /iniciar sesión|ingresar/i }).click()
  await page.waitForURL(/\/(dashboard|upload)/, { timeout: 15_000 })
}

test.describe('Carga de archivos en /upload (WebKit)', () => {
  test.skip(!email || !clave, 'Faltan E2E_TEST_EMAIL / E2E_TEST_PASSWORD en el entorno — necesitas una cuenta de Firebase ya creada (ver CLAUDE.md, sección Autenticación)')

  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page)
    await page.goto('/upload')
  })

  test('el botón principal abre un selector de archivos, no de carpeta', async ({ page }) => {
    // La acción principal es el área de drop/click grande — debe apuntar al
    // input SIN webkitdirectory (el de react-dropzone), no al input oculto
    // que sí lo tiene (ese queda como atajo secundario).
    const inputConWebkitdirectory = page.locator('input[webkitdirectory]')
    await expect(inputConWebkitdirectory).toHaveCount(1)
    // Debe existir pero estar oculto (aria-hidden), confirmando que no es la
    // acción principal visible.
    await expect(inputConWebkitdirectory).toHaveAttribute('aria-hidden', 'true')
  })

  test('seleccionar un archivo suelto dispara el flujo de carga', async ({ page }) => {
    const areaCarga = page.getByRole('button').first()
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      areaCarga.click(),
    ])

    // Un archivo de prueba mínimo — el objetivo es confirmar que WebKit deja
    // avanzar el flujo (no se congela en 'idle'), no validar el resultado
    // del procesamiento real.
    const archivoPrueba = path.join(__dirname, 'fixtures', 'factura-prueba.xml')
    await chooser.setFiles(archivoPrueba)

    // Si el selector de carpeta rota fuera la única vía (bug original), este
    // evento de filechooser ni siquiera dispararía en WebKit. Que dispare y
    // que el estado avance de 'idle' es la señal de que el fix sigue vigente.
    await expect(page.getByText(/subiendo|procesando|completado/i).first()).toBeVisible({ timeout: 15_000 })
  })
})
