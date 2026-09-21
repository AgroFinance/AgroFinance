#!/usr/bin/env node
// ============================================================
// Arranque robusto de los emuladores de Firebase (local)
// ------------------------------------------------------------
// Por qué existe este script:
//
// `firebase emulators:start` a mano, en esta máquina, falla de formas
// distintas y silenciosas cada vez que hay carga (varios `next dev` /
// MCPs corriendo a la vez):
//   1. Puerto ocupado por un proceso viejo que no murió bien.
//   2. El emulador de Functions no llega a cargar `procesar_sesion` a
//      tiempo ("Cannot determine backend specification. Timeout after
//      10000") — arranca "listo" pero sin la función escuchando, así que
//      las sesiones se quedan en 'pendiente' para siempre sin ningún error
//      visible en la UI.
//   3. El proceso se cuelga arrancando y nunca imprime nada.
//
// Este script en vez de arrancar una vez y esperar lo mejor:
//   1. Mata cualquier proceso viejo en los puertos que usa el emulador.
//   2. Arranca `firebase emulators:start` y lee su salida en vivo.
//   3. Solo lo da por bueno si ve TANTO "All emulators ready" COMO
//      "firestore function initialized" (procesar_sesion cargó de
//      verdad) — si no ve la segunda línea en el margen de tiempo, lo
//      mata y reintenta, hasta REINTENTOS veces.
//   4. Si usa --import (con datos guardados de una sesión anterior con
//      --export-on-exit), lo indica.
//
// Uso:
//   npm run emuladores           # mata restos, arranca, verifica, reintenta solo
//   npm run emuladores -- --sin-import   # ignora ./emulator-data aunque exista
// ============================================================

import { spawn, execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const esWin = process.platform === 'win32'
const args = process.argv.slice(2)
const sinImport = args.includes('--sin-import')

const PUERTOS = [4000, 4400, 4500, 5001, 8080, 9099, 9150, 9199]
const REINTENTOS = 3
const TIMEOUT_LISTO_MS = 60_000 // margen para que Functions cargue, con la máquina bajo carga
const DIR_EXPORT = path.join(RAIZ, 'emulator-data')

function matarProcesosViejos() {
  if (!esWin) return
  try {
    const ps = `
      Get-CimInstance Win32_Process | Where-Object {
        $_.Name -in @('node.exe','java.exe') -and (
          $_.CommandLine -match 'emulators:start' -or
          $_.CommandLine -match 'cloud-firestore-emulator' -or
          $_.CommandLine -match 'firebase-tools'
        )
      } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    `.trim()
    execSync(`powershell -NoProfile -Command "${ps.replace(/"/g, '\\"')}"`, { stdio: 'ignore' })
  } catch { /* no había nada que matar, o powershell no disponible — no es fatal */ }
}

function intentar(numero) {
  return new Promise((resolve) => {
    console.log(`\n>> Intento ${numero}/${REINTENTOS}: limpiando puertos ${PUERTOS.join(', ')}…`)
    matarProcesosViejos()

    const conImport = !sinImport && existsSync(DIR_EXPORT)
    const argv = [
      'emulators:start', '--only', 'firestore,storage,functions,auth',
      `--export-on-exit=${DIR_EXPORT}`,
    ]
    if (conImport) argv.push(`--import=${DIR_EXPORT}`)
    console.log(`>> firebase ${argv.join(' ')}${conImport ? '  (con datos guardados de la sesión anterior)' : '  (arranca en blanco)'}\n`)

    const proc = spawn(esWin ? 'firebase.cmd' : 'firebase', argv, {
      cwd: RAIZ, shell: esWin,
      env: {
        ...process.env,
        PATH: `${process.env.HOME || process.env.USERPROFILE}/scoop/apps/temurin21-jre/current/bin${path.delimiter}${process.env.PATH}`,
      },
    })

    let listo = false
    let funcionesOk = false
    let salida = ''

    const revisar = (buf) => {
      const texto = buf.toString()
      salida += texto
      process.stdout.write(texto)
      if (texto.includes('firestore function initialized')) funcionesOk = true
      if (texto.includes('All emulators ready')) listo = true
      if (listo && funcionesOk) {
        clearTimeout(temporizador)
        console.log('\n>> Emuladores listos Y Cloud Function procesar_sesion cargada. Todo en orden.\n')
        resolve({ ok: true, proc })
      }
      if (/Fatal error|Could not start Emulator UI|port taken/.test(texto)) {
        clearTimeout(temporizador)
        proc.kill()
        resolve({ ok: false, motivo: 'crash/puerto ocupado' })
      }
    }
    proc.stdout.on('data', revisar)
    proc.stderr.on('data', revisar)

    const temporizador = setTimeout(() => {
      proc.kill()
      const motivo = listo && !funcionesOk
        ? 'arrancó pero Functions nunca cargó procesar_sesion a tiempo'
        : 'nunca terminó de arrancar (colgado)'
      resolve({ ok: false, motivo })
    }, TIMEOUT_LISTO_MS)

    proc.on('exit', (code) => {
      if (!listo || !funcionesOk) {
        clearTimeout(temporizador)
        resolve({ ok: false, motivo: `el proceso salió solo (código ${code})` })
      }
    })
  })
}

async function main() {
  for (let i = 1; i <= REINTENTOS; i++) {
    const resultado = await intentar(i)
    if (resultado.ok) {
      // Deja el proceso corriendo en foreground — Ctrl+C lo cierra normal
      // (y dispara --export-on-exit).
      await new Promise((r) => resultado.proc.on('exit', r))
      return
    }
    console.log(`\n!! Intento ${i} falló: ${resultado.motivo}.`)
    if (i < REINTENTOS) console.log('   Reintentando…')
  }
  console.error(`\nNo se pudo levantar el emulador tras ${REINTENTOS} intentos. Revisa si hay algo más consumiendo mucha CPU/RAM en la máquina — Functions necesita margen para inicializar.`)
  process.exit(1)
}

main()
