// Simple test script to verify Vercel deployment
// Run this in your browser console after opening your Vercel URL

console.log('🔍 Testing PolyBuddy Vercel Deployment...');

// Test 1: Check if API URL is set
console.log('📡 API URL:', process.env.NEXT_PUBLIC_API_URL || 'NOT SET');

// Test 2: Test homepage load
fetch('/')
  .then(res => console.log('✅ Homepage:', res.status === 200 ? 'OK' : 'FAILED'))
  .catch(err => console.log('❌ Homepage:', err.message));

// Test 3: Test API proxy (this should redirect to Render)
fetch('/api/markets?limit=1')
  .then(res => {
    console.log('🔄 API Proxy Status:', res.status);
    console.log('🔄 Final URL:', res.url);
    return res.json().catch(() => ({}));
  })
  .then(data => {
    if (data.data && data.data.length >= 0) {
      console.log('✅ API Working: Found', data.data.length, 'markets');
    } else {
      console.log('⚠️ API Response:', data);
    }
  })
  .catch(err => console.log('❌ API Failed:', err.message));

// Test 4: Check for CORS issues
fetch('https://polybuddy-api.onrender.com/api/health')
  .then(res => console.log('🌐 Direct API Health:', res.status === 200 ? 'OK' : 'FAILED'))
  .catch(err => console.log('🌐 Direct API Failed:', err.message));

console.log('✨ Test complete! Check results above.');
