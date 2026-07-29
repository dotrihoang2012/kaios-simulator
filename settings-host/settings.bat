@echo off
powershell -NoProfile -WindowStyle Hidden -Command ^
"Start-Process 'D:\desktop\Tools\platform-tools\KaiOS\node_modules\electron\dist\electron.exe' -ArgumentList 'D:\desktop\Tools\platform-tools\KaiOS\settings-host\preview.js'"
exit