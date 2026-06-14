# AgroFinance AI - GitHub Pages Deployment Helper
# ------------------------------------------------
Write-Host "🚀 Iniciando preparación de compilación para GitHub Pages..." -ForegroundColor Green

# 1. Limpiar carpetas temporales
if (Test-Path -Path "out") { Remove-Item -Recurse -Force out }

# 2. Configurar la ruta base para GitHub Pages (repositorio: AgroFinance-main)
$env:NEXT_PUBLIC_BASE_PATH = "/AgroFinance-main"

# 3. Compilar el proyecto Next.js
Write-Host "📦 Compilando aplicación estática..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en la compilación de Next.js." -ForegroundColor Red
    Exit $LASTEXITCODE
}

# 4. Copiar los archivos a la carpeta 'docs'
Write-Host "📂 Copiando archivos a la carpeta 'docs'..." -ForegroundColor Cyan
if (!(Test-Path -Path "docs")) {
    New-Item -ItemType Directory -Path "docs" -Force | Out-Null
}
Copy-Item -Path "out\*" -Destination "docs" -Recurse -Force

# 5. Crear el archivo .nojekyll (crítico para que GitHub sirva carpetas que inicien con guión bajo como _next)
New-Item -ItemType File -Path "docs\.nojekyll" -Force | Out-Null

Write-Host "✅ Proceso completado exitosamente." -ForegroundColor Green
Write-Host "👉 Ahora puedes subir los cambios a GitHub (git add docs/; git commit -m 'Deploy a github pages'; git push)" -ForegroundColor Yellow
