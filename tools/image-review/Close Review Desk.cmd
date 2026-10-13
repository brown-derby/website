@echo off
python "%~dp0launch.py" --close
if errorlevel 1 pause
