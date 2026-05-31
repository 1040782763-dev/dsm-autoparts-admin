@echo off
cd /d %~dp0
echo Starting Dar Auto Parts System...
echo.
cd server
start "" http://localhost:3000
node index.js
pause
