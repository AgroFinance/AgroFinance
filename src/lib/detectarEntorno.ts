// Detecta navegador + sistema operativo real a partir del user agent —
// clave para diferenciar "falla en Mac/Safari" de "falla en todos lados"
// sin adivinar por el nombre del navegador (en iOS, Chrome/Firefox son
// WebKit por debajo igual que Safari — la restricción real depende del
// DISPOSITIVO, no del navegador que dice ser en el UA).
export function detectarEntorno(): string {
  if (typeof navigator === 'undefined') return 'entorno desconocido'
  const ua = navigator.userAgent
  const esSafari = /^((?!chrome|android).)*safari/i.test(ua)
  const esMac = /Macintosh|Mac OS X/i.test(ua)
  const esIOS = /iPhone|iPad|iPod/i.test(ua)
  const navegador = esSafari ? 'Safari' : /Chrome/i.test(ua) ? 'Chrome' : /Firefox/i.test(ua) ? 'Firefox' : /Edg/i.test(ua) ? 'Edge' : 'navegador desconocido'
  const so = esIOS ? 'iOS' : esMac ? 'macOS' : /Windows/i.test(ua) ? 'Windows' : /Android/i.test(ua) ? 'Android' : /Linux/i.test(ua) ? 'Linux' : 'SO desconocido'
  return `${navegador} en ${so}`
}

export function esMacODispositivoIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Macintosh|Mac OS X|iPhone|iPad|iPod/i.test(navigator.userAgent)
}
