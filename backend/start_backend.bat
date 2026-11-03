@echo off
title ApoloDigital Barber - Backend FastAPI
cd /d "%~dp0"

echo ======================================================================
echo    A P O L O D I G I T A L   B A R B E R   -   B A C K E N D
echo           FastAPI + SQLite + Booksy Biz Engine + apolodigital.lat
echo ======================================================================
echo.

if exist ".venv\Scripts\python.exe" (
    echo [OK] Activando entorno virtual (.venv)...
    ".venv\Scripts\python.exe" main.py
) else if exist "..\.venv\Scripts\python.exe" (
    echo [OK] Activando entorno virtual (..\.venv)...
    "..\.venv\Scripts\python.exe" main.py
) else (
    echo [!] Usando Python del sistema...
    python main.py
)

pause
