@echo off
title Scribe

echo ========================================
echo   Scribe - Starting project
echo ========================================
echo.

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Install Python 3.10+
    pause
    exit /b 1
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install Node.js 18+
    pause
    exit /b 1
)

echo [1/4] Checking backend dependencies...
pip show django >nul 2>&1
if %errorlevel% neq 0 (
    echo       Installing Python dependencies...
    pip install -r backend\requirements.txt
)

echo [2/4] Checking frontend dependencies...
if not exist "node_modules" (
    echo       Installing npm dependencies...
    call npm install
)

echo [3/4] Running DB migrations...
cd backend
set DJANGO_DEBUG=True
python manage.py migrate --noinput >nul 2>&1
cd ..

echo [4/4] Starting servers...
echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo   Admin:    http://localhost:8000/admin/
echo.
echo   Press Ctrl+C to stop
echo ========================================
echo.

start "Scribe Backend" /min cmd /c "cd backend && set DJANGO_DEBUG=True && python manage.py runserver 8000"

timeout /t 3 /nobreak >nul

call npm run dev
