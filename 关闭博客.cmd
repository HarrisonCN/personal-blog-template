@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File ".\stop-blog.ps1"
