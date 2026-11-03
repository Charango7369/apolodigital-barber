@echo off
title ApoloDigital Barber - Lanzador Unificado
cd /d "%~dp0"
echo ======================================================================
echo       A P O L O   D I G I T A L   -   B A R B E R   ( B I Z )
echo    Gestion Inteligente de Barberias y Citas en Tiempo Real
echo               Potenciado con el sello de apolodigital.lat
echo ======================================================================
echo.

echo [1/2] Iniciando Servidor Backend FastAPI en segundo plano...
start "ApoloDigital Barber Backend" cmd /c "start_backend.bat"

timeout /t 2 /nobreak >nul

echo [2/2] Iniciando Frontend React + Vite...
start "ApoloDigital Barber Frontend" cmd /c "start_frontend.bat"

timeout /t 3 /nobreak >nul

echo Abriendo navegador en http://localhost:8008...
start http://localhost:8008

echo.
echo ======================================================================
echo Todo listo. ApoloDigital Barber esta corriendo satisfactoriamente.
echo - Web App y Backend: http://localhost:8008
echo - API Docs (Swagger): http://localhost:8008/docs
echo ======================================================================
echo Presiona cualquier tecla para cerrar este lanzador (las consolas continuaran abiertas).
pause >nul
