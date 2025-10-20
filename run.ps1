Param(
  [switch]$Install,
  [switch]$Build,
  [switch]$Preview
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    Write-Error "Требуется установленный '$Name' в PATH. Установите Node.js/npm и повторите попытку."
  }
}

function Run-Npm {
  param([string[]]$NpmArgs)
  # Предпочитаем npm.cmd, чтобы обойти npm.ps1 и StrictMode
  $npmCmd = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Path
  if (-not $npmCmd) {
    $npmCmd = 'npm'
  }
  Write-Host "> $npmCmd $($NpmArgs -join ' ')" -ForegroundColor Cyan
  & $npmCmd @NpmArgs
}

Require-Command -Name npm

# Установка зависимостей при первом запуске или по флагу -Install
$needInstall = $Install -or -not (Test-Path -Path 'node_modules')
if ($needInstall) {
  if (Test-Path -Path 'package-lock.json') {
    Run-Npm @('ci')
  } else {
    Run-Npm @('install')
  }
}

if ($Build) {
  Run-Npm @('run','build')
  if ($Preview) {
    Run-Npm @('run','preview')
    return
  }
  return
}

if ($Preview) {
  Run-Npm @('run','preview')
  return
}

# Запуск режима разработки по умолчанию
Run-Npm @('run','dev')
