import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { apiUrl } from "../config/api";
import "../styles/pages.css";

function Leaderboard() {
  const { user, token } = useAuth();

  const [timeframe, setTimeframe] = useState("all"); // "all", "week", "month"
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [top3, setTop3] = useState([]);
  const [myPerformance, setMyPerformance] = useState(null);
  const [recentAchievements, setRecentAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLeaderboard = useCallback(async (selectedTimeframe = timeframe) => {
    try {
      setLoading(true);
      setError("");

      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const targetUrl = apiUrl(`/api/volunteers/leaderboard?timeframe=${selectedTimeframe}`);
      const res = await fetch(targetUrl, {
        headers,
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          `Backend API is currently unreachable or starting up (${res.status}). If using a separate backend, please ensure VITE_API_URL is configured in your deployment settings.`
        );
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Failed to load leaderboard data.");
        return;
      }

      setLeaderboardData(data.leaderboard || []);
      setTop3(data.top3 || []);
      setMyPerformance(data.myPerformance || null);
      setRecentAchievements(data.recentAchievements || []);
    } catch (err) {
      console.error("[Leaderboard] Fetch error:", err);
      setError(err.message || "Network error: Could not load leaderboard.");
    } finally {
      setLoading(false);
    }
  }, [timeframe, token]);

  useEffect(() => {
    fetchLeaderboard(timeframe);
  }, [timeframe, fetchLeaderboard]);

  const getPodiumTheme = (rank) => {
    switch (rank) {
      case 1:
        return {
          medal: "🥇",
          label: "1st Place",
          color: "#fbbf24",
          border: "rgba(251, 191, 36, 0.6)",
          bg: "linear-gradient(145deg, rgba(245, 158, 11, 0.16), rgba(15, 23, 42, 0.8))",
          badgeBg: "rgba(245, 158, 11, 0.2)",
          shadow: "0 10px 30px rgba(245, 158, 11, 0.15)",
        };
      case 2:
        return {
          medal: "🥈",
          label: "2nd Place",
          color: "#cbd5e1",
          border: "rgba(203, 213, 225, 0.5)",
          bg: "linear-gradient(145deg, rgba(148, 163, 184, 0.14), rgba(15, 23, 42, 0.8))",
          badgeBg: "rgba(148, 163, 184, 0.2)",
          shadow: "0 10px 30px rgba(148, 163, 184, 0.1)",
        };
      case 3:
        return {
          medal: "🥉",
          label: "3rd Place",
          color: "#f97316",
          border: "rgba(249, 115, 22, 0.5)",
          bg: "linear-gradient(145deg, rgba(217, 119, 6, 0.14), rgba(15, 23, 42, 0.8))",
          badgeBg: "rgba(217, 119, 6, 0.2)",
          shadow: "0 10px 30px rgba(217, 119, 6, 0.1)",
        };
      default:
        return {
          medal: `#${rank}`,
          label: `Rank ${rank}`,
          color: "#94a3b8",
          border: "#1f2d40",
          bg: "#121926",
          badgeBg: "rgba(255, 255, 255, 0.05)",
          shadow: "none",
        };
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case "Champion":
        return { color: "#fbbf24", bg: "rgba(245, 158, 11, 0.15)", border: "#f59e0b" };
      case "Hero":
        return { color: "#f87171", bg: "rgba(239, 68, 68, 0.15)", border: "#ef4444" };
      case "Helper":
        return { color: "#60a5fa", bg: "rgba(59, 130, 246, 0.15)", border: "#3b82f6" };
      case "Dedicated":
        return { color: "#34d399", bg: "rgba(16, 185, 129, 0.15)", border: "#10b981" };
      default:
        return { color: "#a78bfa", bg: "rgba(167, 139, 250, 0.15)", border: "#8b5cf6" };
    }
  };

  return (
    <>
      <Navbar />

      <main className="page leaderboard-page" style={{ padding: "40px 20px 80px" }}>
        <div className="page-container" style={{ maxWidth: "1150px", margin: "0 auto" }}>
          
          {/* Header Banner */}
          <section
            style={{
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(22, 119, 255, 0.15))",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "16px",
              padding: "28px 32px",
              marginBottom: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "20px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <span style={{ fontSize: "32px" }}>🏆</span>
                <h1 style={{ margin: 0, fontSize: "28px", color: "#fff" }}>
                  Volunteer <span style={{ color: "#fbbf24" }}>Leaderboard</span>
                </h1>
                <span
                  style={{
                    fontSize: "11px",
                    background: "rgba(245, 158, 11, 0.2)",
                    border: "1px solid #fbbf24",
                    color: "#fde68a",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                  }}
                >
                  Live Rankings
                </span>
              </div>
              <p style={{ color: "#a0aec0", margin: 0, fontSize: "14px", maxWidth: "620px" }}>
                Celebrating community responders who step forward during critical emergencies. Points are
                earned by accepting (+10) and successfully completing (+20 + urgency bonus) missions.
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <Link
                to="/volunteer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 18px",
                  background: "#1677ff",
                  color: "#fff",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "13.5px",
                  textDecoration: "none",
                }}
              >
                🤝 Volunteer Portal
              </Link>
              <button
                onClick={() => fetchLeaderboard(timeframe)}
                disabled={loading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 16px",
                  background: "#162235",
                  border: "1px solid #294060",
                  color: "#e2e8f0",
                  borderRadius: "8px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "13.5px",
                  fontWeight: "600",
                }}
              >
                🔄 {loading ? "Updating..." : "Refresh"}
              </button>
            </div>
          </section>

          {/* Error Message */}
          {error && (
            <div
              style={{
                background: "rgba(229, 57, 53, 0.15)",
                border: "1px solid #e53935",
                color: "#ff8585",
                padding: "12px 18px",
                borderRadius: "8px",
                marginBottom: "24px",
                fontSize: "14px",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Top 3 Podium Highlights */}
          {top3.length > 0 && (
            <section style={{ marginBottom: "34px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <span style={{ fontSize: "20px" }}>🌟</span>
                <h2 style={{ margin: 0, color: "#fff", fontSize: "20px", fontWeight: "700" }}>
                  Top Responders
                </h2>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "20px",
                }}
              >
                {top3.map((vol) => {
                  const theme = getPodiumTheme(vol.rank);
                  const tierStyle = getTierColor(vol.badge?.tier);

                  return (
                    <div
                      key={vol._id}
                      style={{
                        background: theme.bg,
                        border: `1px solid ${theme.border}`,
                        borderRadius: "16px",
                        padding: "24px 20px",
                        boxShadow: theme.shadow,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {/* Medal Crown Badge */}
                      <div style={{ fontSize: "40px", marginBottom: "8px" }}>
                        {theme.medal}
                      </div>

                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "800",
                          textTransform: "uppercase",
                          color: theme.color,
                          letterSpacing: "0.5px",
                          marginBottom: "8px",
                        }}
                      >
                        {theme.label}
                      </span>

                      <h3
                        style={{
                          color: "#fff",
                          fontSize: "20px",
                          margin: "0 0 6px",
                          fontWeight: "700",
                        }}
                      >
                        {vol.name}
                      </h3>

                      {/* Badge Pill */}
                      {vol.badge && (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            background: tierStyle.bg,
                            border: `1px solid ${tierStyle.border}`,
                            color: tierStyle.color,
                            fontSize: "11.5px",
                            fontWeight: "700",
                            padding: "3px 10px",
                            borderRadius: "12px",
                            marginBottom: "16px",
                          }}
                        >
                          <span>{vol.badge.icon}</span> {vol.badge.name}
                        </div>
                      )}

                      {/* Points Card */}
                      <div
                        style={{
                          background: "rgba(0, 0, 0, 0.35)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "10px",
                          width: "100%",
                          padding: "12px",
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "8px",
                          textAlign: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "22px", fontWeight: "800", color: theme.color }}>
                            {vol.points}
                          </div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" }}>
                            Total Points
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "22px", fontWeight: "800", color: "#34d399" }}>
                            {vol.completedCount}
                          </div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" }}>
                            Completed
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Section: My Performance (Only for Logged-In Volunteer) */}
          {myPerformance && myPerformance.isVolunteer && (
            <section
              style={{
                background: "linear-gradient(135deg, #101a28, #0e1522)",
                border: "1px solid #273e5f",
                borderRadius: "16px",
                padding: "24px 28px",
                marginBottom: "32px",
                boxShadow: "0 10px 28px rgba(0,0,0,0.3)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "14px",
                  marginBottom: "18px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "24px" }}>👤</span>
                  <div>
                    <h2 style={{ margin: 0, color: "#fff", fontSize: "19px", fontWeight: "700" }}>
                      My Performance
                    </h2>
                    <p style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: "13px" }}>
                      Your personalized responder stats and achievement rank
                    </p>
                  </div>
                </div>

                {myPerformance.badge && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "rgba(245, 158, 11, 0.12)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      borderRadius: "12px",
                      padding: "6px 14px",
                      color: "#fbbf24",
                      fontSize: "13px",
                      fontWeight: "700",
                    }}
                  >
                    <span>{myPerformance.badge.icon}</span> Current Badge: {myPerformance.badge.name}
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "16px",
                  marginBottom: "18px",
                }}
              >
                <div
                  style={{
                    background: "#080c14",
                    border: "1px solid #1a2738",
                    borderRadius: "12px",
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ color: "#fbbf24", fontSize: "26px", fontWeight: "800" }}>
                    #{myPerformance.rank}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "12px", textTransform: "uppercase", marginTop: "4px" }}>
                    Current Rank
                  </div>
                </div>

                <div
                  style={{
                    background: "#080c14",
                    border: "1px solid #1a2738",
                    borderRadius: "12px",
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ color: "#60a5fa", fontSize: "26px", fontWeight: "800" }}>
                    {myPerformance.points}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "12px", textTransform: "uppercase", marginTop: "4px" }}>
                    Total Points
                  </div>
                </div>

                <div
                  style={{
                    background: "#080c14",
                    border: "1px solid #1a2738",
                    borderRadius: "12px",
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ color: "#a78bfa", fontSize: "26px", fontWeight: "800" }}>
                    {myPerformance.acceptedCount}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "12px", textTransform: "uppercase", marginTop: "4px" }}>
                    Missions Accepted
                  </div>
                </div>

                <div
                  style={{
                    background: "#080c14",
                    border: "1px solid #1a2738",
                    borderRadius: "12px",
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ color: "#34d399", fontSize: "26px", fontWeight: "800" }}>
                    {myPerformance.completedCount}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "12px", textTransform: "uppercase", marginTop: "4px" }}>
                    Missions Completed
                  </div>
                </div>
              </div>

              {/* Progress to next tier */}
              {myPerformance.badge?.nextTierAt && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "12.5px",
                      color: "#94a3b8",
                      marginBottom: "6px",
                    }}
                  >
                    <span>
                      Badge Progress ({myPerformance.completedCount} / {myPerformance.badge.nextTierAt} missions completed)
                    </span>
                    <span style={{ color: "#fbbf24", fontWeight: "bold" }}>
                      {myPerformance.badge.progressPercent}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: "8px",
                      background: "#162335",
                      borderRadius: "6px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${myPerformance.badge.progressPercent}%`,
                        background: "linear-gradient(90deg, #3b82f6, #fbbf24)",
                        borderRadius: "6px",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Timeframe Filter Bar & Full Leaderboard Section */}
          <section>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "20px" }}>📊</span>
                <h2 style={{ margin: 0, color: "#fff", fontSize: "20px", fontWeight: "700" }}>
                  Volunteer Standings
                </h2>
                <span style={{ color: "#64748b", fontSize: "13px" }}>
                  ({leaderboardData.length} Registered Responders)
                </span>
              </div>

              {/* Time Filters */}
              <div
                style={{
                  display: "flex",
                  background: "#0c131d",
                  border: "1px solid #1e2c40",
                  borderRadius: "24px",
                  padding: "4px",
                  gap: "4px",
                }}
              >
                {[
                  { id: "week", label: "This Week" },
                  { id: "month", label: "This Month" },
                  { id: "all", label: "All Time" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setTimeframe(tab.id)}
                    style={{
                      padding: "6px 16px",
                      borderRadius: "18px",
                      border: "none",
                      background: timeframe === tab.id ? "#1677ff" : "transparent",
                      color: timeframe === tab.id ? "#fff" : "#94a3b8",
                      fontWeight: "600",
                      fontSize: "13px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Leaderboard Table / Cards */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>⏳</div>
                <p>Loading real-time volunteer standings...</p>
              </div>
            ) : error ? (
              <div
                style={{
                  background: "rgba(229, 57, 53, 0.1)",
                  border: "1px solid #e53935",
                  borderRadius: "12px",
                  padding: "45px 20px",
                  textAlign: "center",
                  color: "#ff8585",
                }}
              >
                <div style={{ fontSize: "38px", marginBottom: "10px" }}>⚠️</div>
                <h3 style={{ color: "#ff8585", margin: "0 0 8px" }}>Failed to Load Leaderboard</h3>
                <p style={{ fontSize: "14px", margin: "0 0 16px", color: "#cbd5e1" }}>{error}</p>
                <button
                  onClick={() => fetchLeaderboard(timeframe)}
                  style={{
                    padding: "8px 20px",
                    background: "#1677ff",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "13.5px",
                  }}
                >
                  Retry
                </button>
              </div>
            ) : leaderboardData.length === 0 ? (
              <div
                style={{
                  background: "#0f1520",
                  border: "1px dashed #22344d",
                  borderRadius: "12px",
                  padding: "50px 20px",
                  textAlign: "center",
                  color: "#8391a5",
                }}
              >
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>🛡️</div>
                <h3 style={{ color: "#cbd5e1", margin: "0 0 8px" }}>No Volunteer Activity Found</h3>
                <p style={{ fontSize: "14px", margin: 0 }}>
                  There are no points recorded for the selected timeframe. As volunteers accept and complete
                  emergency requests, they will automatically appear here.
                </p>
              </div>
            ) : (
              <div
                style={{
                  background: "#101622",
                  border: "1px solid #1f2d40",
                  borderRadius: "14px",
                  overflow: "hidden",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                }}
              >
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr
                        style={{
                          background: "#090d15",
                          borderBottom: "1px solid #1f2d40",
                          color: "#94a3b8",
                          fontSize: "12.5px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        <th style={{ padding: "14px 18px", width: "80px" }}>Rank</th>
                        <th style={{ padding: "14px 18px" }}>Volunteer</th>
                        <th style={{ padding: "14px 18px" }}>Badge Tier</th>
                        <th style={{ padding: "14px 18px", textAlign: "center" }}>Accepted</th>
                        <th style={{ padding: "14px 18px", textAlign: "center" }}>Completed</th>
                        <th style={{ padding: "14px 20px", textAlign: "right" }}>Total Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardData.map((vol) => {
                        const isCurrentUser = user && user.email === vol.email;
                        const tierStyle = getTierColor(vol.badge?.tier);

                        return (
                          <tr
                            key={vol._id}
                            style={{
                              borderBottom: "1px solid #182333",
                              background: isCurrentUser
                                ? "rgba(22, 119, 255, 0.1)"
                                : "transparent",
                              transition: "background 0.2s",
                            }}
                          >
                            {/* Rank */}
                            <td style={{ padding: "16px 18px", fontWeight: "700" }}>
                              {vol.rank === 1 ? (
                                <span style={{ fontSize: "20px" }}>🥇</span>
                              ) : vol.rank === 2 ? (
                                <span style={{ fontSize: "20px" }}>🥈</span>
                              ) : vol.rank === 3 ? (
                                <span style={{ fontSize: "20px" }}>🥉</span>
                              ) : (
                                <span style={{ color: "#94a3b8", fontSize: "14px" }}>
                                  #{vol.rank}
                                </span>
                              )}
                            </td>

                            {/* Volunteer Name */}
                            <td style={{ padding: "16px 18px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div
                                  style={{
                                    width: "36px",
                                    height: "36px",
                                    borderRadius: "50%",
                                    background: "#162335",
                                    border: "1px solid #273e5f",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: "bold",
                                    color: "#60a5fa",
                                    fontSize: "14px",
                                  }}
                                >
                                  {vol.name ? vol.name.charAt(0).toUpperCase() : "V"}
                                </div>
                                <div>
                                  <div style={{ color: "#fff", fontWeight: "600", fontSize: "14px" }}>
                                    {vol.name}
                                    {isCurrentUser && (
                                      <span
                                        style={{
                                          marginLeft: "8px",
                                          background: "#1677ff",
                                          color: "#fff",
                                          fontSize: "10.5px",
                                          padding: "2px 7px",
                                          borderRadius: "10px",
                                          fontWeight: "bold",
                                        }}
                                      >
                                        YOU
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ color: "#64748b", fontSize: "12px" }}>
                                    {vol.interests?.slice(0, 2).join(", ") || "Responder"}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Badge */}
                            <td style={{ padding: "16px 18px" }}>
                              {vol.badge && (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    background: tierStyle.bg,
                                    border: `1px solid ${tierStyle.border}`,
                                    color: tierStyle.color,
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    padding: "3px 10px",
                                    borderRadius: "12px",
                                  }}
                                >
                                  <span>{vol.badge.icon}</span> {vol.badge.name}
                                </span>
                              )}
                            </td>

                            {/* Accepted */}
                            <td style={{ padding: "16px 18px", textAlign: "center", color: "#cbd5e1" }}>
                              {vol.acceptedCount}
                            </td>

                            {/* Completed */}
                            <td style={{ padding: "16px 18px", textAlign: "center", color: "#34d399", fontWeight: "600" }}>
                              {vol.completedCount}
                            </td>

                            {/* Points */}
                            <td style={{ padding: "16px 20px", textAlign: "right" }}>
                              <span
                                style={{
                                  background: "rgba(245, 158, 11, 0.15)",
                                  border: "1px solid rgba(245, 158, 11, 0.3)",
                                  color: "#fbbf24",
                                  fontWeight: "800",
                                  fontSize: "14px",
                                  padding: "4px 12px",
                                  borderRadius: "12px",
                                  display: "inline-block",
                                }}
                              >
                                {vol.points} pts
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* Section: Recent Achievements & Badges Guide */}
          <section
            style={{
              marginTop: "44px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "24px",
            }}
          >
            {/* Recent Live Achievements */}
            <div
              style={{
                background: "#0c131d",
                border: "1px solid #1f2d40",
                borderRadius: "14px",
                padding: "22px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <span style={{ fontSize: "18px" }}>⚡</span>
                <h3 style={{ margin: 0, color: "#fff", fontSize: "16px", fontWeight: "700" }}>
                  Recent Volunteer Achievements
                </h3>
              </div>

              {recentAchievements.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>
                  No recent achievements yet. As missions are completed, live events will appear here.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {recentAchievements.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: "#070a10",
                        border: "1px solid #182333",
                        borderRadius: "8px",
                        padding: "10px 12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                        fontSize: "13px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ color: "#34d399", fontSize: "15px" }}>✓</span>
                        <span style={{ color: "#cbd5e1" }}>{item.message}</span>
                      </div>
                      <span
                        style={{
                          color: "#fbbf24",
                          fontWeight: "700",
                          fontSize: "12px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        +{item.pointsAwarded} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Achievement Badges Guide */}
            <div
              style={{
                background: "#0c131d",
                border: "1px solid #1f2d40",
                borderRadius: "14px",
                padding: "22px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <span style={{ fontSize: "18px" }}>🎖️</span>
                <h3 style={{ margin: 0, color: "#fff", fontSize: "16px", fontWeight: "700" }}>
                  Volunteer Badge Tiers
                </h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  { icon: "🌱", name: "Rookie Responder", desc: "0 - 4 missions completed", tier: "Rookie" },
                  { icon: "🛡️", name: "Dedicated Responder", desc: "5 - 9 missions completed", tier: "Dedicated" },
                  { icon: "🤝", name: "Community Helper", desc: "10 - 24 missions completed", tier: "Helper" },
                  { icon: "🦸", name: "Emergency Hero", desc: "25 - 49 missions completed", tier: "Hero" },
                  { icon: "🏆", name: "ResQ Champion", desc: "50+ missions completed", tier: "Champion" },
                ].map((b) => {
                  const style = getTierColor(b.tier);
                  return (
                    <div
                      key={b.name}
                      style={{
                        background: "#070a10",
                        border: "1px solid #182333",
                        borderRadius: "8px",
                        padding: "9px 12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "16px" }}>{b.icon}</span>
                        <span style={{ color: style.color, fontWeight: "600", fontSize: "13px" }}>
                          {b.name}
                        </span>
                      </div>
                      <span style={{ color: "#64748b", fontSize: "12px" }}>{b.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </>
  );
}

export default Leaderboard;
