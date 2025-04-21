@echo off
REM Launch VANA environment with virtual environment and web server
REM This script activates the Python virtual environment and starts the ADK web server

REM Change to the project directory
cd /d "%~dp0"

REM Display welcome message
echo =====================================
echo   VANA - Multi-Agent System Launcher
echo =====================================
echo.
echo Starting VANA environment...

REM Activate the virtual environment
call .venv\Scripts\activate.bat

REM Check if the virtual environment was activated successfully
if %ERRORLEVEL% neq 0 (
    echo Error: Failed to activate virtual environment.
    echo Please make sure you have set up the environment correctly.
    echo See README.md for setup instructions.
    pause
    exit /b 1
)

REM Display environment information
python --version
echo Virtual environment: %VIRTUAL_ENV%
echo.

REM Check if Vector Search is set up
if exist knowledge_docs (
    dir /b knowledge_docs | findstr . > nul
    if %ERRORLEVEL% equ 0 (
        echo Knowledge documents found in knowledge_docs directory.
    ) else (
        echo Warning: No knowledge documents found in knowledge_docs directory.
        echo Vector Search functionality may be limited.
        echo.
    )
) else (
    echo Warning: knowledge_docs directory not found.
    echo Vector Search functionality may be limited.
    echo.
)

REM Start the ADK web server
echo Starting ADK web server...
echo The web interface will be available at http://localhost:8000
echo.
echo Note: This terminal window must remain open while using VANA.
echo Press Ctrl+C to stop the server when you're done.
echo =====================================
echo.

REM Change to the ADK setup directory and start the web server
cd adk-setup
adk web

REM This point is reached only if the web server is stopped
echo.
echo ADK web server has been stopped.
echo VANA environment is shutting down.
echo.

REM Deactivate the virtual environment
call deactivate

echo VANA environment has been shut down.
pause
