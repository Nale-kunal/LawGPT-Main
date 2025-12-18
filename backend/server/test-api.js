// Simple test script to check API endpoints
import fetch from 'node-fetch';

const baseUrl = 'http://localhost:5000';

async function testAPI() {
  console.log('Testing LawyerZen API endpoints...\n');

  // Test health endpoint
  try {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.text();
    console.log('✅ Health check:', healthData);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return;
  }

  // Test dashboard endpoints (these require auth, so they should return 401)
  const endpoints = [
    '/api/dashboard/stats',
    '/api/dashboard/activity', 
    '/api/dashboard/notifications'
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${baseUrl}${endpoint}`);
      const data = await res.text();
      console.log(`📊 ${endpoint}: ${res.status} - ${data.substring(0, 100)}...`);
    } catch (error) {
      console.log(`❌ ${endpoint} failed:`, error.message);
    }
  }

  console.log('\n🔍 API is running. Dashboard endpoints require authentication.');
  console.log('💡 To test with auth, login through the frontend first.');
}

testAPI();
