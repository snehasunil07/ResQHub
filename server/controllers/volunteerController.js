import User from "../models/User.js";
import EmergencyRequest from "../models/EmergencyRequest.js";

/**
 * Calculate volunteer achievement badge based on completed missions count
 * @param {number} completedCount 
 * @returns {object} Badge metadata
 */
export function calculateBadge(completedCount = 0) {
  const count = Number(completedCount) || 0;

  if (count >= 50) {
    return {
      name: "ResQ Champion",
      icon: "🏆",
      description: "Completed 50+ emergency missions",
      tier: "Champion",
      minCompleted: 50,
      nextTierAt: null,
      progressPercent: 100,
    };
  }
  if (count >= 25) {
    return {
      name: "Emergency Hero",
      icon: "🦸",
      description: "Completed 25+ emergency missions",
      tier: "Hero",
      minCompleted: 25,
      nextTierAt: 50,
      progressPercent: Math.min(100, Math.round(((count - 25) / 25) * 100)),
    };
  }
  if (count >= 10) {
    return {
      name: "Community Helper",
      icon: "🤝",
      description: "Completed 10+ emergency missions",
      tier: "Helper",
      minCompleted: 10,
      nextTierAt: 25,
      progressPercent: Math.min(100, Math.round(((count - 10) / 15) * 100)),
    };
  }
  if (count >= 5) {
    return {
      name: "Dedicated Responder",
      icon: "🛡️",
      description: "Completed 5+ emergency missions",
      tier: "Dedicated",
      minCompleted: 5,
      nextTierAt: 10,
      progressPercent: Math.min(100, Math.round(((count - 5) / 5) * 100)),
    };
  }
  return {
    name: "Rookie Responder",
    icon: "🌱",
    description: "Active volunteer taking on first missions",
    tier: "Rookie",
    minCompleted: 0,
    nextTierAt: 5,
    progressPercent: Math.min(100, Math.round((count / 5) * 100)),
  };
}

/**
 * @desc    Get volunteer leaderboard with time filters, rankings, badges, and stats
 * @route   GET /api/volunteers/leaderboard
 * @access  Private (Protected by JWT)
 */
export const getLeaderboard = async (req, res, next) => {
  try {
    const timeframe = (req.query.timeframe || "all").toLowerCase(); // "all", "week", "month"

    // Fetch all volunteer users
    const volunteers = await User.find({ role: "volunteer" })
      .select("_id name email phone interests points acceptedRequestsCount completedRequestsCount createdAt")
      .lean();

    let volunteerStats = [];

    if (timeframe === "all") {
      // Reconcile points and counts with EmergencyRequest to ensure accuracy
      const requestStats = await EmergencyRequest.aggregate([
        {
          $match: {
            acceptedBy: { $ne: null },
            status: { $in: ["Accepted", "Completed"] },
          },
        },
        {
          $group: {
            _id: "$acceptedBy",
            acceptedCount: { $sum: 1 },
            completedCount: {
              $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
            },
            totalPoints: { $sum: "$pointsAwarded" },
          },
        },
      ]);

      const statsMap = new Map();
      for (const stat of requestStats) {
        statsMap.set(stat._id.toString(), stat);
      }

      volunteerStats = volunteers.map((vol) => {
        const idStr = vol._id.toString();
        const dbStat = statsMap.get(idStr);

        // Maximize between User record and reconciled EmergencyRequest sum
        const acceptedCount = Math.max(vol.acceptedRequestsCount || 0, dbStat?.acceptedCount || 0);
        const completedCount = Math.max(vol.completedRequestsCount || 0, dbStat?.completedCount || 0);
        const points = Math.max(vol.points || 0, dbStat?.totalPoints || 0);
        const badge = calculateBadge(completedCount);

        return {
          _id: vol._id,
          name: vol.name,
          email: vol.email,
          interests: vol.interests || [],
          points,
          acceptedCount,
          completedCount,
          badge,
        };
      });
    } else {
      // Time-filtered query: "week" (last 7 days) or "month" (last 30 days)
      const days = timeframe === "week" ? 7 : 30;
      const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const timeAgg = await EmergencyRequest.aggregate([
        {
          $match: {
            acceptedBy: { $ne: null },
            $or: [
              { acceptedAt: { $gte: sinceDate } },
              { completedAt: { $gte: sinceDate } },
              { updatedAt: { $gte: sinceDate } },
            ],
          },
        },
        {
          $group: {
            _id: "$acceptedBy",
            acceptedCount: { $sum: 1 },
            completedCount: {
              $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
            },
            totalPoints: { $sum: "$pointsAwarded" },
          },
        },
      ]);

      const timeStatsMap = new Map();
      for (const stat of timeAgg) {
        timeStatsMap.set(stat._id.toString(), stat);
      }

      volunteerStats = volunteers.map((vol) => {
        const idStr = vol._id.toString();
        const stat = timeStatsMap.get(idStr);

        const acceptedCount = stat?.acceptedCount || 0;
        const completedCount = stat?.completedCount || 0;
        const points = stat?.totalPoints || 0;
        const badge = calculateBadge(vol.completedRequestsCount || 0); // Badge reflects cumulative milestones

        return {
          _id: vol._id,
          name: vol.name,
          email: vol.email,
          interests: vol.interests || [],
          points,
          acceptedCount,
          completedCount,
          badge,
        };
      });
    }

    // Sort volunteers descending by points, then completed count, then name
    volunteerStats.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount;
      return a.name.localeCompare(b.name);
    });

    // Assign ranks
    const rankedVolunteers = volunteerStats.map((vol, index) => ({
      ...vol,
      rank: index + 1,
    }));

    // Top 3 Podium
    const top3 = rankedVolunteers.slice(0, 3).map((v) => ({
      ...v,
      podiumMedal: v.rank === 1 ? "🥇" : v.rank === 2 ? "🥈" : "🥉",
    }));

    // Current logged-in user's performance
    let myPerformance = null;
    if (req.user) {
      const currentUserIdStr = req.user._id.toString();
      const userRankData = rankedVolunteers.find((v) => v._id.toString() === currentUserIdStr);

      if (userRankData) {
        myPerformance = {
          isVolunteer: true,
          rank: userRankData.rank,
          points: userRankData.points,
          acceptedCount: userRankData.acceptedCount,
          completedCount: userRankData.completedCount,
          badge: userRankData.badge,
        };
      } else if (req.user.role === "volunteer") {
        const badge = calculateBadge(req.user.completedRequestsCount || 0);
        myPerformance = {
          isVolunteer: true,
          rank: rankedVolunteers.length + 1,
          points: req.user.points || 0,
          acceptedCount: req.user.acceptedRequestsCount || 0,
          completedCount: req.user.completedRequestsCount || 0,
          badge,
        };
      } else {
        myPerformance = {
          isVolunteer: false,
          role: req.user.role,
        };
      }
    }

    // Recent Achievements feed constructed from real MongoDB events
    const recentMissions = await EmergencyRequest.find({
      status: "Completed",
      acceptedBy: { $ne: null },
    })
      .populate("acceptedBy", "name role")
      .sort({ completedAt: -1, updatedAt: -1 })
      .limit(6)
      .lean();

    const recentAchievements = recentMissions
      .filter((m) => m.acceptedBy && m.acceptedBy.name)
      .map((m) => {
        return {
          id: m._id,
          volunteerName: m.acceptedBy.name,
          action: "completed",
          message: `${m.acceptedBy.name} resolved "${m.title}" in ${m.location}`,
          pointsAwarded: m.pointsAwarded || 20,
          timestamp: m.completedAt || m.updatedAt || m.createdAt,
        };
      });

    return res.status(200).json({
      success: true,
      timeframe,
      totalVolunteers: rankedVolunteers.length,
      top3,
      leaderboard: rankedVolunteers,
      myPerformance,
      recentAchievements,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getLeaderboard,
  calculateBadge,
};
