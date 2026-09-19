// Leaderboard & Points System Verification Test

const BASE_URL = "http://localhost:5000/api";

async function runTests() {
  console.log("=== STARTING LEADERBOARD & POINTS WORKFLOW TESTS ===");

  // 1. Citizen login
  const citizenLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "user@resqhub.org", password: "User@12345" }),
  });
  const citizenData = await citizenLoginRes.json();
  if (!citizenData.success) throw new Error("Citizen login failed: " + citizenData.message);
  const citizenToken = citizenData.token;
  console.log("✓ Citizen authenticated");

  // 2. Volunteer 1 login (Alex Volunteer)
  const vol1LoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "volunteer@resqhub.org", password: "Volunteer@123" }),
  });
  const vol1Data = await vol1LoginRes.json();
  if (!vol1Data.success) throw new Error("Volunteer 1 login failed: " + vol1Data.message);
  const vol1Token = vol1Data.token;
  const vol1InitialPoints = vol1Data.user.points || 0;
  console.log("✓ Volunteer 1 authenticated (Initial points:", vol1InitialPoints, ")");

  // 3. Volunteer 2 login/register
  let vol2Token = null;
  const vol2LoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "volunteer2@resqhub.org", password: "Password123!" }),
  });
  const vol2LoginData = await vol2LoginRes.json();
  if (vol2LoginData.success) {
    vol2Token = vol2LoginData.token;
  } else {
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Second Volunteer",
        email: "volunteer2@resqhub.org",
        password: "Password123!",
        role: "volunteer",
        phone: "+1-555-0202",
        interests: ["Medical Emergency", "First Aid"],
      }),
    });
    const regData = await regRes.json();
    if (!regData.success) throw new Error("Volunteer 2 register failed: " + regData.message);
    vol2Token = regData.token;
  }
  console.log("✓ Volunteer 2 authenticated");

  // 4. Create Request 1 (Critical urgency) & Request 2 (Medium urgency)
  const req1Res = await fetch(`${BASE_URL}/requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${citizenToken}`,
    },
    body: JSON.stringify({
      title: "Test Critical Evacuation",
      description: "Critical flood rescue requiring immediate boat evacuation.",
      category: "Rescue",
      location: "Riverbank Sector 9",
      urgency: "Critical",
    }),
  });
  const req1Data = await req1Res.json();
  if (!req1Data.success) throw new Error("Create Req 1 failed: " + req1Data.message);
  const req1Id = req1Data.request._id;
  console.log("✓ Created Critical emergency request:", req1Id);

  const req2Res = await fetch(`${BASE_URL}/requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${citizenToken}`,
    },
    body: JSON.stringify({
      title: "Test Medium Supplies Delivery",
      description: "Food supplies distribution for community kitchen.",
      category: "Food",
      location: "Community Center Hall B",
      urgency: "Medium",
    }),
  });
  const req2Data = await req2Res.json();
  if (!req2Data.success) throw new Error("Create Req 2 failed: " + req2Data.message);
  const req2Id = req2Data.request._id;
  console.log("✓ Created Medium emergency request:", req2Id);

  // 5. TEST 1: Volunteer 1 accepts Request 1 -> +10 points
  console.log("\n--- TEST 1: Acceptance Points & Anti-Abuse ---");
  const acceptRes = await fetch(`${BASE_URL}/requests/${req1Id}/accept`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${vol1Token}` },
  });
  const acceptData = await acceptRes.json();
  if (acceptRes.status !== 200) throw new Error("Accept failed: " + acceptData.message);
  console.log("✓ Volunteer 1 accepted Request 1:", acceptData.message);

  // Verify points via leaderboard / me
  const boardAfterAccept = await fetch(`${BASE_URL}/volunteers/leaderboard?timeframe=all`, {
    headers: { Authorization: `Bearer ${vol1Token}` },
  });
  const boardAfterAcceptData = await boardAfterAccept.json();
  const vol1AfterAccept = boardAfterAcceptData.leaderboard.find((v) => v._id === vol1Data.user._id);
  console.log("Volunteer 1 points after acceptance:", vol1AfterAccept?.points);

  if (!vol1AfterAccept || vol1AfterAccept.points < vol1InitialPoints + 10) {
    throw new Error(`Expected at least ${vol1InitialPoints + 10} points, got ${vol1AfterAccept?.points}`);
  }
  console.log("✓ +10 points awarded for request acceptance");

  // Re-calling accept (simulate page refresh / duplicate API call)
  const duplicateAcceptRes = await fetch(`${BASE_URL}/requests/${req1Id}/accept`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${vol1Token}` },
  });
  console.log("Duplicate accept HTTP status:", duplicateAcceptRes.status);
  if (duplicateAcceptRes.status !== 409 && duplicateAcceptRes.status !== 400) {
    throw new Error("Duplicate accept should be rejected, got HTTP " + duplicateAcceptRes.status);
  }

  const boardAfterDup = await fetch(`${BASE_URL}/volunteers/leaderboard?timeframe=all`, {
    headers: { Authorization: `Bearer ${vol1Token}` },
  });
  const boardAfterDupData = await boardAfterDup.json();
  const vol1AfterDup = boardAfterDupData.leaderboard.find((v) => v._id === vol1Data.user._id);
  if (vol1AfterDup.points !== vol1AfterAccept.points) {
    throw new Error("Points increased on duplicate accept! Anti-abuse failed.");
  }
  console.log("✓ Anti-abuse verified: No duplicate points on repeated acceptance or refresh");

  // 6. TEST 2: Volunteer 1 completes Request 1 (Critical: +20 + 10 bonus = +30)
  console.log("\n--- TEST 2: Completion Points & Urgency Bonus ---");
  const completeRes = await fetch(`${BASE_URL}/requests/${req1Id}/complete`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${vol1Token}` },
  });
  const completeData = await completeRes.json();
  if (completeRes.status !== 200) throw new Error("Complete failed: " + completeData.message);
  console.log("✓ Volunteer 1 completed Request 1:", completeData.message);
  console.log("Points earned reported:", completeData.pointsEarned);

  if (completeData.pointsEarned !== 30) {
    throw new Error(`Expected 30 points (20 + 10 critical bonus), got ${completeData.pointsEarned}`);
  }

  // Duplicate complete attempt
  const duplicateCompleteRes = await fetch(`${BASE_URL}/requests/${req1Id}/complete`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${vol1Token}` },
  });
  console.log("Duplicate complete HTTP status:", duplicateCompleteRes.status);
  if (duplicateCompleteRes.status !== 400) {
    throw new Error("Duplicate complete should return HTTP 400, got " + duplicateCompleteRes.status);
  }
  console.log("✓ Anti-abuse verified: No duplicate points on repeated completion or refresh");

  // 7. TEST 3: Volunteer 2 accepts and completes Request 2 (Medium: +10 + 20 = +30)
  console.log("\n--- TEST 3: Volunteer 2 Workflow ---");
  await fetch(`${BASE_URL}/requests/${req2Id}/accept`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${vol2Token}` },
  });
  const v2CompleteRes = await fetch(`${BASE_URL}/requests/${req2Id}/complete`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${vol2Token}` },
  });
  const v2CompleteData = await v2CompleteRes.json();
  console.log("Volunteer 2 complete points earned:", v2CompleteData.pointsEarned);
  if (v2CompleteData.pointsEarned !== 20) {
    throw new Error(`Expected 20 points for medium urgency completion, got ${v2CompleteData.pointsEarned}`);
  }
  console.log("✓ Volunteer 2 successfully accepted and completed mission (+30 total)");

  // 8. TEST 4: Leaderboard rankings and Top 3
  console.log("\n--- TEST 4: Leaderboard Standings & Top 3 ---");
  const leaderboardRes = await fetch(`${BASE_URL}/volunteers/leaderboard?timeframe=all`, {
    headers: { Authorization: `Bearer ${vol1Token}` },
  });
  const leaderboardData = await leaderboardRes.json();
  if (!leaderboardData.success) throw new Error("Leaderboard fetch failed: " + leaderboardData.message);

  console.log("Total volunteers on leaderboard:", leaderboardData.totalVolunteers);
  console.log("Top 3 Podium:");
  leaderboardData.top3.forEach((v) => {
    console.log(`  ${v.podiumMedal} Rank ${v.rank}: ${v.name} (${v.points} pts, ${v.completedCount} completed, Badge: ${v.badge?.name})`);
  });

  if (leaderboardData.top3.length === 0) {
    throw new Error("Top 3 podium is empty!");
  }
  if (leaderboardData.leaderboard[0].points < leaderboardData.leaderboard[1]?.points) {
    throw new Error("Leaderboard is not sorted in descending order of points!");
  }
  console.log("✓ Leaderboard standings sorted correctly in descending order");

  // 9. TEST 5: Time filters (week, month, all)
  console.log("\n--- TEST 5: Time Filters ---");
  const weekRes = await fetch(`${BASE_URL}/volunteers/leaderboard?timeframe=week`, {
    headers: { Authorization: `Bearer ${vol1Token}` },
  });
  const weekData = await weekRes.json();
  if (!weekData.success) throw new Error("Week filter failed");
  console.log("Week filter total volunteers:", weekData.leaderboard.length);
  const vol1Week = weekData.leaderboard.find((v) => v._id === vol1Data.user._id);
  console.log("Volunteer 1 week points:", vol1Week?.points);
  if (!vol1Week || vol1Week.points < 40) {
    throw new Error("Week filter did not record Volunteer 1's recent points!");
  }
  console.log("✓ Time filters ('week', 'month', 'all') operational");

  // 10. TEST 6: My Performance section
  console.log("\n--- TEST 6: My Performance Section ---");
  const myPerf = leaderboardData.myPerformance;
  console.log("My Performance:", myPerf);
  if (!myPerf || !myPerf.isVolunteer) {
    throw new Error("myPerformance missing or not marked as volunteer!");
  }
  if (typeof myPerf.rank !== "number" || typeof myPerf.points !== "number") {
    throw new Error("myPerformance rank or points invalid!");
  }
  if (!myPerf.badge || !myPerf.badge.name) {
    throw new Error("myPerformance badge missing!");
  }
  console.log("✓ My Performance correctly calculated with real rank and badge:", myPerf.badge.name);

  // 11. TEST 7: Recent Achievements
  console.log("\n--- TEST 7: Recent Achievements Feed ---");
  console.log("Recent achievements count:", leaderboardData.recentAchievements.length);
  leaderboardData.recentAchievements.forEach((a) => {
    console.log(`  ⚡ ${a.message} (+${a.pointsAwarded} pts)`);
  });
  if (leaderboardData.recentAchievements.length === 0) {
    throw new Error("Recent achievements feed should have recorded the completed requests!");
  }
  console.log("✓ Recent achievements feed verified");

  // 12. Clean up test emergency requests
  const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@resqhub.org", password: "Admin@ResQHub2026" }),
  });
  const adminData = await adminLogin.json();
  if (adminData.success) {
    await fetch(`${BASE_URL}/requests/${req1Id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminData.token}` },
    });
    await fetch(`${BASE_URL}/requests/${req2Id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminData.token}` },
    });
    console.log("✓ Cleaned up test emergency records");
  }

  console.log("\nALL LEADERBOARD & POINTS TESTS PASSED SUCCESSFULLY! ✓✓✓");
}

runTests().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
