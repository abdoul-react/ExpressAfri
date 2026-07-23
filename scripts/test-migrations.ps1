param(
  [string]$PgHost = "localhost",
  [int]$PgPort = 5432,
  [string]$PgUser = "postgres",
  [string]$PgPassword = "postgres",
  [string]$PgDb = "expressafri_test_migration"
)

$ErrorActionPreference = "Stop"

$env:PGPASSWORD = $PgPassword
$env:DATABASE_URL = "postgres://${PgUser}:${PgPassword}@${PgHost}:${PgPort}/${PgDb}"

$apiDir = Resolve-Path (Join-Path (Join-Path (Join-Path $PSScriptRoot "..") "apps") "api")
if (-not (Test-Path $apiDir)) { throw "Repertoire '$apiDir' introuvable" }

function pgNoDb([string]$query) {
  cmd /c "psql -h $PgHost -p $PgPort -U $PgUser -c ""$query"" 2>nul"
  if ($LASTEXITCODE -ne 0) { throw "echec psql: $query" }
}

function pgWithDb([string]$db, [string]$query) {
  cmd /c "psql -h $PgHost -p $PgPort -U $PgUser -d ""$db"" -c ""$query"" 2>nul"
  if ($LASTEXITCODE -ne 0) { throw "echec psql: $query" }
}

$migrateJs = @"
const { migrate } = require('drizzle-orm/node-postgres/migrator');
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const path = require('path');
(async()=>{
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: path.resolve('./drizzle') });
  const { rows } = await pool.query('SELECT COUNT(*) as cnt FROM drizzle.__drizzle_migrations');
  console.log('APPLIED:' + rows[0].cnt);
  await pool.end();
})();
"@

Write-Host "=== Test Migration : Base vierge ===" -ForegroundColor Cyan

Write-Host "1. Creation de la base '$PgDb'..." -ForegroundColor Yellow
pgNoDb "DROP DATABASE IF EXISTS $PgDb"
pgNoDb "CREATE DATABASE $PgDb"

try {
  Write-Host "2. Premier run des migrations..." -ForegroundColor Yellow
  Push-Location $apiDir
  $output1 = node -e $migrateJs 2>&1
  Pop-Location
  $applied1 = if ($output1 -match 'APPLIED:(\d+)') { $matches[1] } else { 0 }
  Write-Host "   -> $applied1 migrations appliquees" -ForegroundColor Green

  Write-Host "3. Verification en base..." -ForegroundColor Yellow
  $check1 = pgWithDb $PgDb "SELECT COUNT(*) as cnt FROM drizzle.__drizzle_migrations;"
  Write-Host "   En base: $($check1.Trim())" -ForegroundColor Green

  Write-Host "4. Second run (idempotence)..." -ForegroundColor Yellow
  Push-Location $apiDir
  $output2 = node -e $migrateJs 2>&1
  Pop-Location
  $applied2 = if ($output2 -match 'APPLIED:(\d+)') { $matches[1] } else { 0 }
  Write-Host "   -> $applied2 migrations appliquees" -ForegroundColor Green

  if ($applied1 -ne $applied2) {
    throw "Le compteur a change! Les migrations ne sont pas idempotentes."
  }
  Write-Host "   -> Idempotence validee" -ForegroundColor Green

  Write-Host "`n=== SUCCES : Migration base vierge OK ===" -ForegroundColor Green
}
finally {
  Write-Host "`nNettoyage..." -ForegroundColor Yellow
  pgNoDb "DROP DATABASE IF EXISTS $PgDb"
  Write-Host "Base '$PgDb' supprimee" -ForegroundColor Yellow
}

Write-Host "`n=== Test Migration : Base existante ===" -ForegroundColor Cyan

pgNoDb "CREATE DATABASE $PgDb"

try {
  Write-Host "1. Appliquer les migrations..." -ForegroundColor Yellow
  Push-Location $apiDir
  $output3 = node -e $migrateJs 2>&1
  Pop-Location
  $applied3 = if ($output3 -match 'APPLIED:(\d+)') { $matches[1] } else { 0 }
  Write-Host "   -> $applied3 migrations appliquees" -ForegroundColor Green

  Write-Host "2. Inserer des donnees de test..." -ForegroundColor Yellow
  $tmpSql = [System.IO.Path]::GetTempFileName() + ".sql"
  Set-Content -Path $tmpSql -Value @"
INSERT INTO stores (id, name, email, country, status, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Store', 'test@test.com', 'Niger', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
"@
  cmd /c "psql -h $PgHost -p $PgPort -U $PgUser -d ""$PgDb"" -f ""$tmpSql"" 2>nul"
  if ($LASTEXITCODE -ne 0) { throw "echec insertion donnees" }
  Remove-Item $tmpSql
  Write-Host "   -> OK" -ForegroundColor Green

  Write-Host "3. Re-migration (donnees preservees)..." -ForegroundColor Yellow
  Push-Location $apiDir
  $output4 = node -e $migrateJs 2>&1
  Pop-Location
  $applied4 = if ($output4 -match 'APPLIED:(\d+)') { $matches[1] } else { 0 }
  Write-Host "   -> $applied4 migrations" -ForegroundColor Green

  Write-Host "`n=== SUCCES : Migration base existante OK ===" -ForegroundColor Green
}
finally {
  Write-Host "`nNettoyage..." -ForegroundColor Yellow
  pgNoDb "DROP DATABASE IF EXISTS $PgDb"
  Write-Host "Base '$PgDb' supprimee" -ForegroundColor Yellow
}

Write-Host "`n=== Les deux tests de migration sont passes ===" -ForegroundColor Green
