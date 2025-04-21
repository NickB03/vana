@echo off
title VANA Multi-Agent System

:: Display startup banner
echo ==========================================
echo   Starting VANA Multi-Agent System
echo ==========================================

:: Navigate to the project directory
cd /d "%~dp0"
echo Working directory: %cd%

:: Check if Python is installed
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Python is not installed. Please install Python 3.9 or higher.
    pause
    exit /b 1
)

:: Check Python version
for /f "tokens=2" %%I in ('python --version') do set PYTHON_VERSION=%%I
echo Python version: %PYTHON_VERSION%

:: Check if virtual environment exists, create if it doesn't
if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv
)

:: Activate virtual environment
echo Activating virtual environment...
call .venv\Scripts\activate.bat

:: Check if requirements are installed
echo Checking requirements...
pip install -r adk-setup\requirements.txt

:: Check if .env file exists
if not exist .env (
    echo Error: .env file not found. Please create a .env file with your configuration.
    pause
    exit /b 1
)

:: Check if Vector Search is set up
echo Checking Vector Search setup...
for /f "tokens=2 delims==" %%G in ('findstr "GOOGLE_APPLICATION_CREDENTIALS" .env') do set KEY_PATH=%%G
set KEY_PATH=%KEY_PATH:./secrets/=%
if not exist secrets\%KEY_PATH% (
    echo Warning: Service account key not found. Vector Search may not work properly.
    echo Please follow the Vector Search setup instructions in next-steps.md.
    echo Press Enter to continue anyway or Ctrl+C to exit...
    pause
)

:: Start the ADK web interface
echo Starting ADK web interface...
cd adk-setup
adk web

:: Keep terminal open if the server exits
echo ADK web interface has stopped.
pause
