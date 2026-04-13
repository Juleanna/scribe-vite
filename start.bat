@echo off
chcp 65001 >nul
title Scribe — Запуск проекту

echo ========================================
echo   Scribe — Запуск бекенду та фронтенду
echo ========================================
echo.

:: Перевірка Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ПОМИЛКА] Python не знайдено. Встановіть Python 3.10+
    pause
    exit /b 1
)

:: Перевірка Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ПОМИЛКА] Node.js не знайдено. Встановіть Node.js 18+
    pause
    exit /b 1
)

:: Встановлення залежностей бекенду (якщо потрібно)
echo [1/4] Перевірка залежностей бекенду...
pip show django >nul 2>&1
if %errorlevel% neq 0 (
    echo       Встановлення Python-залежностей...
    pip install -r backend\requirements.txt
)

:: Встановлення залежностей фронтенду (якщо потрібно)
echo [2/4] Перевірка залежностей фронтенду...
if not exist "node_modules" (
    echo       Встановлення npm-залежностей...
    call npm install
)

:: Міграції бази даних
echo [3/4] Застосування міграцій БД...
cd backend
python manage.py migrate --noinput >nul 2>&1
cd ..

:: Запуск
echo [4/4] Запуск серверів...
echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo   Admin:    http://localhost:8000/admin/
echo.
echo   Натисніть Ctrl+C для зупинки
echo ========================================
echo.

:: Запуск Django у фоні
start "Scribe Backend" /min cmd /c "cd backend && python manage.py runserver 8000"

:: Невелика пауза щоб бекенд встиг піднятися
timeout /t 2 /nobreak >nul

:: Запуск Vite (на передньому плані)
call npm run dev
