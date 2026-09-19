import mongoose from "mongoose";
import dotenv from "dotenv";
import { performance } from "perf_hooks";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import EmergencyRequest from "../models/EmergencyRequest.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const API_BASE = `http://localhost:${PORT}`;
const ENDPOINT_PATH = "/api/requests/available";
const FULL_API_URL = `${API_BASE}${ENDPOINT_PATH}`;

console.log("=================================================================");
console.log("    RESQHUB SYSTEM PERFORMANCE BENCHMARK - BUILDATHON CHALLENGE  ");
console.log("=================================================================\n");

// Step 1: Connect to MongoDB using application configuration
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/resqhub";
console.log(`[Database] Connecting to MongoDB: ${MONGO_URI}`);
await mongoose.connect(MONGO_URI);
console.log("[Database] Connected successfully to MongoDB.\n");

// Step 2: Ensure the Express API service is running on port 5000
async function ensureApiService() {
  console.log(`[API Pre-flight] Checking health at ${API_BASE}/api/health...`);
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (res.ok) {
      const data = await res.json();
      console.log(`✓ API service is reachable (${res.status} OK): "${data.message}"`);
      return;
    }
  } catch (_e) {
    // Service not running externally; dynamically start Express app in-process
  }

  console.log(`[API Pre-flight] Server not detected on port ${PORT}. Starting ResQHub Express backend...`);
  await import("../server.js");
  
  // Wait up to 5 seconds for HTTP listener to be ready
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      await new Promise((r) => setTimeout(r, 500));
      const res = await fetch(`${API_BASE}/api/health`);
      if (res.ok) {
        console.log(`✓ API service successfully started and reachable on port ${PORT}.\n`);
        return;
      }
    } catch (_err) {
      // Keep waiting
    }
  }

  throw new Error(`Failed to establish connection to API service on ${API_BASE}.`);
}

await ensureApiService();

// Step 3: Verify dataset and authenticated volunteer session
const totalRequests = await EmergencyRequest.countDocuments();
const pendingVerified = await EmergencyRequest.countDocuments({ status: { $in: ["Pending", "Verified"] } });

console.log(`[Dataset] Total Emergency Requests in MongoDB: ${totalRequests}`);
console.log(`[Dataset] Available (Pending/Verified) Incidents: ${pendingVerified}`);

if (totalRequests === 0) {
  console.error("Error: Database has 0 emergency requests. Please run seed or ensure database is populated.");
  process.exit(1);
}

// Find or select a real volunteer responder for testing
let volunteer = await User.findOne({ role: "volunteer" });
if (!volunteer) {
  volunteer = await User.findOne();
}

// Generate valid JWT token for authenticated volunteer dispatch request
const JWT_SECRET = process.env.JWT_SECRET || "resqhub_dev_secret_key_2026_super_secure";
const authToken = jwt.sign({ id: volunteer._id }, JWT_SECRET, { expiresIn: "2h" });

console.log(`[Auth] Authenticated as volunteer responder: "${volunteer.name}" (${volunteer.email})`);
console.log(`[Auth] Registered Areas of Interest: ${JSON.stringify(volunteer.interests || [])}`);
console.log(`[Benchmark Target] Full HTTP Endpoint: ${FULL_API_URL}\n`);

// Helper to make authenticated HTTP GET requests
async function makeApiCall(isUnoptimized = false, parseBody = false) {
  const url = isUnoptimized ? `${FULL_API_URL}?unoptimized=true` : FULL_API_URL;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API returned HTTP ${res.status}: ${errorText}`);
  }

  const serverTime = parseFloat(res.headers.get("X-Response-Time-Ms")) || null;
  const data = parseBody ? await res.json() : await res.arrayBuffer();

  return { data, serverTime };
}

// ----------------------------------------------------------------------
// PHASE 1: BENCHMARKING BEFORE OPTIMIZATION (HTTP API CALLS)
// ----------------------------------------------------------------------
console.log("-----------------------------------------------------------------");
console.log("PHASE 1: BENCHMARKING BEFORE OPTIMIZATION (Original HTTP Endpoint)");
console.log("-----------------------------------------------------------------");

// Drop compound index to reflect baseline unoptimized state
try {
  await EmergencyRequest.collection.dropIndex("status_1_createdAt_-1");
  console.log("Baseline state: Dropped compound index { status: 1, createdAt: -1 }.");
} catch (_e) {
  // Index didn't exist, already in baseline state
}

console.log("Running 3 warm-up HTTP requests to eliminate cold-start variances...");
for (let i = 0; i < 3; i++) {
  await makeApiCall(true);
  await new Promise((r) => setTimeout(r, 40));
}

console.log("Collecting 20 high-resolution measurements (performance.now())...");
const beforeRuns = [];
const beforeServerRuns = [];
for (let i = 1; i <= 20; i++) {
  const t0 = performance.now();
  const { serverTime } = await makeApiCall(true);
  const t1 = performance.now();
  const elapsed = Number((t1 - t0).toFixed(2));
  beforeRuns.push(elapsed);
  if (serverTime !== null) beforeServerRuns.push(serverTime);
  console.log(`  Run ${String(i).padStart(2, " ")}: ${elapsed.toFixed(2)} ms${serverTime ? ` (server execution: ${serverTime.toFixed(2)} ms)` : ""}`);
  await new Promise((r) => setTimeout(r, 40));
}

const beforeAvg = Number((beforeRuns.reduce((a, b) => a + b, 0) / beforeRuns.length).toFixed(2));
const beforeMin = Math.min(...beforeRuns);
const beforeMax = Math.max(...beforeRuns);
const sortedB = [...beforeRuns].sort((a, b) => a - b);
const beforeMedian = Number(((sortedB[9] + sortedB[10]) / 2).toFixed(2));
const beforeServerAvg = beforeServerRuns.length ? Number((beforeServerRuns.reduce((a, b) => a + b, 0) / beforeServerRuns.length).toFixed(2)) : null;

console.log(`\n>> BEFORE Average: ${beforeAvg.toFixed(2)} ms | Min: ${beforeMin.toFixed(2)} ms | Max: ${beforeMax.toFixed(2)} ms | Median: ${beforeMedian.toFixed(2)} ms`);
if (beforeServerAvg) {
  console.log(`   (Server execution avg: ${beforeServerAvg.toFixed(2)} ms)`);
}
console.log("");

// ----------------------------------------------------------------------
// APPLY OPTIMIZATION: Create compound index & switch to .lean() path
// ----------------------------------------------------------------------
console.log("-----------------------------------------------------------------");
console.log("APPLYING OPTIMIZATION: Compound index + .lean() + single-pass parsing");
console.log("-----------------------------------------------------------------");
await EmergencyRequest.collection.createIndex({ status: 1, createdAt: -1 });
console.log("✓ Compound index { status: 1, createdAt: -1 } created on MongoDB collection.");
console.log("✓ Controller switches to high-speed .lean() and single-pass Smart Match.\n");

// ----------------------------------------------------------------------
// PHASE 2: VERIFY EQUIVALENCE
// ----------------------------------------------------------------------
console.log("-----------------------------------------------------------------");
console.log("PHASE 2: VERIFYING HTTP RESPONSE EQUIVALENCE");
console.log("-----------------------------------------------------------------");
const { data: sampleBefore } = await makeApiCall(true, true);
const { data: sampleAfter } = await makeApiCall(false, true);

const countMatch = sampleBefore.count === sampleAfter.count;
const recCountMatch = sampleBefore.recommended.length === sampleAfter.recommended.length;
const otherCountMatch = sampleBefore.other.length === sampleAfter.other.length;

let orderingAndScoresMatch = true;
let mismatchDetail = null;

for (let i = 0; i < sampleBefore.recommended.length; i++) {
  const b = sampleBefore.recommended[i];
  const a = sampleAfter.recommended[i];
  if (
    String(b._id) !== String(a._id) ||
    b.matchScore !== a.matchScore ||
    b.matchReason !== a.matchReason
  ) {
    orderingAndScoresMatch = false;
    mismatchDetail = { index: i, before: { id: b._id, score: b.matchScore }, after: { id: a._id, score: a.matchScore } };
    break;
  }
}

console.log(`1. Total count matches:          ${countMatch ? "PASSED ✓" : "FAILED ✗"} (${sampleBefore.count} vs ${sampleAfter.count})`);
console.log(`2. Recommended count matches:    ${recCountMatch ? "PASSED ✓" : "FAILED ✗"} (${sampleBefore.recommended.length} vs ${sampleAfter.recommended.length})`);
console.log(`3. Other count matches:          ${otherCountMatch ? "PASSED ✓" : "FAILED ✗"} (${sampleBefore.other.length} vs ${sampleAfter.other.length})`);
console.log(`4. Items, scores, reasons match: ${orderingAndScoresMatch ? "PASSED ✓" : "FAILED ✗"}`);

if (!countMatch || !recCountMatch || !orderingAndScoresMatch) {
  console.error("FATAL: Equivalence check failed!", mismatchDetail);
  process.exit(1);
}

// ----------------------------------------------------------------------
// PHASE 3: BENCHMARKING AFTER OPTIMIZATION (HTTP API CALLS)
// ----------------------------------------------------------------------
console.log("\n-----------------------------------------------------------------");
console.log("PHASE 3: BENCHMARKING AFTER OPTIMIZATION (Optimized HTTP Endpoint)");
console.log("-----------------------------------------------------------------");

console.log("Running 3 warm-up HTTP requests...");
for (let i = 0; i < 3; i++) {
  await makeApiCall(false);
  await new Promise((r) => setTimeout(r, 40));
}

console.log("Collecting 20 high-resolution measurements (performance.now())...");
const afterRuns = [];
const afterServerRuns = [];
for (let i = 1; i <= 20; i++) {
  const t0 = performance.now();
  const { serverTime } = await makeApiCall(false);
  const t1 = performance.now();
  const elapsed = Number((t1 - t0).toFixed(2));
  afterRuns.push(elapsed);
  if (serverTime !== null) afterServerRuns.push(serverTime);
  console.log(`  Run ${String(i).padStart(2, " ")}: ${elapsed.toFixed(2)} ms${serverTime ? ` (server execution: ${serverTime.toFixed(2)} ms)` : ""}`);
  await new Promise((r) => setTimeout(r, 40));
}

const afterAvg = Number((afterRuns.reduce((a, b) => a + b, 0) / afterRuns.length).toFixed(2));
const afterMin = Math.min(...afterRuns);
const afterMax = Math.max(...afterRuns);
const sortedA = [...afterRuns].sort((a, b) => a - b);
const afterMedian = Number(((sortedA[9] + sortedA[10]) / 2).toFixed(2));
const afterServerAvg = afterServerRuns.length ? Number((afterServerRuns.reduce((a, b) => a + b, 0) / afterServerRuns.length).toFixed(2)) : null;

console.log(`\n>> AFTER Average: ${afterAvg.toFixed(2)} ms | Min: ${afterMin.toFixed(2)} ms | Max: ${afterMax.toFixed(2)} ms | Median: ${afterMedian.toFixed(2)} ms`);
if (afterServerAvg) {
  console.log(`   (Server execution avg: ${afterServerAvg.toFixed(2)} ms)`);
}
console.log("");

// ----------------------------------------------------------------------
// CALCULATE IMPROVEMENT
// ----------------------------------------------------------------------
const improvementPercent = Number((((beforeAvg - afterAvg) / beforeAvg) * 100).toFixed(2));

const maxBarLen = 30;
const beforeBarLen = maxBarLen;
const afterBarLen = Math.max(2, Math.round((afterAvg / beforeAvg) * maxBarLen));
const beforeBar = "█".repeat(beforeBarLen);
const afterBar = "█".repeat(afterBarLen);

console.log("=================================================================");
console.log("                     BENCHMARK COMPARISON SUMMARY                 ");
console.log("=================================================================");
console.log(`Operation:       Volunteer Dashboard Available Requests Loading & Smart Matching`);
console.log(`HTTP Endpoint:   GET ${FULL_API_URL}`);
console.log(`Dataset:         ${pendingVerified} active emergency incidents (out of ${totalRequests} total)`);
console.log(`Iterations:      20 runs (with 3 warm-up runs)`);
console.log(`BEFORE Average:  ${beforeAvg.toFixed(2)} ms`);
console.log(`AFTER Average:   ${afterAvg.toFixed(2)} ms`);
console.log(`IMPROVEMENT:     ${improvementPercent.toFixed(2)}% FASTER!`);
console.log("");
console.log(`Before: ${beforeBar}  ${beforeAvg.toFixed(2)} ms`);
console.log(`After:  ${afterBar}  ${afterAvg.toFixed(2)} ms`);
console.log("=================================================================\n");

// Save structured JSON results for UI demo and documentation
const resultsData = {
  operation: "Volunteer Dashboard Available Emergency Requests Loading & Smart Matching",
  endpoint: `GET ${ENDPOINT_PATH}`,
  fullUrl: FULL_API_URL,
  timestamp: new Date().toISOString(),
  dataset: {
    totalRequests,
    pendingVerified,
    volunteerInterests: volunteer.interests || [],
  },
  iterations: 20,
  warmupRuns: 3,
  before: {
    runs: beforeRuns,
    average: beforeAvg,
    serverAverage: beforeServerAvg,
    min: beforeMin,
    max: beforeMax,
    median: beforeMedian,
  },
  after: {
    runs: afterRuns,
    average: afterAvg,
    serverAverage: afterServerAvg,
    min: afterMin,
    max: afterMax,
    median: afterMedian,
  },
  improvement: {
    deltaMs: Number((beforeAvg - afterAvg).toFixed(2)),
    percent: improvementPercent,
  },
  verification: {
    countMatch,
    recCountMatch,
    otherCountMatch,
    orderingAndScoresMatch,
  },
};

const resultsPath = path.join(__dirname, "benchmark_results.json");
fs.writeFileSync(resultsPath, JSON.stringify(resultsData, null, 2), "utf8");
console.log(`[Results] Benchmark results saved to ${resultsPath}`);

await mongoose.disconnect();
process.exit(0);
