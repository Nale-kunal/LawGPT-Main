@echo off
echo Starting LawyerZen Backend Server...
echo.

REM Set environment variables
set NODE_ENV=development
set PORT=5000
set MONGODB_URI=mongodb://localhost:27017/lawyer_zen
set JWT_SECRET=your-super-secret-jwt-key-change-in-production
set CORS_ORIGIN=http://localhost:8080

echo Environment variables set:
echo NODE_ENV=%NODE_ENV%
echo PORT=%PORT%
echo MONGODB_URI=%MONGODB_URI%
echo CORS_ORIGIN=%CORS_ORIGIN%
echo.

echo Starting server on port %PORT%...
node index.js

pause
