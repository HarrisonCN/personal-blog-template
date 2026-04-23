@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File ".\start-blog.ps1"
