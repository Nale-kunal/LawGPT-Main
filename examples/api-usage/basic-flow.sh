#!/bin/bash
# Example API usage with curl
# Make sure the backend is running on http://localhost:5000

# 1. Get CSRF token
echo "=== Getting CSRF Token ==="
curl -c cookies.txt -b cookies.txt \
  http://localhost:5000/api/v1/auth/csrf-token

# 2. Register a new user
echo -e "\n\n=== Registering User ==="
CSRF=$(grep csrf-token cookies.txt | awk '{print $NF}')
curl -c cookies.txt -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"name":"Test User","email":"test@example.com","password":"TestPassword123!"}' \
  http://localhost:5000/api/v1/auth/register

# 3. Login
echo -e "\n\n=== Logging In ==="
curl -c cookies.txt -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}' \
  http://localhost:5000/api/v1/auth/login

# 4. List cases (authenticated)
echo -e "\n\n=== Listing Cases ==="
curl -b cookies.txt \
  http://localhost:5000/api/v1/cases

# 5. Health check
echo -e "\n\n=== Health Check ==="
curl http://localhost:5000/api/v1/health

# Cleanup
rm -f cookies.txt
