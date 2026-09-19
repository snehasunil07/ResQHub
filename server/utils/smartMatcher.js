/**
 * ResQHub Smart Matching Engine
 * 
 * Rule-based, deterministic, transparent matching system that connects
 * volunteer Areas of Interest with emergency requests.
 * No external AI / Machine Learning dependencies.
 */

/**
 * Generate human-readable explanation of why a request was matched
 * @param {string[]} matchedInterests - List of volunteer interests that matched
 * @returns {string|null}
 */
export function generateMatchReason(matchedInterests) {
  if (!matchedInterests || matchedInterests.length === 0) {
    return null;
  }
  if (matchedInterests.length === 1) {
    return `Matched because you selected ${matchedInterests[0]}.`;
  }
  if (matchedInterests.length === 2) {
    return `Matched because you selected ${matchedInterests[0]} and ${matchedInterests[1]}.`;
  }
  const allButLast = matchedInterests.slice(0, -1).join(", ");
  const last = matchedInterests[matchedInterests.length - 1];
  return `Matched because you selected ${allButLast}, and ${last}.`;
}

// Precompiled regex patterns for high-performance zero-allocation matching
const REGEX_MEDICAL = /\b(medical|doctor|hospital|patient|injury|injuries|health|clinic)\b/;
const REGEX_FIRST_AID = /\b(first aid|wound|bleeding|burn|cpr|trauma)\b/;
const REGEX_FIRST_AID_SUPPORT = /\b(accident|medical|injury|injuries|crash)\b/;
const REGEX_BLOOD = /\b(blood|platelet|platelets|donor|transfusion)\b/;
const REGEX_FIRE = /\b(fire|blaze|flame|flames|smoke|burn|arson|extinguisher)\b/;
const REGEX_OTHER_RESCUE = /\b(missing|kidnap|lost child|lost person)\b/;
const REGEX_MISSING = /\b(missing|lost child|lost person|kidnap|disappear|disappeared|runaway)\b/;
const REGEX_ACCIDENT = /\b(accident|crash|collision|vehicle|wreck|hit and run|car crash)\b/;
const REGEX_DISASTER = /\b(disaster|flood|flooding|earthquake|storm|cyclone|tsunami|landslide|hurricane|tornado)\b/;
const REGEX_FOOD = /\b(food|ration|rations|meal|meals|grocery|hunger|starvation|drinking water|supplies)\b/;
const REGEX_FOOD_RELIEF = /\b(disaster|flood|relief|shelter)\b/;
const REGEX_TRANSPORT = /\b(transport|transportation|evacuate|evacuation|ambulance|vehicle|shift|bus|van)\b/;
const REGEX_TRANSPORT_SUPPORT = /\b(accident|flood|disaster)\b/;
const REGEX_SHELTER = /\b(shelter|accommodation|homeless|housing|temporary stay|camp)\b/;

/**
 * Evaluate single interest against an emergency request
 * @param {string} interest - One of VOLUNTEER_AREAS_OF_INTEREST
 * @param {object} request - Emergency request object
 * @param {string} [cachedCategory] - Pre-extracted category string
 * @param {string} [cachedText] - Pre-lowercased title and description string
 * @returns {number} Points (3: Exact/Primary, 2: Related Support, 1: Secondary, 0: None)
 */
function scoreInterestForRequest(interest, request, cachedCategory, cachedText) {
  const category = cachedCategory !== undefined ? cachedCategory : (request.category || "").trim();
  const text = cachedText !== undefined ? cachedText : `${request.title || ""} ${request.description || ""}`.toLowerCase();

  switch (interest) {
    case "Medical Emergency": {
      if (category === "Medicine" || REGEX_MEDICAL.test(text)) {
        return 3;
      }
      if (category === "Blood") {
        return 2;
      }
      return 0;
    }

    case "First Aid": {
      if (REGEX_FIRST_AID.test(text)) {
        return 3;
      }
      if (category === "Medicine" || category === "Rescue" || REGEX_FIRST_AID_SUPPORT.test(text)) {
        return 2;
      }
      if (category === "Blood") {
        return 1;
      }
      return 0;
    }

    case "Blood Donation": {
      if (category === "Blood" || REGEX_BLOOD.test(text)) {
        return 3;
      }
      if (category === "Medicine") {
        return 2;
      }
      return 0;
    }

    case "Fire & Rescue": {
      if (REGEX_FIRE.test(text)) {
        return 3;
      }
      // Rescue category where not explicitly missing person or accident
      if (category === "Rescue") {
        const isOtherRescue = REGEX_OTHER_RESCUE.test(text);
        return isOtherRescue ? 2 : 3;
      }
      return 0;
    }

    case "Missing Person Search": {
      if (REGEX_MISSING.test(text)) {
        return 3;
      }
      if (category === "Rescue") {
        return 2;
      }
      return 0;
    }

    case "Accident Response": {
      if (REGEX_ACCIDENT.test(text)) {
        return 3;
      }
      if (category === "Transport" || category === "Rescue") {
        return 2;
      }
      return 0;
    }

    case "Natural Disaster Relief": {
      if (REGEX_DISASTER.test(text)) {
        return 3;
      }
      if (category === "Food" || category === "Transport" || category === "Rescue") {
        return 2;
      }
      return 0;
    }

    case "Food & Essential Supplies": {
      if (category === "Food" || REGEX_FOOD.test(text)) {
        return 3;
      }
      if (REGEX_FOOD_RELIEF.test(text)) {
        return 2;
      }
      return 0;
    }

    case "Transportation & Evacuation": {
      if (category === "Transport" || REGEX_TRANSPORT.test(text)) {
        return 3;
      }
      if (REGEX_TRANSPORT_SUPPORT.test(text) || category === "Rescue") {
        return 2;
      }
      return 0;
    }

    case "Shelter & Accommodation": {
      if (REGEX_SHELTER.test(text)) {
        return 3;
      }
      if (category === "Food" || REGEX_FOOD_RELIEF.test(text)) {
        return 2;
      }
      return 0;
    }

    case "Other": {
      return 1;
    }

    default:
      return 0;
  }
}

/**
 * Calculate match score and details for a request given a volunteer's interests
 * @param {object} request - Emergency request object
 * @param {string[]} volunteerInterests - Array of volunteer's registered interests
 * @returns {{ score: number, isRecommended: boolean, matchedInterests: string[], reason: string|null }}
 */
export function calculateMatch(request, volunteerInterests = []) {
  if (!request || !Array.isArray(volunteerInterests) || volunteerInterests.length === 0) {
    return {
      score: 0,
      isRecommended: false,
      matchedInterests: [],
      reason: null,
    };
  }

  const matched = [];
  let totalScore = 0;

  // Pre-calculate lowercased search text and category ONCE per request
  const category = (request.category || "").trim();
  const text = `${request.title || ""} ${request.description || ""}`.toLowerCase();

  for (let i = 0; i < volunteerInterests.length; i++) {
    const interest = volunteerInterests[i];
    const points = scoreInterestForRequest(interest, request, category, text);
    if (points > 0) {
      matched.push({ interest, points });
      totalScore += points;
    }
  }

  // Sort matched interests by points descending (strongest match first)
  matched.sort((a, b) => b.points - a.points);
  const matchedInterests = matched.map((m) => m.interest);

  return {
    score: totalScore,
    isRecommended: totalScore > 0,
    matchedInterests,
    reason: generateMatchReason(matchedInterests),
  };
}

export default {
  calculateMatch,
  generateMatchReason,
};
