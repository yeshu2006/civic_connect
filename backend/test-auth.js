const http = require('http');

const request = (options, data) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

const runTests = async () => {
  console.log('--- Testing Auth Flow ---');

  // 1. Test Login with Admin
  console.log('\n[Test 1] Logging in as Admin');
  const loginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@gov.com', password: 'Admin@123' });

  console.log(`Status: ${loginRes.status}`);
  console.log(`Response:`, loginRes.data);

  // 2. Test Signup with New User
  console.log('\n[Test 2] Signing up a new citizen');
  const signupRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { name: 'Test Citizen', email: 'citizen@test.com', password: 'Password@123' });

  console.log(`Status: ${signupRes.status}`);
  console.log(`Response:`, signupRes.data);

  // 3. Test Signup with existing email (should fail)
  console.log('\n[Test 3] Signing up with same email (should fail)');
  const duplicateRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { name: 'Test Citizen 2', email: 'citizen@test.com', password: 'Password@123' });

  console.log(`Status: ${duplicateRes.status}`);
  console.log(`Response:`, duplicateRes.data);
};

runTests();
