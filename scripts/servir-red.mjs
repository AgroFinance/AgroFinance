#!/usr/bin/env node
// ============================================================
// Servir AgroFinance en la red local (y opcionalmente por túnel)
// ------------------------------------------------------------
// Por qué existe este script:
//
// La red corporativa bloquea las IPs de Vercel (el DNS resuelve
// agrofinance-produccion.vercel.app -> 64.29.17.195 / 216.198.79.195,
// pero el puerto 443 nunca abre: la conexión expira). Desde adentro de
// la oficina el despliegue de Vercel simplemente no es alcanzable, y eso
// se ve como "el login no hace nada": la página nunca carga o las
// llamadas a /api/login quedan colgadas.
//
// Este script levanta la MISMA app (build de producción, no `next dev`)
// en esta máquina y la publica:
//
//   1. En la LAN, escuchando en 0.0.0.0 -> http://<IP-de-esta-PC>:3000
//      Cualquiera en la misma red entra sin pasar por Vercel.
//
//   2. Opcional, con --tunel: además abre un túnel de Cloudflare y da
//      una URL pública https://algo.trycloudflare.com que sale por una
//      conexión de salida (no por las IPs bloqueadas de Vercel), útil
//      para quien esté fuera de la oficina.
//
// Uso:
//   npm run red            # solo LAN
//   npm run red:tunel      # LAN + URL pública por túnel
//   npm run red -- --puerto 4000 --sin-build
// ============================================================

import { spawn } from 'node:child_process'
import { networkInterfaces } from 'node:os'
import { existsSync } from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const tieneFlag = (f) => args.includes(f)
const valorFlag = (f, porDefecto) => {
  const i = args.indexOf(f)
  return i !== -1 && args[i + 1] ? args[i + 1] : porDefecto
}

const PUERTO = valorFlag('--puerto', process.env.PORT || '3000')
const CON_TUNEL = tieneFlag('--tunel')
const SIN_BUILD = tieneFlag('--sin-build')
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')

const esWin = process.platform === 'win32'
const npx = esWin ? 'npx.cmd' : 'npx'

function ipsLan() {
  const salida = []
  for (const [nombre, addrs] of Object.entries(networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) salida.push({ nombre, ip: a.address })
    }
  }
  return salida
}

function correr(cmd, argv, opciones = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, argv, { cwd: RAIZ, stdio: 'inherit', shell: esWin, ...opciones })
    p.on('error', reject)
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} salió con código ${code}`))))
  })
}

async function main() {
  if (!existsSync(path.join(RAIZ, '.env.local'))) {
    console.warn(
      '\n  AVISO: no hay .env.local en la raíz. Sin él, Firebase arranca con\n' +
      '  claves de relleno ("YOUR_API_KEY") y crear cuenta falla con\n' +
      '  auth/api-key-not-valid. Copia .env.local.example a .env.local\n' +
      '  o corre `npx vercel env pull .env.local`.\n',
    )
  }

  if (!SIN_BUILD) {
    console.log('\n>> Compilando la app (next build)…\n')
    await correr(esWin ? 'npm.cmd' : 'npm', ['run', 'build'])
  }

  console.log('\n>> Levantando el servidor en 0.0.0.0:' + PUERTO + '…\n')
  const servidor = spawn(
    esWin ? 'npx.cmd' : 'npx',
    ['next', 'start', '-H', '0.0.0.0', '-p', String(PUERTO)],
    { cwd: RAIZ, stdio: 'inherit', shell: esWin },
  )

  const lan = ipsLan()
  setTimeout(() => {
    console.log('\n============================================================')
    console.log(' AgroFinance corriendo fuera de Vercel')
    console.log('============================================================')
    console.log(`  En esta PC:      http://localhost:${PUERTO}/`)
    for (const { nombre, ip } of lan) {
      console.log(`  En la red (${nombre}): http://${ip}:${PUERTO}/`)
    }
    console.log('\n  Si nadie más en la red puede abrirlo, es el Firewall de')
    console.log('  Windows. Abre el puerto una sola vez, en PowerShell como')
    console.log('  administrador:')
    console.log(`    New-NetFirewallRule -DisplayName "AgroFinance ${PUERTO}" -Direction Inbound -Protocol TCP -LocalPort ${PUERTO} -Action Allow`)
    console.log('============================================================\n')
  }, 2500)

  let tunel = null
  if (CON_TUNEL) {
    console.log('\n>> Abriendo túnel de Cloudflare (descarga cloudflared la 1ª vez)…\n')
    tunel = spawn(npx, ['-y', 'cloudflared', 'tunnel', '--url', `http://localhost:${PUERTO}`], {
      cwd: RAIZ, shell: esWin,
    })
    const mirar = (buf) => {
      const texto = buf.toString()
      process.stderr.write(texto)
      const m = texto.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
      if (m) {
        const host = m[0].replace('https://', '')
        console.log('\n============================================================')
        console.log(`  URL pública por túnel:  ${m[0]}/`)
        console.log('')
        console.log('  IMPORTANTE — para que el login con Google funcione en esa')
        console.log('  URL, agrega este dominio a Firebase:')
        console.log('    Firebase Console → Authentication → Settings →')
        console.log('    Authorized domains → Add domain →')
        console.log(`    ${host}`)
        console.log('')
        console.log('  (Crear cuenta con correo/contraseña funciona sin esto;')
        console.log('   el dominio autorizado solo lo exige el popup de Google.)')
        console.log('  Ojo: la URL cambia cada vez que reinicias el túnel.')
        console.log('============================================================\n')
      }
    }
    tunel.stdout.on('data', mirar)
    tunel.stderr.on('data', mirar)
  }

  const cerrar = () => {
    servidor.kill()
    if (tunel) tunel.kill()
    process.exit(0)
  }
  process.on('SIGINT', cerrar)
  process.on('SIGTERM', cerrar)
  servidor.on('exit', (code) => {
    if (tunel) tunel.kill()
    process.exit(code ?? 0)
  })
}

main().catch((e) => {
  console.error('\nError:', e.message)
  process.exit(1)
})
