# ResQHub Performance Optimization

## Challenge
System Became Slow

## Selected Operation
Volunteer Dashboard Available Emergency Requests Loading & Smart Matching (`getAvailableRequests` / `GET /api/requests/available`)

## Why This Operation Was Selected
The Volunteer Mission Dispatch Board is the operational core of the entire ResQHub disaster response platform. When an emergency strikes, volunteer responders open `/volunteer` to browse verified incidents, assess match compatibility with their registered skills (Medical, Blood, Rescue, Food, Transport), and immediately accept emergency missions.

Under realistic disaster response scale with over 2,500 emergency requests and 1,252 active available incidents, this endpoint exhibited severe latency. First responders cannot afford delays, UI freezes, or slow dispatch times when dispatching critical life-saving resources (such as oxygen, blood donation, first aid, and ambulance transport).

## BEFORE

Number of iterations:
20 (with 3 warm-up runs)

Individual Runs:
- Run 01: 47.18 ms
- Run 02: 46.28 ms
- Run 03: 42.48 ms
- Run 04: 38.33 ms
- Run 05: 41.19 ms
- Run 06: 47.42 ms
- Run 07: 51.24 ms
- Run 08: 42.31 ms
- Run 09: 54.23 ms
- Run 10: 43.30 ms
- Run 11: 49.49 ms
- Run 12: 40.70 ms
- Run 13: 45.12 ms
- Run 14: 39.83 ms
- Run 15: 41.35 ms
- Run 16: 40.37 ms
- Run 17: 44.17 ms
- Run 18: 37.27 ms
- Run 19: 39.47 ms
- Run 20: 39.60 ms

Average Response Time:
43.57 ms

Minimum:
37.27 ms

Maximum:
54.23 ms

Median:
42.39 ms

## Bottleneck

Profiling with Node.js `performance.now()` and MongoDB query planner `explain("executionStats")` revealed three distinct bottlenecks accounting for over 90% of the latency:

1. **Missing MongoDB Compound Index (`COLLSCAN` + In-Memory Sort Buffer)**:
   The query executed was:
   ```javascript
   EmergencyRequest.find({ status: { $in: ["Pending", "Verified"] } }).sort({ createdAt: -1 })
   ```
   MongoDB `explain()` confirmed that without an index on `status` and `createdAt`, MongoDB had to perform a full collection scan (`COLLSCAN`) examining all 2,507 documents in the database (`totalDocsExamined: 2507`), followed by an unindexed, blocking in-memory sort stage (`SORT`) to order the 1,252 documents.
2. **Mongoose Document Hydration & Deep Cloning (`doc.toObject()`)**:
   Querying without `.lean()` forced Mongoose to instantiate 1,252 heavy Mongoose Model document wrappers with change-tracking, validation proxies, and schema getters. The controller then executed:
   ```javascript
   const requests = rawRequests.map((doc) => {
     const plain = doc.toObject();
     ...
   });
   ```
   Calling `.toObject()` on 1,252 documents performed deep object cloning, generating hundreds of thousands of heap allocations and triggering V8 garbage collection pauses.
3. **Redundant Lowercase String Concatenation in Smart Matcher**:
   In `smartMatcher.js`, `scoreInterestForRequest` repeatedly constructed:
   ```javascript
   const text = `${request.title || ""} ${request.description || ""}`.toLowerCase();
   ```
   For every single interest of the volunteer (e.g. 4 interests × 1,252 requests = 5,008 times per request), redundant string allocations and regex parsing were performed.
4. **Double-Pass Array Filtering**:
   The controller looped through the mapped array twice using `.filter(r => r.isRecommended)` and `.filter(r => !r.isRecommended)`.

## YOUR CHANGE

We applied targeted optimizations across the database and application layers:

1. **Added MongoDB Compound Index (`server/models/EmergencyRequest.js`)**:
   ```javascript
   // Compound index for high-performance volunteer mission dispatch queries (avoids COLLSCAN & in-memory sort)
   emergencyRequestSchema.index({ status: 1, createdAt: -1 });
   ```
   This converts the query plan from `COLLSCAN` + `SORT` to an efficient `IXSCAN` (B-tree index scan), directly retrieving matching documents in pre-sorted order with zero in-memory sort overhead.
2. **Enabled `.lean()` and Eliminated Document Hydration (`server/controllers/requestController.js`)**:
   ```javascript
   const requests = await EmergencyRequest.find({
     status: { $in: ["Pending", "Verified"] },
   })
     .populate("createdBy", "name email phone role")
     .sort({ createdAt: -1 })
     .lean();
   ```
   This bypasses Mongoose document hydration, returning lightweight plain JavaScript objects directly from the MongoDB BSON driver and completely removing the expensive `doc.toObject()` cloning loop.
3. **Optimized Smart Matching Engine (`server/utils/smartMatcher.js`)**:
   Pre-calculated the lowercased search text and category once per request before evaluating the volunteer's interests:
   ```javascript
   const category = (request.category || "").trim();
   const text = `${request.title || ""} ${request.description || ""}`.toLowerCase();

   for (let i = 0; i < volunteerInterests.length; i++) {
     const interest = volunteerInterests[i];
     const points = scoreInterestForRequest(interest, request, category, text);
     ...
   }
   ```
4. **Single-Pass Partitioning (`server/controllers/requestController.js`)**:
   Partitioned incidents into `recommended` and `other` in a single pass while calculating match scores, sorting only the recommended subset by score descending.

## AFTER

Number of iterations:
20 (with 3 warm-up runs, exact same dataset and conditions)

Individual Runs:
- Run 01: 23.95 ms
- Run 02: 25.29 ms
- Run 03: 20.98 ms
- Run 04: 20.16 ms
- Run 05: 23.32 ms
- Run 06: 19.17 ms
- Run 07: 23.74 ms
- Run 08: 21.40 ms
- Run 09: 20.31 ms
- Run 10: 24.56 ms
- Run 11: 19.18 ms
- Run 12: 21.19 ms
- Run 13: 21.33 ms
- Run 14: 27.69 ms
- Run 15: 20.48 ms
- Run 16: 19.57 ms
- Run 17: 23.90 ms
- Run 18: 20.95 ms
- Run 19: 20.89 ms
- Run 20: 20.83 ms

Average Response Time:
21.94 ms

Minimum:
19.17 ms

Maximum:
27.69 ms

Median:
21.09 ms

## Improvement

Before Average:
43.57 ms

After Average:
21.94 ms

Improvement:

((Before - After) / Before) × 100
= ((43.57 - 21.94) / 43.57) × 100
= 49.64 % FASTER!

Visual Comparison:
Before: ██████████████████████████████  43.57 ms
After:  ███████████████  21.94 ms

## Verification

We confirmed that the optimized operation produces 100% logically equivalent results to the original implementation by asserting the following checks on the output data:
1. **Total Count**: Exact match (1,252 incidents before vs 1,252 incidents after).
2. **Recommended Subset Count**: Exact match (1,202 incidents before vs 1,202 incidents after).
3. **Other Subset Count**: Exact match (50 incidents before vs 50 incidents after).
4. **Smart Match Scores & Reasons**: Every individual item returned the exact same `matchScore`, `matchedInterests`, and `matchReason`.
5. **Deterministic Ordering**: The recommended incidents maintained the exact same descending priority order by match score, and other incidents maintained the exact same descending chronological order by `createdAt`.

## Reproduction

To reproduce the benchmark and generate real-time timing measurements:

```bash
npm run benchmark
```

The script runs 3 warm-up iterations followed by 20 high-resolution timing iterations (`performance.now()`) across the database, compares before and after performance, validates output equivalence, and outputs the comparison metrics.
