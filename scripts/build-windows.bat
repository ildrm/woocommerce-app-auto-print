@echo off
setlocal
node "%~dp0build-desktop.mjs" windows %*
exit /b %errorlevel%
