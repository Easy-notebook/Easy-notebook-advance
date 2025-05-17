@echo off
cd script
start cmd /k "call start_dslc_senario.bat"
start cmd /k "call start_frontend.bat"
start cmd /k "call start_general_backend.bat"
explorer.exe  http://localhost:3000