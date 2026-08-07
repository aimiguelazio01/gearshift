@echo off
title GearShift Arduino MCP and CLI Setup

echo ============================================================================
echo   Installing Arduino CLI, Arduino MCP Server, and NFC Dependencies...
echo ============================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-arduino-mcp.ps1"

if errorlevel 1 (
    echo.
    echo [ERROR] Installation failed or encountered an error.
    echo.
) else (
    echo.
    echo [SUCCESS] All dependencies, libraries, and MCP configurations installed!
    echo.
)

pause
