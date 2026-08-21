import fs from 'node:fs'
import path from 'node:path'
import ReferenceLandingShell from '@/shared/components/landing/ReferenceLandingShell'

export default function HomePage() {
  const filePath = path.join(process.cwd(), 'public', 'reference-landing.html')
  const raw = fs.readFileSync(filePath, 'utf8')

  const styleMatch = raw.match(/<style>([\s\S]*?)<\/style>/)
  const scriptMatch = raw.match(/<script>([\s\S]*?)<\/script>/)
  const styleCss = styleMatch ? styleMatch[1] : ''
  const scriptJs = scriptMatch ? scriptMatch[1] : ''

  const bodyHtml = raw
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<style>[\s\S]*?<\/style>/, '')
    .replace(/<script>[\s\S]*?<\/script>/, '')
    .trim()

  return <ReferenceLandingShell styleCss={styleCss} bodyHtml={bodyHtml} scriptJs={scriptJs} />
}
