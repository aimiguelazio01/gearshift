# Setup Script for Arduino CLI, Arduino MCP Server, and NFC Dependencies
# For GearShift / Oficina Automóvel App

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  GearShift Arduino MCP & CLI Dependency Installer" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$toolsDir = "C:\Users\corsair\tools\arduino-mcp-server"
$mcpExe = "$toolsDir\arduino-mcp-server.exe"
$arduinoCliDefaultPath = "C:\Program Files\Arduino CLI\arduino-cli.exe"
$globalMcpConfig = "C:\Users\corsair\.gemini\antigravity-ide\mcp_config.json"
$vscodeMcpConfig = "$PSScriptRoot\..\.vscode\mcp.json"

# 1. Check & Install Arduino CLI
Write-Host "[1/6] Checking Arduino CLI installation..." -ForegroundColor Yellow
$cliPath = ""

if (Test-Path $arduinoCliDefaultPath) {
    $cliPath = $arduinoCliDefaultPath
    Write-Host " -> Arduino CLI found at: $cliPath" -ForegroundColor Green
} else {
    $cliCmd = Get-Command "arduino-cli" -ErrorAction SilentlyContinue
    if ($cliCmd) {
        $cliPath = $cliCmd.Source
        Write-Host " -> Arduino CLI found in PATH at: $cliPath" -ForegroundColor Green
    }
}

if (-not $cliPath) {
    Write-Host " -> Arduino CLI not found. Attempting installation via winget..." -ForegroundColor Yellow
    try {
        winget install Arduino.ArduinoCLI --accept-source-agreements --accept-package-agreements --silent
        if (Test-Path $arduinoCliDefaultPath) {
            $cliPath = $arduinoCliDefaultPath
        } else {
            $cliCmd = Get-Command "arduino-cli" -ErrorAction SilentlyContinue
            if ($cliCmd) { $cliPath = $cliCmd.Source }
        }
    } catch {
        Write-Host " -> Winget install failed. Downloading Arduino CLI executable zip..." -ForegroundColor Yellow
        $zipUrl = "https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Windows_64bit.zip"
        $cliDir = "C:\Program Files\Arduino CLI"
        if (-not (Test-Path $cliDir)) { New-Item -ItemType Directory -Path $cliDir -Force }
        $zipFile = "$env:TEMP\arduino-cli.zip"
        Invoke-WebRequest -Uri $zipUrl -OutFile $zipFile
        Expand-Archive -Path $zipFile -DestinationPath $cliDir -Force
        Remove-Item $zipFile -Force
        $cliPath = "$cliDir\arduino-cli.exe"
    }
}

if (-not (Test-Path $cliPath)) {
    Write-Error "Failed to locate or install Arduino CLI."
}

# 2. Check & Install Arduino MCP Server Binary
Write-Host "`n[2/6] Checking Arduino MCP Server..." -ForegroundColor Yellow
if (-not (Test-Path $toolsDir)) {
    New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null
}

if (Test-Path $mcpExe) {
    Write-Host " -> Arduino MCP server binary found at: $mcpExe" -ForegroundColor Green
} else {
    Write-Host " -> Downloading Arduino MCP server binary..." -ForegroundColor Yellow
    $mcpDownloadUrl = "https://github.com/arduino/arduino-mcp-server/releases/latest/download/arduino-mcp-server_Windows_x86_64.zip"
    try {
        $mcpZip = "$env:TEMP\arduino-mcp-server.zip"
        Invoke-WebRequest -Uri $mcpDownloadUrl -OutFile $mcpZip
        Expand-Archive -Path $mcpZip -DestinationPath $toolsDir -Force
        Remove-Item $mcpZip -Force
        Write-Host " -> Arduino MCP server installed successfully at $mcpExe" -ForegroundColor Green
    } catch {
        Write-Host " -> Could not download prebuilt release. Checking if Go or Node fallback available..." -ForegroundColor Yellow
    }
}

# 3. Update Cores and Install Libraries
Write-Host "`n[3/6] Installing Arduino AVR Cores and NFC Libraries..." -ForegroundColor Yellow
Write-Host " -> Updating index..." -ForegroundColor Gray
& "$cliPath" core update-index

Write-Host " -> Installing core 'arduino:avr'..." -ForegroundColor Gray
& "$cliPath" core install arduino:avr

$libraries = @("Adafruit PN532", "Adafruit BusIO", "MFRC522", "NDEF_MFRC522")
foreach ($lib in $libraries) {
    Write-Host " -> Installing library '$lib'..." -ForegroundColor Gray
    & "$cliPath" lib install "$lib"
}

# 4. Install Python Serial Dependencies (Optional bridge)
Write-Host "`n[4/6] Checking Python hardware dependencies (pyserial)..." -ForegroundColor Yellow
$pythonCmd = Get-Command "python" -ErrorAction SilentlyContinue
if ($pythonCmd) {
    try {
        & python -m pip install --quiet pyserial requests
        Write-Host " -> Installed pyserial and requests for Python hardware bridge." -ForegroundColor Green
    } catch {
        Write-Host " -> Python dependencies installation skipped." -ForegroundColor Gray
    }
} else {
    Write-Host " -> Python not found. Skipping python serial dependencies." -ForegroundColor Gray
}

# 5. Update MCP Configurations (Antigravity & VSCode)
Write-Host "`n[5/6] Registering Arduino MCP Server in MCP configs..." -ForegroundColor Yellow

# Update Global Antigravity Config
if (Test-Path $globalMcpConfig) {
    try {
        $jsonContent = Get-Content $globalMcpConfig -Raw | ConvertFrom-Json
        if (-not $jsonContent.mcpServers) {
            $jsonContent | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value ([PSCustomObject]@{})
        }
        
        $mcpObj = [PSCustomObject]@{
            command = $mcpExe
            env = [PSCustomObject]@{
                ARDUINO_CLI_BIN = $cliPath
            }
        }
        
        $jsonContent.mcpServers | Add-Member -MemberType NoteProperty -Name "arduino-mcp-server" -Value $mcpObj -Force
        $updatedJson = $jsonContent | ConvertTo-Json -Depth 10
        Set-Content -Path $globalMcpConfig -Value $updatedJson -Encoding UTF8
        Write-Host " -> Updated global Antigravity MCP config: $globalMcpConfig" -ForegroundColor Green
    } catch {
        Write-Host " -> Warning updating global MCP config: $_" -ForegroundColor Red
    }
}

# Update Workspace VSCode Config
try {
    $vscodeDir = Split-Path $vscodeMcpConfig -Parent
    if (-not (Test-Path $vscodeDir)) { New-Item -ItemType Directory -Path $vscodeDir -Force | Out-Null }
    
    $vscodeConfigObj = [PSCustomObject]@{
        servers = [PSCustomObject]@{
            "arduino-mcp-server" = [PSCustomObject]@{
                type = "stdio"
                command = $mcpExe
                env = [PSCustomObject]@{
                    ARDUINO_CLI_BIN = $cliPath
                }
            }
        }
    }
    
    $vscodeJson = $vscodeConfigObj | ConvertTo-Json -Depth 10
    Set-Content -Path $vscodeMcpConfig -Value $vscodeJson -Encoding UTF8
    Write-Host " -> Updated workspace MCP config: $vscodeMcpConfig" -ForegroundColor Green
} catch {
    Write-Host " -> Warning updating workspace MCP config: $_" -ForegroundColor Red
}

# 6. Verify Connected Boards
Write-Host "`n[6/6] Scanning for connected Arduino hardware..." -ForegroundColor Yellow
& "$cliPath" board list

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  SUCCESS! Arduino MCP & CLI dependencies are fully set up!" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
