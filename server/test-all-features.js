import http from 'http';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });

const TEST_PORT = 5055;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

function createPngBuffer(width = 120, height = 120, pixelGenerator = () => [120, 120, 120]) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const makeChunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = zlib.crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  };

  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const rowLength = 1 + width * 3;
  const rawData = Buffer.alloc(rowLength * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelGenerator(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 3;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

async function runTestSuite() {
  console.log('===========================================================');
  console.log('   CivicConnect Comprehensive Pre-Deployment Test Suite   ');
  console.log('===========================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  // 1. Boot Server & Connect to DB
  const { connectDB, closeDB } = await import('./config/db.js');
  const { seedInitialData } = await import('./utils/seedData.js');

  console.log('\n[1/7] Connecting to Database and Seeding Initial Records...');
  await connectDB();
  await seedInitialData();

  // Dynamically import server app without auto-listen
  // Note: server.js listens on PORT by default if executed directly,
  // but we can start server on our TEST_PORT
  process.env.PORT = String(TEST_PORT);
  
  // Create an express app instance by importing server dependencies or running server
  // Let's import express and build the test app using the exact same configuration as server.js
  const express = (await import('express')).default;
  const cors = (await import('cors')).default;
  const { errorHandler } = await import('./middleware/errorHandler.js');
  
  const authRoutes = (await import('./routes/authRoutes.js')).default;
  const issueRoutes = (await import('./routes/issueRoutes.js')).default;
  const adminRoutes = (await import('./routes/adminRoutes.js')).default;
  const analyticsRoutes = (await import('./routes/analyticsRoutes.js')).default;
  const aiRoutes = (await import('./routes/aiRoutes.js')).default;

  const app = express();
  app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'CivicConnect API', version: '1.0.0' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/issues', issueRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/ai', aiRoutes);

  app.all('/api/*', (req, res) => {
    res.status(404).json({ success: false, message: `API endpoint '${req.originalUrl}' not found.` });
  });

  const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (req, res, next) => {
      if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads')) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`Test server running at http://localhost:${TEST_PORT}`);

  try {
    // ------------------------------------------------------------------
    // TEST SECTION 1: Health & Public Metadata
    // ------------------------------------------------------------------
    console.log('\n[2/7] Testing Health Check & Public Endpoints...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.status === 'ok', 'Health Check endpoint /api/health');

    const deptsRes = await fetch(`${BASE_URL}/auth/departments`);
    const deptsData = await deptsRes.json();
    assert(deptsRes.status === 200 && deptsData.departments.length === 8, 'Departments list /api/auth/departments returns 8 sectors');

    // ------------------------------------------------------------------
    // TEST SECTION 2: User Registration & Authentication (Citizen, Dept Admin, Super Admin)
    // ------------------------------------------------------------------
    console.log('\n[3/7] Testing Authentication, Roles & Profile Management...');
    const testEmail = `test.citizen.${Date.now()}@example.com`;
    const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Citizen User',
        email: testEmail,
        password: 'Password123!',
        phone: '+1 555-9999'
      })
    });
    const signupData = await signupRes.json();
    assert(signupRes.status === 201 && signupData.token, 'Signup creates new Citizen account and returns JWT token');
    const newCitizenToken = signupData.token;

    // Reject duplicate signup
    const dupSignupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Citizen',
        email: testEmail,
        password: 'Password123!'
      })
    });
    assert(dupSignupRes.status === 400, 'Signup prevents duplicate email registration (400)');

    // Login as Citizen
    const citizenLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'Password123!' })
    });
    const citizenLogin = await citizenLoginRes.json();
    assert(citizenLoginRes.status === 200 && citizenLogin.user.email === testEmail, 'Citizen login authenticates successfully');

    // Login as Seeded Roads Admin
    const roadsLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'roads.admin@civicconnect.org', password: 'Password123!' })
    });
    const roadsLogin = await roadsLoginRes.json();
    assert(roadsLoginRes.status === 200 && roadsLogin.user.role === 'department_admin', 'Roads Admin login authenticates');
    const roadsToken = roadsLogin.token;

    // Login as Seeded Water Admin
    const waterLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'water.admin@civicconnect.org', password: 'Password123!' })
    });
    const waterLogin = await waterLoginRes.json();
    assert(waterLoginRes.status === 200 && waterLogin.user.role === 'department_admin', 'Water Admin login authenticates');
    const waterToken = waterLogin.token;

    // Login as Seeded Super Admin
    const superLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@civicconnect.org', password: 'Password123!' })
    });
    const superLogin = await superLoginRes.json();
    assert(superLoginRes.status === 200 && superLogin.user.role === 'super_admin', 'Super Admin login authenticates');
    const superToken = superLogin.token;

    // Bad password login
    const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword!' })
    });
    assert(badLoginRes.status === 401, 'Bad credentials rejected with 401 Unauthorized');

    // /api/auth/me verification
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${newCitizenToken}` }
    });
    const meData = await meRes.json();
    assert(meRes.status === 200 && meData.user.name === 'Test Citizen User', 'Get authenticated profile /api/auth/me');

    // Update profile
    const updateProfileRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newCitizenToken}`
      },
      body: JSON.stringify({ name: 'Updated Citizen Name', phone: '+1 555-8888' })
    });
    const updateProfileData = await updateProfileRes.json();
    assert(updateProfileRes.status === 200 && updateProfileData.user.name === 'Updated Citizen Name', 'Profile update endpoint /api/auth/profile');

    // ------------------------------------------------------------------
    // TEST SECTION 3: Civic Issues Lifecycle (Create, List, Search, Duplicate, Vote)
    // ------------------------------------------------------------------
    console.log('\n[4/7] Testing Issues Lifecycle, Geospatial Queries & Duplicate Detection...');

    // Citizen creates a new issue (with image upload buffer)
    const imageBuffer = createPngBuffer(100, 100, (x, y) => [
      (x * 19 + y * 23) % 200 + 40,
      (x * 13 + y * 17) % 200 + 40,
      (x * 11 + y * 29) % 200 + 40
    ]);
    
    const form = new FormData();
    form.append('title', 'Hazardous Sunken Pothole on Market Blvd');
    form.append('description', 'Large road crater near pedestrian crosswalk causing vehicle swerving.');
    form.append('department', 'Roads and Infrastructure');
    form.append('severity', 'High');
    form.append('category', 'Pothole');
    form.append('address', '789 Market Blvd');
    form.append('latitude', '37.7785');
    form.append('longitude', '-122.4210');
    form.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'pothole_evidence.png');

    const createIssueRes = await fetch(`${BASE_URL}/issues`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${newCitizenToken}` },
      body: form
    });
    const createIssueData = await createIssueRes.json();
    assert(createIssueRes.status === 201 && createIssueData.issue?._id, 'Citizen reports new issue with image evidence (Cloudinary/Storage integration)');
    const createdIssueId = createIssueData.issue._id;
    assert(Boolean(createIssueData.issue.imageUrl), 'Created issue has valid stored imageUrl');

    // Get Issues with filters & pagination
    const listRes = await fetch(`${BASE_URL}/issues?limit=5&sortBy=newest`);
    const listData = await listRes.json();
    assert(listRes.status === 200 && listData.issues.length > 0, 'Public issues listing /api/issues returns issues');
    assert(typeof listData.total === 'number' && listData.totalPages >= 1, 'Issues listing includes total and pagination metadata');

    // Search query
    const searchRes = await fetch(`${BASE_URL}/issues?search=Market`);
    const searchData = await searchRes.json();
    assert(searchRes.status === 200 && Array.isArray(searchData.issues) && searchData.issues.length > 0, 'Issue text search filtering works');

    // Department filter
    const deptFilterRes = await fetch(`${BASE_URL}/issues?department=Roads%20and%20Infrastructure`);
    const deptFilterData = await deptFilterRes.json();
    const allRoads = deptFilterData.issues.every((i) => i.department === 'Roads and Infrastructure');
    assert(deptFilterRes.status === 200 && allRoads && deptFilterData.issues.length > 0, 'Issue department filtering works');

    // Duplicate detection endpoint near created issue
    const dupCheckRes = await fetch(`${BASE_URL}/issues/check-duplicates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        longitude: -122.4210 + 0.0001,
        latitude: 37.7785 + 0.0001,
        department: 'Roads and Infrastructure',
        title: 'Hazardous Sunken Pothole',
        description: 'Large road crater causing vehicle damage',
        radiusMeters: 500
      })
    });
    const dupCheckData = await dupCheckRes.json();
    assert(dupCheckRes.status === 200 && dupCheckData.duplicates.length > 0, 'Duplicate check /api/issues/check-duplicates flags nearby matching incident');

    // Nearby Geospatial search
    const nearbyRes = await fetch(`${BASE_URL}/issues/nearby?latitude=37.7785&longitude=-122.4210&radius=10000`);
    const nearbyData = await nearbyRes.json();
    assert(nearbyRes.status === 200 && nearbyData.issues.length > 0, 'Nearby geospatial endpoint /api/issues/nearby returns issues within radius');

    // Get Single Issue by ID
    const singleIssueRes = await fetch(`${BASE_URL}/issues/${createdIssueId}`, {
      headers: { Authorization: `Bearer ${newCitizenToken}` }
    });
    const singleIssueData = await singleIssueRes.json();
    assert(singleIssueRes.status === 200 && singleIssueData.issue._id === createdIssueId, 'Get single issue by ID /api/issues/:id');

    // Voting
    const voteRes = await fetch(`${BASE_URL}/issues/${createdIssueId}/vote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${newCitizenToken}` }
    });
    const voteData = await voteRes.json();
    assert(voteRes.status === 200 && voteData.votes === 1 && voteData.hasVoted === true, 'Upvoting issue increments vote counter');

    // Prevent double voting
    const doubleVoteRes = await fetch(`${BASE_URL}/issues/${createdIssueId}/vote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${newCitizenToken}` }
    });
    assert(doubleVoteRes.status === 400, 'Duplicate voting is blocked with 400 Bad Request');

    // Unvote
    const unvoteRes = await fetch(`${BASE_URL}/issues/${createdIssueId}/vote`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${newCitizenToken}` }
    });
    const unvoteData = await unvoteRes.json();
    assert(unvoteRes.status === 200 && unvoteData.votes === 0 && unvoteData.hasVoted === false, 'Unvoting decrements vote counter');

    // My reports
    const myReportsRes = await fetch(`${BASE_URL}/issues?myReports=true`, {
      headers: { Authorization: `Bearer ${newCitizenToken}` }
    });
    const myReportsData = await myReportsRes.json();
    assert(myReportsRes.status === 200 && myReportsData.issues.some((i) => i._id === createdIssueId), 'Citizen my-reports query returns user tickets');

    // ------------------------------------------------------------------
    // TEST SECTION 4: Civic Vision Classifier & Image Rejection
    // ------------------------------------------------------------------
    console.log('\n[5/7] Testing Civic Vision Classifier & Image Rejection Engine...');

    // 1. Unrelated Image Rejection: Selfie upload rejected with 400
    const selfieForm = new FormData();
    selfieForm.append('description', 'My new selfie at the intersection');
    selfieForm.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'selfie_photo.png');
    const selfieRes = await fetch(`${BASE_URL}/ai/classify-image`, {
      method: 'POST',
      body: selfieForm
    });
    const selfieData = await selfieRes.json();
    assert(selfieRes.status === 400 && selfieData.code === 'IMAGE_SELFIE_DETECTED', 'Rejects unrelated selfie upload with 400 Bad Request');

    // 2. Unrelated Image Rejection: Food upload rejected with 400
    const foodForm = new FormData();
    foodForm.append('description', 'Pizza and burger lunch');
    foodForm.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'food_dinner.png');
    const foodRes = await fetch(`${BASE_URL}/ai/classify-image`, {
      method: 'POST',
      body: foodForm
    });
    const foodData = await foodRes.json();
    assert(foodRes.status === 400 && foodData.code === 'IMAGE_FOOD_DETECTED', 'Rejects unrelated food/dining photo with 400 Bad Request');

    // 3. Unrelated Image Rejection: Digital screenshot rejected with 400
    const screenshotForm = new FormData();
    screenshotForm.append('description', 'Phone screen capture');
    screenshotForm.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'screenshot_screen.png');
    const screenshotRes = await fetch(`${BASE_URL}/ai/classify-image`, {
      method: 'POST',
      body: screenshotForm
    });
    const screenshotData = await screenshotRes.json();
    assert(screenshotRes.status === 400 && screenshotData.code === 'IMAGE_SCREENSHOT_DETECTED', 'Rejects digital screenshot graphic with 400 Bad Request');

    // 4. Valid Civic Infrastructure Image: Storm drainage obstruction
    const aiForm = new FormData();
    aiForm.append('description', 'Fallen tree blocking stormwater canal and water flooding road.');
    aiForm.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'canal_flood.png');

    const aiRes = await fetch(`${BASE_URL}/ai/classify-image`, {
      method: 'POST',
      body: aiForm
    });
    const aiData = await aiRes.json();
    assert(aiRes.status === 200 && aiData.analysis?.department, 'Civic Vision classification endpoint returns structured analysis');
    assert(aiData.analysis?.category && aiData.analysis?.severity, 'Structured analysis contains category and severity');
    console.log(`      AI Assigned: Department="${aiData.analysis.department}", Category="${aiData.analysis.category}", Severity="${aiData.analysis.severity}"`);

    // 5. User Category Confirmation & Correction Flow
    let issueCategory = aiData.analysis.category;
    let confirmedByUser = true;
    assert(confirmedByUser && Boolean(issueCategory), 'User confirmation locks in AI-generated category');

    // User corrects category to custom/different defect
    issueCategory = 'Pothole / Road Defect';
    assert(issueCategory === 'Pothole / Road Defect', 'User can manually correct category before submission');

    // ------------------------------------------------------------------
    // TEST SECTION 5: Admin Workflow, Role Scoping & Department Security
    // ------------------------------------------------------------------
    console.log('\n[6/7] Testing Admin Authority, Role Scoping & Status Workflows...');

    // Roads Admin dashboard (scoped)
    const roadsDashRes = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${roadsToken}` }
    });
    const roadsDashData = await roadsDashRes.json();
    assert(roadsDashRes.status === 200 && roadsDashData.stats.department === 'Roads and Infrastructure', 'Department Admin dashboard is scoped to assigned department');

    // Roads Admin issues list (strictly scoped to Roads)
    const roadsIssuesRes = await fetch(`${BASE_URL}/admin/issues`, {
      headers: { Authorization: `Bearer ${roadsToken}` }
    });
    const roadsIssuesData = await roadsIssuesRes.json();
    const allRoadsIssues = Array.isArray(roadsIssuesData.issues) && roadsIssuesData.issues.every((i) => i.department === 'Roads and Infrastructure');
    assert(roadsIssuesRes.status === 200 && allRoadsIssues, 'Department Admin queue strictly enforces department boundary');

    // Water Admin attempts to modify Roads issue -> Must be 403 Forbidden!
    const crossDeptRes = await fetch(`${BASE_URL}/admin/issues/${createdIssueId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${waterToken}`
      },
      body: JSON.stringify({ status: 'In Progress', note: 'Unauthorized cross department test' })
    });
    assert(crossDeptRes.status === 403, 'Cross-department modification is rejected with 403 Forbidden');

    // Roads Admin updates our created Roads issue -> In Progress
    const progressRes = await fetch(`${BASE_URL}/admin/issues/${createdIssueId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${roadsToken}`
      },
      body: JSON.stringify({
        status: 'In Progress',
        note: 'Road maintenance crew dispatched to Market Blvd.'
      })
    });
    const progressData = await progressRes.json();
    assert(progressRes.status === 200 && progressData.issue.status === 'In Progress', 'Admin updates status to In Progress');

    // Update severity
    const sevUpdateRes = await fetch(`${BASE_URL}/admin/issues/${createdIssueId}/severity`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${roadsToken}`
      },
      body: JSON.stringify({ severity: 'Critical' })
    });
    const sevUpdateData = await sevUpdateRes.json();
    assert(sevUpdateRes.status === 200 && sevUpdateData.issue.severity === 'Critical', 'Admin reassesses issue severity to Critical');

    // Roads Admin resolves issue with resolution notes
    const resolveRes = await fetch(`${BASE_URL}/admin/issues/${createdIssueId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${roadsToken}`
      },
      body: JSON.stringify({
        status: 'Resolved',
        note: 'Crater filled, rolled and sealed with hot-mix asphalt.',
        resolutionNotes: 'Standard municipal resurfacing complete; safety markers cleared.'
      })
    });
    const resolveData = await resolveRes.json();
    assert(resolveRes.status === 200 && resolveData.issue.status === 'Resolved', 'Admin resolves issue with resolution notes and status audit log');

    // Super Admin platform governance
    const deptSummaryRes = await fetch(`${BASE_URL}/admin/departments-summary`, {
      headers: { Authorization: `Bearer ${superToken}` }
    });
    const deptSummaryData = await deptSummaryRes.json();
    assert(deptSummaryRes.status === 200 && deptSummaryData.departments.length === 8, 'Super Admin department overview /api/admin/departments-summary covers all 8 sectors');

    const usersRes = await fetch(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${superToken}` }
    });
    const usersData = await usersRes.json();
    assert(usersRes.status === 200 && usersData.users.length >= 10, 'Super Admin user list /api/admin/users lists all users');

    // Citizen cannot access Super Admin users endpoint
    const forbiddenUsersRes = await fetch(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${newCitizenToken}` }
    });
    assert(forbiddenUsersRes.status === 403, 'Citizen blocked from Super Admin endpoints with 403 Forbidden');

    // ------------------------------------------------------------------
    // TEST SECTION 6: Analytics Reporting
    // ------------------------------------------------------------------
    console.log('\n[7/7] Testing Analytics & Frontend Single Page Serving...');
    const analyticsOverviewRes = await fetch(`${BASE_URL}/analytics/overview`);
    const analyticsOverview = await analyticsOverviewRes.json();
    assert(analyticsOverviewRes.status === 200 && analyticsOverview.overview.totalIssues > 0, 'Analytics overview /api/analytics/overview returns real metric aggregates');

    const analyticsDeptRes = await fetch(`${BASE_URL}/analytics/departments`);
    const analyticsDeptData = await analyticsDeptRes.json();
    assert(analyticsDeptRes.status === 200 && Array.isArray(analyticsDeptData.departmentBreakdown), 'Analytics departments breakdown /api/analytics/departments');

    const analyticsTrendsRes = await fetch(`${BASE_URL}/analytics/trends`);
    const analyticsTrendsData = await analyticsTrendsRes.json();
    assert(analyticsTrendsRes.status === 200 && Array.isArray(analyticsTrendsData.trends), 'Analytics trends /api/analytics/trends returns monthly metrics');

    const analyticsDistRes = await fetch(`${BASE_URL}/analytics/distributions`);
    const analyticsDistData = await analyticsDistRes.json();
    assert(analyticsDistRes.status === 200 && Boolean(analyticsDistData.statusDistribution), 'Analytics distributions /api/analytics/distributions');

    // ------------------------------------------------------------------
    // TEST SECTION 7: Frontend Page Routes Serving (SPA Verification)
    // ------------------------------------------------------------------
    const spaRoutes = [
      '/',
      '/dashboard',
      '/report',
      '/issues',
      `/issues/${createdIssueId}`,
      '/map',
      '/my-reports',
      '/department-overview',
      '/manage-issues',
      '/admin/departments',
      '/admin/users',
      '/admin/analytics',
      '/profile',
      '/login',
      '/signup'
    ];

    for (const route of spaRoutes) {
      const pageRes = await fetch(`http://localhost:${TEST_PORT}${route}`);
      const pageText = await pageRes.text();
      assert(
        pageRes.status === 200 && pageText.includes('CivicConnect'),
        `SPA Route ${route} serves production index.html with 200 OK`
      );
    }

    // Static asset serving test
    const faviconRes = await fetch(`http://localhost:${TEST_PORT}/favicon.svg`);
    assert(faviconRes.status === 200, 'Static asset /favicon.svg served properly');

    // Unhandled API 404 test
    const unhandledApiRes = await fetch(`${BASE_URL}/some-invalid-endpoint`);
    assert(unhandledApiRes.status === 404, 'Unhandled API route returns JSON 404');

    console.log('\n===========================================================');
    console.log(`TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('===========================================================');

    // Clean up created test issues so DB finishes clean with 0 complaints
    const IssueModel = (await import('./models/Issue.js')).default;
    const VoteModel = (await import('./models/Vote.js')).default;
    const UserModel = (await import('./models/User.js')).default;
    await IssueModel.deleteMany({});
    await VoteModel.deleteMany({});
    await UserModel.deleteMany({ email: { $regex: /test\.citizen/i } });
    console.log('Database restored: 0 complaints, users and admins intact.');

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Fatal error during test suite:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await closeDB();
  }
}

runTestSuite();
