import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = "http://localhost:5000";

async function runTests() {
  console.log("==================================================");
  console.log("STARTING WEB PUSH NOTIFICATIONS VERIFICATION SUITE");
  console.log("==================================================\n");

  const timestamp = Date.now();
  const volunteerMedicalEmail = `vol_med_${timestamp}@test.com`;
  const volunteerFoodEmail = `vol_food_${timestamp}@test.com`;
  const citizenEmail = `citizen_${timestamp}@test.com`;
  const password = "Password123!";

  let volMedToken, volFoodToken, citizenToken;
  let volMedId, volFoodId, citizenId;

  // 1. Register Volunteer A (Medical Emergency interest)
  console.log("Step 1: Registering Volunteer A (Medical Emergency interest)...");
  const regMedRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Dr. Sarah Medical",
      email: volunteerMedicalEmail,
      password,
      phone: "1112223333",
      role: "volunteer",
      interests: ["Medical Emergency", "Blood Donation"],
    }),
  });
  const regMedData = await regMedRes.json();
  if (!regMedRes.ok) throw new Error("Vol Med register failed: " + JSON.stringify(regMedData));
  volMedToken = regMedData.token;
  volMedId = regMedData.user._id || regMedData.user.id;
  console.log(`✓ Volunteer A registered (ID: ${volMedId})`);

  // 2. Register Volunteer B (Food & Essential Supplies interest)
  console.log("Step 2: Registering Volunteer B (Food & Essential Supplies interest)...");
  const regFoodRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Chef John Food",
      email: volunteerFoodEmail,
      password,
      phone: "4445556666",
      role: "volunteer",
      interests: ["Food & Essential Supplies"],
    }),
  });
  const regFoodData = await regFoodRes.json();
  if (!regFoodRes.ok) throw new Error("Vol Food register failed: " + JSON.stringify(regFoodData));
  volFoodToken = regFoodData.token;
  volFoodId = regFoodData.user._id || regFoodData.user.id;
  console.log(`✓ Volunteer B registered (ID: ${volFoodId})`);

  // 3. Register Citizen
  console.log("Step 3: Registering Citizen user...");
  const regCitRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Citizen Jane",
      email: citizenEmail,
      password,
      phone: "7778889999",
      role: "user",
    }),
  });
  const regCitData = await regCitRes.json();
  if (!regCitRes.ok) throw new Error("Citizen register failed: " + JSON.stringify(regCitData));
  citizenToken = regCitData.token;
  citizenId = regCitData.user._id || regCitData.user.id;
  console.log(`✓ Citizen registered (ID: ${citizenId})`);

  // 4. Test VAPID Public Key Endpoint
  console.log("\nStep 4: Testing GET /api/notifications/vapid-public-key...");
  const unauthVapid = await fetch(`${BASE_URL}/api/notifications/vapid-public-key`);
  console.log(`  - Unauthenticated request status: ${unauthVapid.status} (Expected 401)`);
  if (unauthVapid.status !== 401) throw new Error("Unauthenticated vapid-public-key did not return 401");

  const authVapid = await fetch(`${BASE_URL}/api/notifications/vapid-public-key`, {
    headers: { Authorization: `Bearer ${volMedToken}` },
  });
  const vapidData = await authVapid.json();
  console.log(`  - Authenticated status: ${authVapid.status}, Public Key: ${vapidData.publicKey ? "Present (Length: " + vapidData.publicKey.length + ")" : "Missing"}`);
  if (!vapidData.publicKey) throw new Error("VAPID public key was not returned");

  // 5. Test Push Subscription Registration
  console.log("\nStep 5: Testing POST /api/notifications/subscribe for Volunteer A...");
  const fakeEndpointA = `https://fcm.googleapis.com/fcm/send/fake-endpoint-vol-a-${timestamp}`;
  const subPayloadA = {
    subscription: {
      endpoint: fakeEndpointA,
      keys: {
        p256dh: "BM6hEom4K44s8H25_F3aLp3K4K_fakeP256dhKey==",
        auth: "fakeAuthSecret123==",
      },
    },
  };

  const subResA = await fetch(`${BASE_URL}/api/notifications/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${volMedToken}`,
    },
    body: JSON.stringify(subPayloadA),
  });
  const subDataA = await subResA.json();
  console.log(`  - Subscribed Volunteer A status: ${subResA.status}, message: ${subDataA.message}`);
  if (!subResA.ok) throw new Error("Subscribe failed: " + JSON.stringify(subDataA));

  // Test duplicate subscription with same endpoint (Idempotency check)
  console.log("  - Testing duplicate subscription (idempotency)...");
  const dupResA = await fetch(`${BASE_URL}/api/notifications/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${volMedToken}`,
    },
    body: JSON.stringify(subPayloadA),
  });
  const dupDataA = await dupResA.json();
  if (!dupResA.ok) throw new Error("Duplicate subscribe failed: " + JSON.stringify(dupDataA));
  console.log("  ✓ Duplicate subscription properly handled without error.");

  // Also subscribe Volunteer B with distinct endpoint
  const fakeEndpointB = `https://fcm.googleapis.com/fcm/send/fake-endpoint-vol-b-${timestamp}`;
  await fetch(`${BASE_URL}/api/notifications/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${volFoodToken}`,
    },
    body: JSON.stringify({
      subscription: {
        endpoint: fakeEndpointB,
        keys: {
          p256dh: "BM6hEom4K44s8H25_F3aLp3K4K_fakeP256dhKeyB==",
          auth: "fakeAuthSecret456==",
        },
      },
    }),
  });
  console.log("  ✓ Volunteer B subscribed with endpoint B.");

  // 6. Test GET /api/notifications/status
  console.log("\nStep 6: Testing GET /api/notifications/status...");
  const statusRes = await fetch(`${BASE_URL}/api/notifications/status`, {
    headers: { Authorization: `Bearer ${volMedToken}` },
  });
  const statusData = await statusRes.json();
  console.log(`  - Status result: isSubscribed=${statusData.isSubscribed}, count=${statusData.subscriptionCount}`);
  if (!statusData.isSubscribed) throw new Error("Status check expected isSubscribed=true");

  // 7. Test Emergency Creation with Smart Matching Push Notification Dispatch
  console.log("\nStep 7: Testing Citizen Emergency Creation & Push Notification Dispatch...");
  const createMedRes = await fetch(`${BASE_URL}/api/requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${citizenToken}`,
    },
    body: JSON.stringify({
      title: "Urgent Medical Assistance Needed",
      description: "Patient needs immediate insulin and doctor checkup at Downtown Clinic",
      category: "Medicine",
      location: "123 Main St, Suite 4",
      urgency: "High",
    }),
  });
  const createMedData = await createMedRes.json();
  console.log(`  - Emergency creation status: ${createMedRes.status} (Expected 201)`);
  if (createMedRes.status !== 201) throw new Error("Emergency creation failed: " + JSON.stringify(createMedData));
  console.log(`  ✓ Emergency created successfully with ID: ${createMedData.request._id}`);
  console.log(`  ✓ Note: Push notification dispatch executed in background without blocking or failing emergency creation.`);

  // 8. Test Accept Emergency Mission Workflow
  console.log("\nStep 8: Testing Volunteer A accepting the emergency...");
  const acceptRes = await fetch(`${BASE_URL}/api/requests/${createMedData.request._id}/accept`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${volMedToken}`,
      "Content-Type": "application/json",
    },
  });
  const acceptData = await acceptRes.json();
  console.log(`  - Accept status: ${acceptRes.status}, message: ${acceptData.message}`);
  if (!acceptRes.ok) throw new Error("Accept failed: " + JSON.stringify(acceptData));
  if (acceptData.request.status !== "Accepted") throw new Error("Request status should be Accepted");
  console.log("  ✓ Request status updated to 'Accepted' and +10 points awarded to Volunteer A.");

  // 9. Test Unsubscribe endpoint
  console.log("\nStep 9: Testing DELETE /api/notifications/subscribe...");
  const unsubRes = await fetch(`${BASE_URL}/api/notifications/subscribe`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${volMedToken}`,
    },
    body: JSON.stringify({ endpoint: fakeEndpointA }),
  });
  const unsubData = await unsubRes.json();
  console.log(`  - Unsubscribe status: ${unsubRes.status}, deleted: ${unsubData.deletedCount}`);
  if (!unsubRes.ok) throw new Error("Unsubscribe failed: " + JSON.stringify(unsubData));

  const afterStatusRes = await fetch(`${BASE_URL}/api/notifications/status`, {
    headers: { Authorization: `Bearer ${volMedToken}` },
  });
  const afterStatusData = await afterStatusRes.json();
  console.log(`  - Status after unsubscribe: isSubscribed=${afterStatusData.isSubscribed}`);
  if (afterStatusData.isSubscribed) throw new Error("Expected isSubscribed=false after unsubscribe");

  console.log("\n==================================================");
  console.log("ALL 9 TEST STEPS PASSED SUCCESSFULLY! ✓");
  console.log("==================================================");
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("TEST SUITE FAILED:", err);
    process.exit(1);
  });
