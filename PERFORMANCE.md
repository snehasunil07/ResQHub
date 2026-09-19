# System Became Slow

## Operation
Volunteer Dashboard Available Emergency Requests Loading & Smart Matching (`GET /api/requests/available` via `getAvailableRequests`)

## Before
Average response time: 94.40 ms  
(Server execution average: 51.33 ms | Min: 73.12 ms | Max: 119.20 ms | Median: 94.72 ms)

Individual Runs (20 iterations, 3 warm-up runs):
- Run 01: 102.79 ms (server: 55.88 ms)
- Run 02: 104.07 ms (server: 57.98 ms)
- Run 03: 76.79 ms (server: 46.87 ms)
- Run 04: 79.94 ms (server: 49.54 ms)
- Run 05: 73.12 ms (server: 43.34 ms)
- Run 06: 91.51 ms (server: 47.87 ms)
- Run 07: 78.37 ms (server: 47.59 ms)
- Run 08: 96.87 ms (server: 49.17 ms)
- Run 09: 101.08 ms (server: 54.13 ms)
- Run 10: 115.81 ms (server: 66.70 ms)
- Run 11: 88.89 ms (server: 44.82 ms)
- Run 12: 105.88 ms (server: 54.43 ms)
- Run 13: 80.44 ms (server: 50.73 ms)
- Run 14: 119.20 ms (server: 49.92 ms)
- Run 15: 100.88 ms (server: 56.12 ms)
- Run 16: 92.58 ms (server: 48.54 ms)
- Run 17: 99.47 ms (server: 55.32 ms)
- Run 18: 99.64 ms (server: 55.40 ms)
- Run 19: 88.75 ms (server: 44.15 ms)
- Run 20: 91.85 ms (server: 48.03 ms)

## Bottleneck
Profiling with Node.js `performance.now()`, Express response headers, and MongoDB query planner `explain("executionStats")` identified four genuine bottlenecks:

1. **Missing MongoDB Compound Index (`COLLSCAN` + In-Memory Sort Buffer)**:
   The query executed was:
   ```javascript
   EmergencyRequest.find({ status: { $in: ["Pending", "Verified"] } }).sort({ createdAt: -1 })
   ```
   Without an index covering `status` and `createdAt`, MongoDB was forced to scan every single document in the collection (`COLLSCAN`, scanning 2,508 documents) and then buffer all 1,252 active documents into an unindexed in-memory sort buffer (`SORT`).

2. **Mongoose Document Hydration & Deep-Cloning (`doc.toObject()`) Overhead**:
   Querying without `.lean()` caused Mongoose to instantiate 1,252 heavy Mongoose document wrappers with change-tracking, validation proxies, and schema getters. The controller then called `rawRequests.map(doc => doc.toObject())`, triggering deep-object cloning across all documents and causing heavy V8 heap churn.

3. **Re-executing Inline Regular Expressions & String Allocations in Smart Matcher**:
   In `smartMatcher.js`, `scoreInterestForRequest` was repeatedly constructing lowercased strings and allocating regex match result arrays with `text.match(...)` across thousands of interest evaluations per request.

4. **Multi-Pass Array Filtering**:
   The controller looped through the mapped array twice using `.filter(r => r.isRecommended)` and `.filter(r => !r.isRecommended)`.

## Your Change
We applied targeted optimizations to resolve the genuine bottlenecks without altering any functionality or matching rules:

1. **Created Compound B-Tree Index (`server/models/EmergencyRequest.js`)**:
   ```javascript
   emergencyRequestSchema.index({ status: 1, createdAt: -1 });
   ```
   Eliminated the collection scan and in-memory sort stage, allowing MongoDB to perform an efficient B-tree index scan (`IXSCAN`) directly retrieving pre-sorted documents.

2. **Switched to `.lean()` Querying (`server/controllers/requestController.js`)**:
   ```javascript
   const requests = await EmergencyRequest.find({
     status: { $in: ["Pending", "Verified"] },
   })
     .populate("createdBy", "name email phone role")
     .sort({ createdAt: -1 })
     .lean();
   ```
   Bypasses heavy Mongoose document hydration, returning lightweight plain JavaScript objects directly from the BSON driver and eliminating the `doc.toObject()` deep-cloning loop.

3. **Precompiled Module-Level Regular Expressions with Zero-Allocation `.test()` (`server/utils/smartMatcher.js`)**:
   Precompiled all keyword patterns (e.g. `REGEX_MEDICAL`, `REGEX_FIRST_AID`, etc.) at module load time and used `REGEX.test(text)` instead of `text.match(...)`. Pre-lowercased the search text once per incident rather than re-computing it inside the loop.

4. **Single-Pass Partitioning (`server/controllers/requestController.js`)**:
   Single-pass `for` loop to compute match scores, populate recommendation metadata, and partition incidents directly into `recommended` and `other` arrays.

## After
Average response time: 70.71 ms  
(Server execution average: 30.11 ms | Min: 52.45 ms | Max: 97.58 ms | Median: 72.93 ms)

Individual Runs (20 iterations, 3 warm-up runs):
- Run 01: 67.75 ms (server: 24.76 ms)
- Run 02: 81.03 ms (server: 34.31 ms)
- Run 03: 52.45 ms (server: 24.82 ms)
- Run 04: 79.80 ms (server: 32.12 ms)
- Run 05: 80.39 ms (server: 34.16 ms)
- Run 06: 80.86 ms (server: 33.94 ms)
- Run 07: 74.82 ms (server: 32.12 ms)
- Run 08: 78.00 ms (server: 32.36 ms)
- Run 09: 97.58 ms (server: 33.68 ms)
- Run 10: 78.11 ms (server: 34.02 ms)
- Run 11: 68.05 ms (server: 21.10 ms)
- Run 12: 77.79 ms (server: 35.88 ms)
- Run 13: 71.04 ms (server: 27.04 ms)
- Run 14: 81.94 ms (server: 31.71 ms)
- Run 15: 56.26 ms (server: 26.18 ms)
- Run 16: 56.15 ms (server: 27.37 ms)
- Run 17: 62.50 ms (server: 33.60 ms)
- Run 18: 54.48 ms (server: 27.23 ms)
- Run 19: 61.65 ms (server: 29.62 ms)
- Run 20: 53.55 ms (server: 26.14 ms)

## Improvement
25.10 %  
((94.40 ms - 70.71 ms) / 94.40 ms) × 100 = 25.10% faster overall HTTP response time.  
(Server-side processing alone improved from 51.33 ms to 30.11 ms, a **41.34% speedup**).

Visual Comparison:
```text
Before: ██████████████████████████████  94.40 ms
After:  ██████████████████████  70.71 ms
```

## Verification
We verified that the output remained 100% identical between the original and optimized implementations through automated Phase 2 assertion checks in `server/benchmark/run_benchmark.mjs`:
1. **Total Count**: Exact match (1,252 incidents before vs 1,252 incidents after).
2. **Recommended Subset Count**: Exact match (1,202 incidents before vs 1,202 incidents after).
3. **Other Subset Count**: Exact match (50 incidents before vs 50 incidents after).
4. **Smart Match Scores & Reasons**: Every single emergency incident has identical `matchScore`, `matchedInterests`, and `matchReason`.
5. **Deterministic Ordering**: The recommended incidents maintained the exact same priority order by match score descending, and other incidents maintained the exact same chronological order by `createdAt` descending.

## Reproduce

```bash
npm.cmd run benchmark
```
