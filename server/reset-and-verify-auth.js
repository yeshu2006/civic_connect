import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import User, { DEPARTMENTS } from './models/User.js';
import Issue from './models/Issue.js';
import Vote from './models/Vote.js';

const DEMO_PASSWORD = 'Password123!';

const ACCOUNTS_TO_SEED = [
  {
    name: 'Super Admin Officer',
    email: 'superadmin@civicconnect.org',
    password: DEMO_PASSWORD,
    role: 'super_admin',
    department: '',
    phone: '+1 555-0100'
  },
  {
    name: 'Sarah Mitchell (Roads Admin)',
    email: 'roads.admin@civicconnect.org',
    password: DEMO_PASSWORD,
    role: 'department_admin',
    department: 'Roads and Infrastructure',
    phone: '+1 555-0101'
  },
  {
    name: 'James Reynolds (Water Admin)',
    email: 'water.admin@civicconnect.org',
    password: DEMO_PASSWORD,
    role: 'department_admin',
    department: 'Water Supply',
    phone: '+1 555-0102'
  },
  {
    name: 'Elena Rostova (Electricity Admin)',
    email: 'electricity.admin@civicconnect.org',
    password: DEMO_PASSWORD,
    role: 'department_admin',
    department: 'Electricity',
    phone: '+1 555-0103'
  },
  {
    name: 'Carlos Ortiz (Sanitation Admin)',
    email: 'sanitation.admin@civicconnect.org',
    password: DEMO_PASSWORD,
    role: 'department_admin',
    department: 'Sanitation and Waste Management',
    phone: '+1 555-0104'
  },
  {
    name: 'David Vance (Safety Admin)',
    email: 'safety.admin@civicconnect.org',
    password: DEMO_PASSWORD,
    role: 'department_admin',
    department: 'Public Safety',
    phone: '+1 555-0105'
  },
  {
    name: 'Maya Lin (Lighting Admin)',
    email: 'lighting.admin@civicconnect.org',
    password: DEMO_PASSWORD,
    role: 'department_admin',
    department: 'Street Lighting',
    phone: '+1 555-0106'
  },
  {
    name: 'Marcus Thorne (Drainage Admin)',
    email: 'drainage.admin@civicconnect.org',
    password: DEMO_PASSWORD,
    role: 'department_admin',
    department: 'Drainage',
    phone: '+1 555-0107'
  },
  {
    name: 'Bairla Yeshwanth',
    email: 'yeshwanth3006@gmail.com',
    password: DEMO_PASSWORD,
    role: 'super_admin',
    department: '',
    phone: '+1 555-0108'
  },
  {
    name: 'Government Super Admin',
    email: 'admin@gov.com',
    password: DEMO_PASSWORD,
    role: 'super_admin',
    department: '',
    phone: '+1 555-0109'
  },
  {
    name: 'Platform Administrator',
    email: 'admin@gmail.com',
    password: DEMO_PASSWORD,
    role: 'super_admin',
    department: '',
    phone: '+1 555-0110'
  },
  {
    name: 'Alex Johnson',
    email: 'alex.citizen@gmail.com',
    password: DEMO_PASSWORD,
    role: 'citizen',
    phone: '+1 555-0201'
  },
  {
    name: 'Priya Sharma',
    email: 'priya.civic@gmail.com',
    password: DEMO_PASSWORD,
    role: 'citizen',
    phone: '+1 555-0202'
  },
  {
    name: 'Marcus Vance',
    email: 'marcus.v@gmail.com',
    password: DEMO_PASSWORD,
    role: 'citizen',
    phone: '+1 555-0203'
  },
  {
    name: 'Test Citizen',
    email: 'citizen@test.com',
    password: DEMO_PASSWORD,
    role: 'citizen',
    phone: '+1 555-0204'
  }
];

async function resetAndVerify() {
  console.log('===============================================================');
  console.log('   CivicConnect: MongoDB Reset & Full Authentication Check     ');
  console.log('===============================================================');

  console.log('\n[1/4] Connecting to MongoDB Atlas URI:');
  console.log(`      ${process.env.MONGODB_URI.replace(/:([^@]+)@/, ':****@')}`);
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('      MongoDB Connected successfully.');

  console.log('\n[2/4] Wiping all existing collections (Complaints, Votes, Users)...');
  const deletedIssues = await Issue.deleteMany({});
  const deletedVotes = await Vote.deleteMany({});
  const deletedUsers = await User.deleteMany({});
  console.log(`      Cleared complaints/issues: ${deletedIssues.deletedCount}`);
  console.log(`      Cleared votes:            ${deletedVotes.deletedCount}`);
  console.log(`      Cleared users:            ${deletedUsers.deletedCount}`);

  console.log('\n[3/4] Inserting fresh users and admins with guaranteed bcrypt password hashes...');
  const createdUsers = [];
  for (const account of ACCOUNTS_TO_SEED) {
    const userDoc = await User.create(account);
    createdUsers.push(userDoc);
    console.log(`      Created [${userDoc.role}] ${userDoc.email}`);
  }
  console.log(`      Successfully seeded ${createdUsers.length} fresh accounts.`);

  // 4. Spin up Express app to test /api/auth/login and /api/auth/me over HTTP
  console.log('\n[4/4] Starting verification HTTP server to test real login flow...');
  const TEST_PORT = 5088;
  const express = (await import('express')).default;
  const cors = (await import('cors')).default;
  const authRoutes = (await import('./routes/authRoutes.js')).default;

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  const BASE_URL = `http://localhost:${TEST_PORT}/api/auth`;

  let testPassed = 0;
  let testFailed = 0;

  console.log('\n--- Verifying Login & Password Authentication For Every Account ---');

  for (const account of ACCOUNTS_TO_SEED) {
    // A. Normal login
    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: account.email,
        password: DEMO_PASSWORD
      })
    });

    const loginData = await loginRes.json();
    const token = loginData.token;

    if (loginRes.status === 200 && token && loginData.user?.email === account.email.toLowerCase()) {
      console.log(`  [OK] Login SUCCESS: ${account.email} (${account.role})`);
      testPassed++;
    } else {
      console.error(`  [FAIL] Login FAILED: ${account.email}`, loginData);
      testFailed++;
      continue;
    }

    // B. Verify /api/auth/me with the issued JWT
    const meRes = await fetch(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const meData = await meRes.json();
    if (meRes.status === 200 && meData.user?.email === account.email.toLowerCase()) {
      testPassed++;
    } else {
      console.error(`  [FAIL] /api/auth/me check failed for ${account.email}`);
      testFailed++;
    }

    // C. Test wrong password rejection
    const wrongPassRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: account.email,
        password: 'IncorrectPassword999!'
      })
    });
    if (wrongPassRes.status === 401) {
      testPassed++;
    } else {
      console.error(`  [FAIL] Wrong password was not rejected with 401 for ${account.email}`);
      testFailed++;
    }
  }

  // Final check: Case-insensitivity and whitespace trim check
  const whitespaceRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: '  superadmin@civicconnect.org  ',
      password: `${DEMO_PASSWORD} `
    })
  });
  if (whitespaceRes.status === 200) {
    console.log('  [OK] Login handles whitespace trim for email & password');
    testPassed++;
  } else {
    console.error('  [FAIL] Whitespace login test failed');
    testFailed++;
  }

  console.log('\n===============================================================');
  console.log(`AUTHENTICATION VERIFICATION RESULTS: ${testPassed} PASSED, ${testFailed} FAILED`);
  console.log(`Total Accounts in DB: ${createdUsers.length}`);
  console.log(`Total Complaints in DB: 0`);
  console.log('===============================================================\n');

  server.close();
  await mongoose.connection.close();

  if (testFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

resetAndVerify().catch((err) => {
  console.error('Fatal error during reset and verify:', err);
  process.exit(1);
});
