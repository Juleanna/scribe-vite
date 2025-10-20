@echo off
setlocal

REM Переходим в директорию скрипта (на случай запуска из другого места)
cd /d "%~dp0"

REM Проверяем наличие PowerShell
where powershell >nul 2>&1
if errorlevel 1 (
  echo Требуется PowerShell в PATH. Установите PowerShell 5+ или 7+.
  pause
  exit /b 1
)

REM Запускаем PowerShell-скрипт с пробросом аргументов
powershell -NoProfile -ExecutionPolicy Bypass -File ".\run.ps1" %*
set EXITCODE=%ERRORLEVEL%

echo Готово. Код выхода: %EXITCODE%.
pause

exit /b %EXITCODE%
