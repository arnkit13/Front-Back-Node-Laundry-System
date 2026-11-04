@echo off
title Laundry Inventory Management System Launcher
echo ======================================================================
echo    Starting Laundry Inventory System (Backend + Frontend)
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/2] Starting Express Node.js Backend on port 8080...
start "Laundry Backend (Port 8080)" cmd /k "cd backend && npm run dev"

echo [2/2] Starting Vite React Frontend on port 5173...
start "Laundry Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers have been launched in separate windows!
echo - Backend API:  http://localhost:8080
echo - Frontend UI:  http://localhost:5173
echo.
echo Leave both command prompt windows open while using the application.
echo ======================================================================
pause

