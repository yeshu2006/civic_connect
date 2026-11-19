const BASE_URL = process.env.API_URL || (process.env.PORT ? `http://localhost:${process.env.PORT}/api` : 'http://localhost:5000/api');

async function runTests() {
  console.log('--- Starting CivicConnect End-to-End Test Suite ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    assert(healthRes.status === 200 && health.status === 'ok', 'Server health check returns ok');

    // 2. Authentication: Login as Citizen
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alex.citizen@gmail.com',
        password: 'Password123!'
      })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && Boolean(loginData.token), 'Citizen login returns valid JWT token');
    const citizenToken = loginData.token;
    const citizenHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${citizenToken}`
    };

    // 3. Me endpoint verification
    const meRes = await fetch(`${BASE_URL}/auth/me`, { headers: citizenHeaders });
    const meData = await meRes.json();
    assert(meData.user.email === 'alex.citizen@gmail.com', 'GetMe returns authenticated user profile');

    // 4. Analytics Overview
    const analyticsRes = await fetch(`${BASE_URL}/analytics/overview`);
    const analytics = await analyticsRes.json();
    assert(analytics.overview.totalIssues > 0, 'Platform analytics retrieves real MongoDB issue counts');

    // 5. Issues listing
    const issuesRes = await fetch(`${BASE_URL}/issues`);
    const issuesData = await issuesRes.json();
    assert(issuesData.issues.length > 0, 'Public issues endpoint returns seeded issues');
    const targetIssue = issuesData.issues[0];

    // 6. Duplicate detection test near targetIssue
    const [lon, lat] = targetIssue.location.coordinates;
    const dupRes = await fetch(`${BASE_URL}/issues/check-duplicates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        longitude: lon + 0.0001,
        latitude: lat + 0.0001,
        department: targetIssue.department,
        title: targetIssue.title,
        description: targetIssue.description,
        radiusMeters: 500
      })
    });
    const dupData = await dupRes.json();
    assert(dupData.duplicates.length > 0, 'Duplicate detection identifies nearby similar issue');

    // 7. Create a new issue by Citizen
    const newIssueRes = await fetch(`${BASE_URL}/issues`, {
      method: 'POST',
      headers: citizenHeaders,
      body: JSON.stringify({
        title: 'Broken Stormwater Canal Grate on Oak Street',
        description: 'Storm drain grating collapsed creating hazardous opening.',
        department: 'Drainage',
        severity: 'High',
        category: 'Drainage Defect',
        address: '420 Oak Street',
        latitude: 37.773,
        longitude: -122.422
      })
    });
    const newIssueData = await newIssueRes.json();
    assert(newIssueRes.status === 201 && newIssueData.issue._id, 'Citizen creates new civic issue report');
    const createdIssueId = newIssueData.issue._id;

    // 8. Voting: Citizen upvotes the newly created issue
    const voteRes = await fetch(`${BASE_URL}/issues/${createdIssueId}/vote`, {
      method: 'POST',
      headers: citizenHeaders
    });
    const voteData = await voteRes.json();
    assert(voteData.votes === 1 && voteData.hasVoted === true, 'Upvoting increments vote counter');

    // 9. Prevent duplicate vote: Citizen tries to vote again on same issue
    const dupVoteRes = await fetch(`${BASE_URL}/issues/${createdIssueId}/vote`, {
      method: 'POST',
      headers: citizenHeaders
    });
    assert(dupVoteRes.status === 400, 'Prevent duplicate voting from same user enforces 400 rejection');

    // 10. Unvote: Citizen removes vote
    const unvoteRes = await fetch(`${BASE_URL}/issues/${createdIssueId}/vote`, {
      method: 'DELETE',
      headers: citizenHeaders
    });
    const unvoteData = await unvoteRes.json();
    assert(unvoteData.votes === 0 && unvoteData.hasVoted === false, 'Unvoting decrements vote counter');

    // 11. Role-based Authorization: Roads Admin login
    const roadsLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'roads.admin@civicconnect.org',
        password: 'Password123!'
      })
    });
    const roadsData = await roadsLogin.json();
    const roadsToken = roadsData.token;
    const roadsHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${roadsToken}`
    };

    // Roads Admin attempts to update Drainage issue -> Should be FORBIDDEN (403)
    const unauthorizedRes = await fetch(`${BASE_URL}/admin/issues/${createdIssueId}/status`, {
      method: 'PATCH',
      headers: roadsHeaders,
      body: JSON.stringify({
        status: 'In Progress',
        note: 'Attempting cross-department update'
      })
    });
    assert(unauthorizedRes.status === 403, 'Cross-department modification is rejected with 403 Forbidden');

    // 12. Super Admin login
    const superAdminLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@civicconnect.org',
        password: 'Password123!'
      })
    });
    const superData = await superAdminLogin.json();
    const superToken = superData.token;
    const superHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superToken}`
    };

    // Super Admin updates issue status
    const statusUpdateRes = await fetch(`${BASE_URL}/admin/issues/${createdIssueId}/status`, {
      method: 'PATCH',
      headers: superHeaders,
      body: JSON.stringify({
        status: 'In Progress',
        note: 'Super Admin assigned specialized drainage crew.'
      })
    });
    const statusUpdateData = await statusUpdateRes.json();
    assert(statusUpdateData.issue.status === 'In Progress', 'Super Admin updates status to In Progress');
    assert(statusUpdateData.issue.statusHistory.length >= 2, 'Status history maintains immutable audit log');

    // 13. Super Admin resolves issue with resolution notes
    const resolveRes = await fetch(`${BASE_URL}/admin/issues/${createdIssueId}/status`, {
      method: 'PATCH',
      headers: superHeaders,
      body: JSON.stringify({
        status: 'Resolved',
        note: 'Cast iron grate replaced and reinforced.',
        resolutionNotes: 'Heavy-duty steel replacement installed on Oak St drain.'
      })
    });
    const resolveData = await resolveRes.json();
    assert(resolveData.issue.status === 'Resolved', 'Issue successfully resolved with resolution evidence');

    // 14. Super Admin checks department summary
    const deptSummaryRes = await fetch(`${BASE_URL}/admin/departments-summary`, {
      headers: superHeaders
    });
    const deptSummaryData = await deptSummaryRes.json();
    assert(deptSummaryData.departments.length === 8, 'Super Admin department summary covers all 8 municipal sectors');

    // 15. Super Admin user management
    const userListRes = await fetch(`${BASE_URL}/admin/users`, {
      headers: superHeaders
    });
    const userListData = await userListRes.json();
    assert(userListData.users.length >= 10, 'Super Admin lists registered users and administrators');

    console.log(`\n==============================================`);
    console.log(`All Tests Finished: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==============================================`);
  } catch (err) {
    console.error('Fatal test error:', err);
  }
}

runTests();
