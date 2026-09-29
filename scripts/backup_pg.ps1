# ==============================================================================
# VALETEC PHARMA - SCRIPT DE RESPALDO POWERSHELL (WINDOWS TASK SCHEDULER)
# ==============================================================================
# Ejecuta backup automatizado invocando el runner multiplataforma de Node.js
# ==============================================================================

param (
    [switch]$List
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RootDir = Split-Path -Parent $ScriptDir
Set-Location $RootDir

if ($List) {
    node scripts/backup_db.js --list
} else {
    node scripts/backup_db.js
}
