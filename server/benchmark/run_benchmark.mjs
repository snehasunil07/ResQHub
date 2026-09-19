import mongoose from "mongoose";
import dotenv from "dotenv";
import { performance } from "perf_hooks";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import EmergencyRequest from "../models/EmergencyRequest.js";
import { calculateMatch } from "../utils/smartMatcher.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure MongoDB connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/resqhub";
await mongoose.connect(MONGO_URI);

console.log("=================================================================");
console.log("    RESQHUB SYSTEM PERFORMANCE BENCHMARK - BUILDATHON CHALLENGE  ");
console.log("=================================================================\n");

// 1. Identify dataset and test volunteer
const totalRequests = await EmergencyRequest.countDocuments();
const pendingVerified = await EmergencyRequest.countDocuments({ status: { $in: ["Pending", "Verified"] } });

console.log(`[Dataset] Total Emergency Requests in DB: ${totalRequests}`);
console.log(`[Dataset] Available (Pending/Verified) Incidents: ${pendingVerified}`);

if (totalRequests === 0) {
  console.error("Error: Database has 0 emergency requests. Please ensure data is loaded.");
  process.exit(1);
}

// Find a representative volunteer
let volunteer = await User.findOne({ role: "volunteer" });
if (!volunteer) {
  volunteer = await User.findOne();
}

const volunteerInterests = [
  "Medical Emergency",
  "Blood Donation",
  "First Aid",
  "Food & Essential Supplies",
];

console.log(`[Test Input] Volunteer: "${volunteer.name}" (${volunteer.email})`);
console.log(`[Test Input] Active Areas of Interest: ${JSON.stringify(volunteerInterests)}\n`);

// ----------------------------------------------------------------------
// ORIGINAL (BEFORE) IMPLEMENTATION
// ----------------------------------------------------------------------
async function runOriginalOperation() {
  const rawRequests = await EmergencyRequest.find({
    status: { $in: ["Pending", "Verified"] },
  })
    .populate("createdBy", "name email phone role")
    .sort({ createdAt: -1 });

  const requests = rawRequests.map((doc) => {
    const plain = doc.toObject();
    const match = calculateMatch(plain, volunteerInterests);
    return {
      ...plain,
      matchScore: match.score,
      isRecommended: match.isRecommended,
      matchedInterests: match.matchedInterests,
      matchReason: match.reason,
    };
  });

  const recommended = requests
    .filter((r) => r.isRecommended)
    .sort((a, b) => b.matchScore - a.matchScore);

  const other = requests.filter((r) => !r.isRecommended);

  return {
    success: true,
    count: requests.length,
    requests,
    recommended,
    other,
    volunteerInterests,
  };
}

// ----------------------------------------------------------------------
// OPTIMIZED (AFTER) IMPLEMENTATION
// ----------------------------------------------------------------------
// Optimized calculateMatch (computes lowercased text string once per request)
function optimizedCalculateMatch(request, interests = []) {
  if (!request || !Array.isArray(interests) || interests.length === 0) {
    return { score: 0, isRecommended: false, matchedInterests: [], reason: null };
  }

  const category = (request.category || "").trim();
  const text = `${request.title || ""} ${request.description || ""}`.toLowerCase();

  const matched = [];
  let totalScore = 0;

  for (let i = 0; i < interests.length; i++) {
    const interest = interests[i];
    let points = 0;

    switch (interest) {
      case "Medical Emergency": {
        if (category === "Medicine" || text.match(/\b(medical|doctor|hospital|patient|injury|injuries|health|clinic)\b/)) {
          points = 3;
        } else if (category === "Blood") {
          points = 2;
        }
        break;
      }
      case "First Aid": {
        if (text.match(/\b(first aid|wound|bleeding|burn|cpr|trauma)\b/)) {
          points = 3;
        } else if (category === "Medicine" || category === "Rescue" || text.match(/\b(accident|medical|injury|injuries|crash)\b/)) {
          points = 2;
        } else if (category === "Blood") {
          points = 1;
        }
        break;
      }
      case "Blood Donation": {
        if (category === "Blood" || text.match(/\b(blood|platelet|platelets|donor|transfusion)\b/)) {
          points = 3;
        } else if (category === "Medicine") {
          points = 2;
        }
        break;
      }
      case "Fire & Rescue": {
        if (text.match(/\b(fire|blaze|flame|flames|smoke|burn|arson|extinguisher)\b/)) {
          points = 3;
        } else if (category === "Rescue") {
          points = text.match(/\b(missing|kidnap|lost child|lost person)\b/) ? 2 : 3;
        }
        break;
      }
      case "Missing Person Search": {
        if (text.match(/\b(missing|lost child|lost person|kidnap|disappear|disappeared|runaway)\b/)) {
          points = 3;
        } else if (category === "Rescue") {
          points = 2;
        }
        break;
      }
      case "Accident Response": {
        if (text.match(/\b(accident|crash|collision|vehicle|wreck|hit and run|car crash)\b/)) {
          points = 3;
        } else if (category === "Transport" || category === "Rescue") {
          points = 2;
        }
        break;
      }
      case "Natural Disaster Relief": {
        if (text.match(/\b(disaster|flood|flooding|earthquake|storm|cyclone|tsunami|landslide|hurricane|tornado)\b/)) {
          points = 3;
        } else if (category === "Food" || category === "Transport" || category === "Rescue") {
          points = 2;
        }
        break;
      }
      case "Food & Essential Supplies": {
        if (category === "Food" || text.match(/\b(food|ration|rations|meal|meals|grocery|hunger|starvation|drinking water|supplies)\b/)) {
          points = 3;
        } else if (text.match(/\b(disaster|flood|relief|shelter)\b/)) {
          points = 2;
        }
        break;
      }
      case "Transportation & Evacuation": {
        if (category === "Transport" || text.match(/\b(transport|transportation|evacuate|evacuation|ambulance|vehicle|shift|bus|van)\b/)) {
          points = 3;
        } else if (text.match(/\b(accident|flood|disaster)\b/) || category === "Rescue") {
          points = 2;
        }
        break;
      }
      case "Shelter & Accommodation": {
        if (text.match(/\b(shelter|accommodation|homeless|housing|temporary stay|camp)\b/)) {
          points = 3;
        } else if (category === "Food" || text.match(/\b(disaster|flood)\b/)) {
          points = 2;
        }
        break;
      }
      case "Other": {
        points = 1;
        break;
      }
      default:
        points = 0;
    }

    if (points > 0) {
      matched.push({ interest, points });
      totalScore += points;
    }
  }

  matched.sort((a, b) => b.points - a.points);
  const matchedInterests = matched.map((m) => m.interest);

  let reason = null;
  if (matchedInterests.length === 1) {
    reason = `Matched because you selected ${matchedInterests[0]}.`;
  } else if (matchedInterests.length === 2) {
    reason = `Matched because you selected ${matchedInterests[0]} and ${matchedInterests[1]}.`;
  } else if (matchedInterests.length > 2) {
    const allButLast = matchedInterests.slice(0, -1).join(", ");
    const last = matchedInterests[matchedInterests.length - 1];
    reason = `Matched because you selected ${allButLast}, and ${last}.`;
  }

  return {
    score: totalScore,
    isRecommended: totalScore > 0,
    matchedInterests,
    reason,
  };
}

async function runOptimizedOperation() {
  const requests = await EmergencyRequest.find({
    status: { $in: ["Pending", "Verified"] },
  })
    .populate("createdBy", "name email phone role")
    .sort({ createdAt: -1 })
    .lean();

  const recommended = [];
  const other = [];

  for (let i = 0; i < requests.length; i++) {
    const req = requests[i];
    const match = optimizedCalculateMatch(req, volunteerInterests);
    req.matchScore = match.score;
    req.isRecommended = match.isRecommended;
    req.matchedInterests = match.matchedInterests;
    req.matchReason = match.reason;

    if (match.isRecommended) {
      recommended.push(req);
    } else {
      other.push(req);
    }
  }

  recommended.sort((a, b) => b.matchScore - a.matchScore);

  return {
    success: true,
    count: requests.length,
    requests,
    recommended,
    other,
    volunteerInterests,
  };
}

// ----------------------------------------------------------------------
// EXECUTION: BEFORE MEASUREMENT
// ----------------------------------------------------------------------
console.log("-----------------------------------------------------------------");
console.log("PHASE 1: BENCHMARKING BEFORE OPTIMIZATION");
console.log("-----------------------------------------------------------------");

// Warm-up runs (3 runs)
console.log("Running 3 warm-up runs...");
for (let i = 0; i < 3; i++) {
  await runOriginalOperation();
}

console.log("Collecting 20 high-resolution measurements (performance.now())...");
const beforeRuns = [];
for (let i = 1; i <= 20; i++) {
  const t0 = performance.now();
  await runOriginalOperation();
  const t1 = performance.now();
  const elapsed = Number((t1 - t0).toFixed(2));
  beforeRuns.push(elapsed);
  console.log(`  Run ${String(i).padStart(2, " ")}: ${elapsed.toFixed(2)} ms`);
}

const beforeAvg = Number((beforeRuns.reduce((a, b) => a + b, 0) / beforeRuns.length).toFixed(2));
const beforeMin = Math.min(...beforeRuns);
const beforeMax = Math.max(...beforeRuns);
const sortedB = [...beforeRuns].sort((a, b) => a - b);
const beforeMedian = Number(((sortedB[9] + sortedB[10]) / 2).toFixed(2));

console.log(`\n>> BEFORE Average: ${beforeAvg.toFixed(2)} ms | Min: ${beforeMin.toFixed(2)} ms | Max: ${beforeMax.toFixed(2)} ms | Median: ${beforeMedian.toFixed(2)} ms\n`);

// ----------------------------------------------------------------------
// APPLY DATABASE OPTIMIZATION (Compound Index)
// ----------------------------------------------------------------------
console.log("-----------------------------------------------------------------");
console.log("APPLYING OPTIMIZATION: Creating compound index { status: 1, createdAt: -1 }");
console.log("-----------------------------------------------------------------");
await EmergencyRequest.collection.createIndex({ status: 1, createdAt: -1 });
console.log("✓ Compound index created on emergencyrequests collection.\n");

// ----------------------------------------------------------------------
// VERIFY EQUIVALENCE
// ----------------------------------------------------------------------
console.log("-----------------------------------------------------------------");
console.log("PHASE 2: VERIFYING OUTPUT EQUIVALENCE");
console.log("-----------------------------------------------------------------");
const sampleBefore = await runOriginalOperation();
const sampleAfter = await runOptimizedOperation();

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
// EXECUTION: AFTER MEASUREMENT
// ----------------------------------------------------------------------
console.log("\n-----------------------------------------------------------------");
console.log("PHASE 3: BENCHMARKING AFTER OPTIMIZATION");
console.log("-----------------------------------------------------------------");

// Warm-up runs (exact same 3 runs)
console.log("Running 3 warm-up runs...");
for (let i = 0; i < 3; i++) {
  await runOptimizedOperation();
}

console.log("Collecting 20 high-resolution measurements (performance.now())...");
const afterRuns = [];
for (let i = 1; i <= 20; i++) {
  const t0 = performance.now();
  await runOptimizedOperation();
  const t1 = performance.now();
  const elapsed = Number((t1 - t0).toFixed(2));
  afterRuns.push(elapsed);
  console.log(`  Run ${String(i).padStart(2, " ")}: ${elapsed.toFixed(2)} ms`);
}

const afterAvg = Number((afterRuns.reduce((a, b) => a + b, 0) / afterRuns.length).toFixed(2));
const afterMin = Math.min(...afterRuns);
const afterMax = Math.max(...afterRuns);
const sortedA = [...afterRuns].sort((a, b) => a - b);
const afterMedian = Number(((sortedA[9] + sortedA[10]) / 2).toFixed(2));

console.log(`\n>> AFTER Average: ${afterAvg.toFixed(2)} ms | Min: ${afterMin.toFixed(2)} ms | Max: ${afterMax.toFixed(2)} ms | Median: ${afterMedian.toFixed(2)} ms\n`);

// ----------------------------------------------------------------------
// CALCULATE IMPROVEMENT
// ----------------------------------------------------------------------
const improvementPercent = Number((((beforeAvg - afterAvg) / beforeAvg) * 100).toFixed(2));

// Bar visualizations
const maxBarLen = 30;
const beforeBarLen = maxBarLen;
const afterBarLen = Math.max(2, Math.round((afterAvg / beforeAvg) * maxBarLen));
const beforeBar = "█".repeat(beforeBarLen);
const afterBar = "█".repeat(afterBarLen);

console.log("=================================================================");
console.log("                     BENCHMARK COMPARISON SUMMARY                 ");
console.log("=================================================================");
console.log(`Operation:       Volunteer Dashboard Available Requests Loading & Smart Matching`);
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
  timestamp: new Date().toISOString(),
  dataset: {
    totalRequests,
    pendingVerified,
    volunteerInterests,
  },
  iterations: 20,
  warmupRuns: 3,
  before: {
    runs: beforeRuns,
    average: beforeAvg,
    min: beforeMin,
    max: beforeMax,
    median: beforeMedian,
  },
  after: {
    runs: afterRuns,
    average: afterAvg,
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
