import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/pages.css";

const CATEGORIES = ["All", "Blood", "Food", "Medicine", "Transport", "Rescue"];

function Volunteer() {
  const { user, token, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const isVolunteerOrAdmin = user && (user.role === "volunteer" || user.role === "admin");

  // Tabs: 'available' or 'my-accepted'
  const [activeTab, setActiveTab] = useState("available");

  // Data states
  const [availableRequests, setAvailableRequests] = useState([]);
  const [myAcceptedRequests, setMyAcceptedRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Action states
  const [actionInProgress, setActionInProgress] = useState(null);

  // Fetch Available (Verified) Requests
  const fetchAvailable = useCallback(async () => {
    if (!token || !isVolunteerOrAdmin) return;
    try {
      setError("");
      const res = await fetch("/api/requests/available", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          logout();
          navigate("/login");
          return;
        }
        setError(data.message || "Failed to load available emergency requests.");
        return;
      }
      setAvailableRequests(data.requests || []);
    } catch (err) {
      console.error("[Volunteer] Fetch available error:", err);
      setError("Network error: Could not reach the server.");
    }
  }, [token, isVolunteerOrAdmin, logout, navigate]);

  // Fetch Volunteer's Accepted Requests
  const fetchMyAccepted = useCallback(async () => {
    if (!token || !isVolunteerOrAdmin) return;
    try {
      const res = await fetch("/api/requests/my-accepted", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMyAcceptedRequests(data.requests || []);
      }
    } catch (err) {
      console.error("[Volunteer] Fetch accepted error:", err);
    }
  }, [token, isVolunteerOrAdmin]);

  // Combined fetch
  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchAvailable(), fetchMyAccepted()]);
    setLoading(false);
  }, [fetchAvailable, fetchMyAccepted]);

  useEffect(() => {
    let isMounted = true;
    const loadInitial = async () => {
      if (!isVolunteerOrAdmin || !token) return;
      try {
        if (isMounted) setLoading(true);
        const [availRes, acceptedRes] = await Promise.all([
          fetch("/api/requests/available", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/requests/my-accepted", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const availData = await availRes.json();
        const acceptedData = await acceptedRes.json();
        if (isMounted) {
          if (availRes.ok) {
            setAvailableRequests(availData.requests || []);
          } else {
            setError(availData.message || "Failed to load available emergency requests.");
          }
          if (acceptedRes.ok) {
            setMyAcceptedRequests(acceptedData.requests || []);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("[Volunteer] Initial fetch error:", err);
          setError("Network error: Could not reach the server.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInitial();
    return () => {
      isMounted = false;
    };
  }, [isVolunteerOrAdmin, token]);

  // Accept a Request
  const handleAcceptRequest = async (requestId) => {
    setActionInProgress(requestId);
    setError("");
    try {
      const res = await fetch(`/api/requests/${requestId}/accept`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to accept emergency request.");
        return;
      }

      setSuccessMessage("Emergency mission accepted! Contact details are now active in 'My Accepted Tasks'.");
      setActiveTab("my-accepted");
      await refreshAll();
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      console.error("[Volunteer] Accept error:", err);
      setError("Network error: Could not accept emergency mission.");
    } finally {
      setActionInProgress(null);
    }
  };

  // Complete a Request
  const handleCompleteRequest = async (requestId) => {
    setActionInProgress(requestId);
    setError("");
    try {
      const res = await fetch(`/api/requests/${requestId}/complete`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to mark emergency as completed.");
        return;
      }

      setSuccessMessage("Mission marked as completed! Thank you for your service.");
      await refreshAll();
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      console.error("[Volunteer] Complete error:", err);
      setError("Network error: Could not complete emergency mission.");
    } finally {
      setActionInProgress(null);
    }
  };

  // Cancel / Release a Request
  const handleCancelRequest = async (requestId) => {
    if (!window.confirm("Are you sure you want to release this emergency request back to the pool?")) {
      return;
    }
    setActionInProgress(requestId);
    setError("");
    try {
      const res = await fetch(`/api/requests/${requestId}/cancel`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to release emergency request.");
        return;
      }

      setSuccessMessage("Emergency request has been released.");
      await refreshAll();
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      console.error("[Volunteer] Release error:", err);
      setError("Network error: Could not release emergency request.");
    } finally {
      setActionInProgress(null);
    }
  };

  // Badges & Helpers
  const getCategoryIcon = (category) => {
    const icons = { Blood: "🩸", Food: "🍲", Medicine: "💊", Transport: "🚑", Rescue: "🛟" };
    return icons[category] || "🚨";
  };

  const getUrgencyBadge = (urgency) => {
    const map = {
      Low: { bg: "rgba(34, 197, 94, 0.15)", border: "#22c55e", color: "#4ade80" },
      Medium: { bg: "rgba(59, 130, 246, 0.15)", border: "#3b82f6", color: "#60a5fa" },
      High: { bg: "rgba(249, 115, 22, 0.15)", border: "#f97316", color: "#fb923c" },
      Critical: { bg: "rgba(239, 68, 68, 0.2)", border: "#ef4444", color: "#f87171" },
    };
    const c = map[urgency] || map.Medium;
    return (
      <span
        style={{
          background: c.bg,
          border: `1px solid ${c.border}`,
          color: c.color,
          padding: "3px 9px",
          borderRadius: "12px",
          fontSize: "11px",
          fontWeight: "700",
          textTransform: "uppercase",
        }}
      >
        {urgency} Urgency
      </span>
    );
  };

  const formatDate = (iso) => {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter current list
  const currentList = activeTab === "available" ? availableRequests : myAcceptedRequests;
  const filteredRequests = currentList.filter((req) => {
    const matchesCategory = selectedCategory === "All" || req.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <Navbar />

      <main className="page volunteer-page" style={{ padding: "40px 20px 80px" }}>
        <div className="page-container" style={{ maxWidth: "1100px", margin: "0 auto" }}>
          
          {/* Header Banner */}
          <section
            style={{
              background: "linear-gradient(135deg, rgba(11, 61, 145, 0.25), rgba(6, 182, 212, 0.15))",
              border: "1px solid #1c3352",
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
                <span style={{ fontSize: "30px" }}>🤝</span>
                <h1 style={{ margin: 0, fontSize: "28px", color: "#fff" }}>
                  Volunteer <span style={{ color: "#4da3ff" }}>Portal</span>
                </h1>
                {isVolunteerOrAdmin && (
                  <span
                    style={{
                      fontSize: "11px",
                      background: "rgba(22, 119, 255, 0.2)",
                      border: "1px solid #1677ff",
                      color: "#60a5fa",
                      padding: "3px 10px",
                      borderRadius: "12px",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                    }}
                  >
                    Verified Responder
                  </span>
                )}
              </div>
              <p style={{ color: "#a0aec0", margin: 0, fontSize: "14px", maxWidth: "600px" }}>
                Browse verified emergency requests in real time, deploy rapid assistance, and connect with
                community members in need.
              </p>
            </div>

            {isVolunteerOrAdmin && (
              <button
                onClick={refreshAll}
                disabled={loading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  background: "#162235",
                  border: "1px solid #294060",
                  color: "#e2e8f0",
                  borderRadius: "8px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                🔄 {loading ? "Refreshing..." : "Refresh Incidents"}
              </button>
            )}
          </section>

          {/* If NOT authenticated or NOT volunteer */}
          {!isAuthenticated ? (
            <div
              style={{
                background: "#111822",
                border: "1px solid #23354d",
                borderRadius: "16px",
                padding: "40px 30px",
                textAlign: "center",
                maxWidth: "680px",
                margin: "40px auto",
              }}
            >
              <div style={{ fontSize: "52px", marginBottom: "16px" }}>🤝</div>
              <h2 style={{ color: "#fff", fontSize: "24px", marginBottom: "12px" }}>
                Join the ResQHub Emergency Responder Network
              </h2>
              <p style={{ color: "#94a3b8", fontSize: "15px", lineHeight: "1.6", marginBottom: "26px" }}>
                Volunteers are the backbone of rapid emergency response. As a registered responder, you will
                gain immediate access to incoming verified requests for medical supplies, food distribution,
                blood donations, transport, and rescue missions.
              </p>
              <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
                <Link
                  to="/register"
                  style={{
                    padding: "12px 28px",
                    background: "#1677ff",
                    color: "#fff",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    fontSize: "15px",
                  }}
                >
                  Register as a Volunteer
                </Link>
                <Link
                  to="/login"
                  style={{
                    padding: "12px 24px",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid #334155",
                    color: "#e2e8f0",
                    borderRadius: "8px",
                    fontWeight: "600",
                    fontSize: "15px",
                  }}
                >
                  Sign In to Responder Account
                </Link>
              </div>
            </div>
          ) : !isVolunteerOrAdmin ? (
            <div
              style={{
                background: "#111822",
                border: "1px solid #f59e0b",
                borderRadius: "16px",
                padding: "36px 28px",
                textAlign: "center",
                maxWidth: "600px",
                margin: "40px auto",
              }}
            >
              <div style={{ fontSize: "44px", marginBottom: "12px" }}>ℹ️</div>
              <h2 style={{ color: "#fbbf24", fontSize: "22px", marginBottom: "10px" }}>
                Citizen Requester Account Detected
              </h2>
              <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: "1.6", marginBottom: "22px" }}>
                You are currently signed in as <strong>{user.name}</strong> with the <strong>Citizen ('user')</strong> role.
                The Mission Dispatch Board is reserved for registered Volunteer Responders and Administrators.
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <Link
                  to="/report"
                  style={{
                    padding: "10px 20px",
                    background: "#e53935",
                    color: "#fff",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                >
                  🚨 Report Emergency
                </Link>
                <Link
                  to="/dashboard"
                  style={{
                    padding: "10px 20px",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid #334155",
                    color: "#e2e8f0",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                >
                  Go to My Dashboard
                </Link>
              </div>
            </div>
          ) : (
            /* Active Volunteer View */
            <div>
              {/* Alert Messages */}
              {error && (
                <div
                  style={{
                    background: "rgba(229, 57, 53, 0.15)",
                    border: "1px solid #e53935",
                    color: "#ff8585",
                    padding: "12px 18px",
                    borderRadius: "8px",
                    marginBottom: "20px",
                    fontSize: "14px",
                  }}
                >
                  ⚠️ {error}
                </div>
              )}

              {successMessage && (
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid #10b981",
                    color: "#34d399",
                    padding: "12px 18px",
                    borderRadius: "8px",
                    marginBottom: "20px",
                    fontSize: "14px",
                  }}
                >
                  ✓ {successMessage}
                </div>
              )}

              {/* Navigation Tabs */}
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  borderBottom: "1px solid #1e2c40",
                  marginBottom: "24px",
                  paddingBottom: "12px",
                }}
              >
                <button
                  onClick={() => setActiveTab("available")}
                  style={{
                    padding: "10px 20px",
                    background: activeTab === "available" ? "#1677ff" : "transparent",
                    color: activeTab === "available" ? "#fff" : "#94a3b8",
                    border: activeTab === "available" ? "none" : "1px solid #27384f",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "14px",
                  }}
                >
                  🚨 Available Missions
                  <span
                    style={{
                      background: activeTab === "available" ? "rgba(255,255,255,0.2)" : "#162335",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontSize: "12px",
                    }}
                  >
                    {availableRequests.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("my-accepted")}
                  style={{
                    padding: "10px 20px",
                    background: activeTab === "my-accepted" ? "#1677ff" : "transparent",
                    color: activeTab === "my-accepted" ? "#fff" : "#94a3b8",
                    border: activeTab === "my-accepted" ? "none" : "1px solid #27384f",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "14px",
                  }}
                >
                  🤝 My Active Tasks
                  <span
                    style={{
                      background: activeTab === "my-accepted" ? "rgba(255,255,255,0.2)" : "#162335",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontSize: "12px",
                    }}
                  >
                    {myAcceptedRequests.filter((r) => r.status === "Accepted").length}
                  </span>
                </button>
              </div>

              {/* Filters Bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "14px",
                  marginBottom: "24px",
                }}
              >
                {/* Category Pills */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "20px",
                        border: selectedCategory === cat ? "1px solid #3b82f6" : "1px solid #202e42",
                        background: selectedCategory === cat ? "rgba(59, 130, 246, 0.2)" : "#0f1622",
                        color: selectedCategory === cat ? "#60a5fa" : "#8e9aaf",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      {cat !== "All" && getCategoryIcon(cat)} {cat}
                    </button>
                  ))}
                </div>

                {/* Search Box */}
                <input
                  type="text"
                  placeholder="🔍 Search title, location, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: "8px 14px",
                    background: "#0f1622",
                    border: "1px solid #223247",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "13px",
                    minWidth: "260px",
                    outline: "none",
                  }}
                />
              </div>

              {/* Incidents Cards Grid */}
              {loading ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
                  <div style={{ fontSize: "36px", marginBottom: "12px" }}>⏳</div>
                  <p>Loading emergency incidents from database...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
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
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>
                    {activeTab === "available" ? "🛡️" : "📋"}
                  </div>
                  <h3 style={{ color: "#cbd5e1", margin: "0 0 8px" }}>
                    {activeTab === "available"
                      ? "No Active Emergency Requests"
                      : "You Have No Active Assigned Tasks"}
                  </h3>
                  <p style={{ fontSize: "14px", margin: 0 }}>
                    {activeTab === "available"
                      ? "There are currently no active emergency requests waiting for volunteer response."
                      : "Select an available incident from the 'Available Missions' tab to accept it."}
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: "20px" }}>
                  {filteredRequests.map((req) => {
                    const isAcceptedTab = activeTab === "my-accepted";
                    const isProcessing = actionInProgress === req._id;

                    return (
                      <div
                        key={req._id}
                        style={{
                          background: "#121926",
                          border: "1px solid #1f2d40",
                          borderRadius: "14px",
                          padding: "22px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                        }}
                      >
                        <div>
                          {/* Header: Category & Urgency */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "14px",
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                background: "rgba(255,255,255,0.06)",
                                padding: "4px 10px",
                                borderRadius: "10px",
                                fontSize: "12px",
                                color: "#cbd5e1",
                                fontWeight: "600",
                              }}
                            >
                              {getCategoryIcon(req.category)} {req.category}
                            </span>
                            {getUrgencyBadge(req.urgency)}
                          </div>

                          <h3 style={{ color: "#fff", fontSize: "18px", margin: "0 0 10px", lineHeight: "1.4" }}>
                            {req.title}
                          </h3>

                          <p style={{ color: "#94a3b8", fontSize: "13px", lineHeight: "1.5", margin: "0 0 16px" }}>
                            {req.description}
                          </p>

                          {req.image && (
                            <div style={{ marginBottom: "16px", borderRadius: "8px", overflow: "hidden", border: "1px solid #27384f" }}>
                              <img
                                src={req.image}
                                alt={req.title}
                                style={{
                                  width: "100%",
                                  maxHeight: "180px",
                                  objectFit: "cover",
                                  display: "block",
                                }}
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            </div>
                          )}

                          {/* Details List */}
                          <div
                            style={{
                              background: "#0a0f18",
                              borderRadius: "8px",
                              padding: "12px",
                              fontSize: "12px",
                              color: "#cbd5e1",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                              marginBottom: "18px",
                            }}
                          >
                            <div>
                              <strong style={{ color: "#60a5fa" }}>📍 Location:</strong> {req.location}
                            </div>
                            <div>
                              <strong style={{ color: "#a78bfa" }}>👤 Reported By:</strong>{" "}
                              {req.createdBy?.name || "Citizen"}
                              {req.createdBy?.phone && (
                                <span style={{ marginLeft: "6px", color: "#34d399" }}>
                                  📞 <a href={`tel:${req.createdBy.phone}`} style={{ color: "#34d399", textDecoration: "underline" }}>{req.createdBy.phone}</a>
                                </span>
                              )}
                            </div>
                            <div style={{ color: "#64748b" }}>
                              <strong>🕒 Time:</strong> {formatDate(req.createdAt)}
                            </div>
                            {isAcceptedTab && (
                              <div>
                                <strong style={{ color: "#38bdf8" }}>Status:</strong>{" "}
                                <span style={{ textTransform: "capitalize", fontWeight: "bold" }}>{req.status}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div>
                          {!isAcceptedTab ? (
                            <button
                              onClick={() => handleAcceptRequest(req._id)}
                              disabled={isProcessing}
                              style={{
                                width: "100%",
                                padding: "10px",
                                background: "#1677ff",
                                color: "#fff",
                                border: "none",
                                borderRadius: "8px",
                                fontWeight: "bold",
                                fontSize: "14px",
                                cursor: isProcessing ? "not-allowed" : "pointer",
                                transition: "all 0.2s",
                              }}
                            >
                              {isProcessing ? "Accepting..." : "🤝 Accept Emergency Response"}
                            </button>
                          ) : req.status === "Accepted" ? (
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                onClick={() => handleCompleteRequest(req._id)}
                                disabled={isProcessing}
                                style={{
                                  flex: 2,
                                  padding: "9px",
                                  background: "#10b981",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "8px",
                                  fontWeight: "bold",
                                  fontSize: "13px",
                                  cursor: isProcessing ? "not-allowed" : "pointer",
                                }}
                              >
                                {isProcessing ? "Saving..." : "✓ Mark Completed"}
                              </button>
                              <button
                                onClick={() => handleCancelRequest(req._id)}
                                disabled={isProcessing}
                                style={{
                                  flex: 1,
                                  padding: "9px",
                                  background: "transparent",
                                  border: "1px solid #ef4444",
                                  color: "#f87171",
                                  borderRadius: "8px",
                                  fontSize: "12px",
                                  cursor: isProcessing ? "not-allowed" : "pointer",
                                }}
                              >
                                Release
                              </button>
                            </div>
                          ) : (
                            <div
                              style={{
                                textAlign: "center",
                                padding: "6px",
                                background: "rgba(255,255,255,0.04)",
                                borderRadius: "6px",
                                fontSize: "12px",
                                color: "#94a3b8",
                              }}
                            >
                              Status: <strong>{req.status}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

export default Volunteer;