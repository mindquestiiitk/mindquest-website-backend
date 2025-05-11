@echo off
echo Seeding teams data to Firebase...
node --experimental-modules --es-module-specifier-resolution=node src/scripts/seed-teams.js
echo Done!
pause
