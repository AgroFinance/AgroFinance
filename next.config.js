const path = require('path')
const os = require('os')

// Sin `output: 'export'`: el export estático no sirve API routes (/api/chat),
// que es donde vive Kapi. Desplegamos en Vercel para que corra en servidor y
// la GEMINI_API_KEY nunca llegue al navegador.
const nextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
