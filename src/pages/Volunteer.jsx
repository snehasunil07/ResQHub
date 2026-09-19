import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  isPushSupported,
  subscribeUserToPush,
  unsubscribeUserFromPush,
  checkSubscriptionStatus,
  sendTestNotification,
} from "../utils/pushManager";
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
  const [selectedDetailRequest, setSelectedDetailRequest] = useState(null);

  // URL Deep-linking for Notifications (?requestId=...)
  const [searchParams] = useSearchParams();
  const targetRequestId = searchParams.get("requestId") || searchParams.get("emergencyId");

  // Web Push Notification states
  const [pushStatus, setPushStatus] = useState({
    supported: isPushSupported(),
    permission: typeof Notification !== "undefined" ? Notification.permission : "default",
    isSubscribed: false,
    loading: false,
  });
  const [pushFeedback, setPushFeedback] = useState("");

  // Sync push subscription status on mount
  useEffect(() => {
    let isMounted = true;
    if (!isVolunteerOrAdmin || !token) return;

    checkSubscriptionStatus(token)
      .then((status) => {
        if (isMounted) {
          setPushStatus((prev) => ({
            ...prev,
            supported: status.supported,
            permission: status.permission,
            isSubscribed: status.isSubscribed,
          }));
        }
      })
      .catch((err) => {
        console.error("[Volunteer] Error checking push status:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [isVolunteerOrAdmin, token]);

  // Handle auto-opening emergency modal if navigated with ?requestId=...
  useEffect(() => {
    if (!targetRequestId || !token || !isVolunteerOrAdmin) return;

    // Check if the request is already in loaded list
    const match =
      availableRequests.find((r) => r._id === targetRequestId) ||
      myAcceptedRequests.find((r) => r._id === targetRequestId);

    if (match) {
      setSelectedDetailRequest(match);
      return;
    }

    // If not in current list (e.g. filtered), fetch directly from API
    let isMounted = true;
    fetch(`/api/requests/${targetRequestId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.request) {
          setSelectedDetailRequest(data.request);
        }
      })
      .catch((err) => {
        console.error("[Volunteer] Could not fetch request by target ID:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [targetRequestId, availableRequests, myAcceptedRequests, token, isVolunteerOrAdmin]);

  // Enable Push Notifications Handler
  const handleEnablePush = async () => {
    setPushStatus((prev) => ({ ...prev, loading: true }));
    setPushFeedback("");
    try {
      await subscribeUserToPush(token);
      setPushStatus((prev) => ({
        ...prev,
        isSubscribed: true,
        permission: "granted",
        loading: false,
      }));
      setPushFeedback("✓ Emergency alerts enabled! You will receive push notifications for matching emergencies.");
      setTimeout(() => setPushFeedback(""), 6000);
    } catch (err) {
      console.error("[Volunteer] Enable push error:", err);
      setPushStatus((prev) => ({
        ...prev,
        loading: false,
        permission: typeof Notification !== "undefined" ? Notification.permission : prev.permission,
      }));
      setPushFeedback(err.message || "Failed to enable emergency alerts.");
      setTimeout(() => setPushFeedback(""), 8000);
    }
  };

  // Disable Push Notifications Handler
  const handleDisablePush = async () => {
    setPushStatus((prev) => ({ ...prev, loading: true }));
    setPushFeedback("");
    try {
      await unsubscribeUserFromPush(token);
      setPushStatus((prev) => ({
        ...prev,
        isSubscribed: false,
        loading: false,
      }));
      setPushFeedback("Emergency alerts have been disabled.");
      setTimeout(() => setPushFeedback(""), 5000);
    } catch (err) {
      console.error("[Volunteer] Disable push error:", err);
      setPushStatus((prev) => ({ ...prev, loading: false }));
      setPushFeedback("Failed to disable emergency alerts.");
    }
  };

  // Send Test Notification Handler
  const handleTestPush = async () => {
    setPushFeedback("Sending test alert to this device...");
    try {
      await sendTestNotification(token);
      setPushFeedback("✓ Test alert sent! Check your system/browser notification tray.");
      setTimeout(() => setPushFeedback(""), 6000);
    } catch (err) {
      setPushFeedback(err.message || "Failed to send test alert.");
    }
  };

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
        if (res.status === 409) {
          // If already accepted by another volunteer, close modal if viewing this request and refresh list
          if (selectedDetailRequest && selectedDetailRequest._id === requestId) {
            setSelectedDetailRequest(null);
          }
          await refreshAll();
        }
        return;
      }

      setSuccessMessage("Emergency mission accepted! Moved to 'My Active Tasks'.");
      setSelectedDetailRequest(null); // Close modal if open
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

  // Separate available requests into Recommended (Smart Match) and Other Available Requests
  const recommendedRequests =
    activeTab === "available"
      ? filteredRequests
          .filter((r) => r.isRecommended || (r.matchScore && r.matchScore > 0))
          .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
      : [];

  const otherAvailableRequests =
    activeTab === "available"
      ? filteredRequests.filter((r) => !r.isRecommended && (!r.matchScore || r.matchScore === 0))
      : [];

  // Card renderer supporting Smart Match indicators
  const renderCard = (req, isRecommendedCard = false) => {
    const isAcceptedTab = activeTab === "my-accepted";
    const isProcessing = actionInProgress === req._id;
    const showMatchBanner = isRecommendedCard || (req.isRecommended && !isAcceptedTab);

    return (
      <div
        key={req._id}
        style={{
          background: "#121926",
          border: showMatchBanner ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid #1f2d40",
          borderRadius: "14px",
          padding: "22px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: showMatchBanner
            ? "0 8px 26px rgba(245, 158, 11, 0.08), 0 4px 16px rgba(0,0,0,0.4)"
            : "0 8px 24px rgba(0,0,0,0.3)",
          position: "relative",
          transition: "border-color 0.2s, transform 0.2s",
        }}
      >
        <div>
          {/* Smart Match Recommendation Banner */}
          {showMatchBanner && (
            <div
              style={{
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.14), rgba(30, 58, 138, 0.18))",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                borderRadius: "9px",
                padding: "10px 12px",
                marginBottom: "14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "4px",
                }}
              >
                <span
                  style={{
                    color: "#fbbf24",
                    fontWeight: "700",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    letterSpacing: "0.3px",
                  }}
                >
                  🎯 Smart Match Recommendation
                </span>
                <span
                  style={{
                    background: "#fbbf24",
                    color: "#000",
                    fontWeight: "800",
                    fontSize: "11px",
                    padding: "2px 7px",
                    borderRadius: "10px",
                  }}
                >
                  {req.matchScore || 0} pts
                </span>
              </div>
              <div style={{ color: "#fef3c7", fontSize: "12.5px", lineHeight: "1.4" }}>
                {req.matchReason || "Matched based on your volunteer areas of interest."}
              </div>
              {req.matchedInterests && req.matchedInterests.length > 0 && (
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
                  {req.matchedInterests.map((interest) => (
                    <span
                      key={interest}
                      style={{
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(251, 191, 36, 0.3)",
                        color: "#fde68a",
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontWeight: "600",
                      }}
                    >
                      ✓ {interest}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

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
                  📞{" "}
                  <a
                    href={`tel:${req.createdBy.phone}`}
                    style={{ color: "#34d399", textDecoration: "underline" }}
                  >
                    {req.createdBy.phone}
                  </a>
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
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setSelectedDetailRequest(req)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid #334155",
                  color: "#e2e8f0",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                  transition: "all 0.2s",
                }}
              >
                👁️ View Details
              </button>
              <button
                onClick={() => handleAcceptRequest(req._id)}
                disabled={isProcessing}
                style={{
                  flex: 1.2,
                  padding: "10px",
                  background: "#1677ff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  fontSize: "13px",
                  cursor: isProcessing ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                  transition: "all 0.2s",
                }}
              >
                {isProcessing ? "Accepting..." : "🤝 Accept Request"}
              </button>
            </div>
          ) : req.status === "Accepted" ? (
            <div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <button
                  onClick={() => setSelectedDetailRequest(req)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid #334155",
                    color: "#e2e8f0",
                    borderRadius: "8px",
                    fontWeight: "600",
                    fontSize: "12.5px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                  }}
                >
                  👁️ View Details
                </button>
              </div>
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
            </div>
          ) : (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                onClick={() => setSelectedDetailRequest(req)}
                style={{
                  flex: 1,
                  padding: "8px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid #334155",
                  color: "#e2e8f0",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                👁️ View Details
              </button>
              <div
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "8px",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#94a3b8",
                }}
              >
                Status: <strong>{req.status}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

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
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <Link
                  to="/leaderboard"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "10px 16px",
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    color: "#fbbf24",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontSize: "13.5px",
                    fontWeight: "600",
                  }}
                >
                  🏆 View Leaderboard
                </Link>
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
              </div>
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

              {/* Emergency Web Push Alerts Card */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(22, 36, 58, 0.85))",
                  border: pushStatus.isSubscribed
                    ? "1px solid rgba(16, 185, 129, 0.4)"
                    : "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  marginBottom: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: "260px" }}>
                  <div
                    style={{
                      fontSize: "24px",
                      width: "44px",
                      height: "44px",
                      borderRadius: "10px",
                      background: pushStatus.isSubscribed
                        ? "rgba(16, 185, 129, 0.15)"
                        : "rgba(245, 158, 11, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {pushStatus.isSubscribed ? "🔔" : "🚨"}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <h4 style={{ margin: 0, color: "#fff", fontSize: "15px", fontWeight: "600" }}>
                        Emergency Alerts
                      </h4>
                      {pushStatus.isSubscribed ? (
                        <span
                          style={{
                            background: "rgba(16, 185, 129, 0.2)",
                            color: "#34d399",
                            border: "1px solid #10b981",
                            fontSize: "11px",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            fontWeight: "700",
                          }}
                        >
                          ✓ Alerts Enabled
                        </span>
                      ) : (
                        <span
                          style={{
                            background: "rgba(148, 163, 184, 0.15)",
                            color: "#94a3b8",
                            border: "1px solid #475569",
                            fontSize: "11px",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            fontWeight: "600",
                          }}
                        >
                          Disabled
                        </span>
                      )}
                    </div>
                    <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "13px", lineHeight: "1.4" }}>
                      {!pushStatus.supported
                        ? "Web Push notifications are not supported by this browser."
                        : pushStatus.permission === "denied"
                        ? "Browser notifications are blocked. To receive instant emergency alerts, please allow notifications in your browser's site permissions."
                        : pushStatus.isSubscribed
                        ? "You will receive instant system notifications for emergencies matching your volunteer interests even when ResQHub is closed."
                        : "Receive instant notifications for emergencies matching your volunteer interests, even when the browser tab is closed."}
                    </p>
                    {pushFeedback && (
                      <div
                        style={{
                          marginTop: "6px",
                          fontSize: "12.5px",
                          fontWeight: "500",
                          color: pushFeedback.includes("enabled") || pushFeedback.includes("sent") || pushFeedback.includes("✓")
                            ? "#34d399"
                            : "#fbbf24",
                        }}
                      >
                        {pushFeedback}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  {pushStatus.supported && pushStatus.permission !== "denied" && (
                    <>
                      {pushStatus.isSubscribed ? (
                        <>
                          <button
                            onClick={handleTestPush}
                            style={{
                              padding: "7px 14px",
                              background: "rgba(255, 255, 255, 0.08)",
                              border: "1px solid #334155",
                              color: "#e2e8f0",
                              borderRadius: "6px",
                              fontSize: "12.5px",
                              cursor: "pointer",
                              fontWeight: "600",
                            }}
                          >
                            🔔 Test Alert
                          </button>
                          <button
                            onClick={handleDisablePush}
                            disabled={pushStatus.loading}
                            style={{
                              padding: "7px 14px",
                              background: "transparent",
                              border: "1px solid #ef4444",
                              color: "#f87171",
                              borderRadius: "6px",
                              fontSize: "12.5px",
                              cursor: pushStatus.loading ? "not-allowed" : "pointer",
                            }}
                          >
                            Disable
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleEnablePush}
                          disabled={pushStatus.loading}
                          style={{
                            padding: "8px 18px",
                            background: "#1677ff",
                            border: "none",
                            color: "#fff",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "600",
                            cursor: pushStatus.loading ? "not-allowed" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          {pushStatus.loading ? "Enabling..." : "🚨 Enable Emergency Alerts"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

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
              ) : activeTab === "available" ? (
                <div>
                  {/* Section 1: Recommended for You (Smart Match) */}
                  {recommendedRequests.length > 0 && (
                    <div style={{ marginBottom: "36px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "10px",
                          marginBottom: "16px",
                          background: "rgba(245, 158, 11, 0.08)",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                          borderRadius: "10px",
                          padding: "12px 18px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "22px" }}>⭐</span>
                          <div>
                            <h3 style={{ margin: 0, color: "#fff", fontSize: "17px", fontWeight: "700" }}>
                              Recommended for You{" "}
                              <span style={{ color: "#fbbf24", fontSize: "14px", fontWeight: "600" }}>
                                ({recommendedRequests.length} {recommendedRequests.length === 1 ? "Mission" : "Missions"})
                              </span>
                            </h3>
                            <p style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: "12.5px" }}>
                              Intelligently matched to your registered Areas of Interest
                              {user?.interests?.length ? `: ${user.interests.join(", ")}` : ""}
                            </p>
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: "11.5px",
                            color: "#fbbf24",
                            background: "rgba(245, 158, 11, 0.15)",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontWeight: "600",
                          }}
                        >
                          Highest Match Priority
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: "20px" }}>
                        {recommendedRequests.map((req) => renderCard(req, true))}
                      </div>
                    </div>
                  )}

                  {/* Section 2: Other Available Requests */}
                  {otherAvailableRequests.length > 0 && (
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "16px",
                          borderTop: recommendedRequests.length > 0 ? "1px solid #1f2d40" : "none",
                          paddingTop: recommendedRequests.length > 0 ? "24px" : "0",
                        }}
                      >
                        <span style={{ fontSize: "20px" }}>📋</span>
                        <div>
                          <h3 style={{ margin: 0, color: "#cbd5e1", fontSize: "16px", fontWeight: "700" }}>
                            {recommendedRequests.length > 0
                              ? `Other Available Requests (${otherAvailableRequests.length})`
                              : `All Available Requests (${otherAvailableRequests.length})`}
                          </h3>
                          <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "12.5px" }}>
                            {recommendedRequests.length > 0
                              ? "Additional verified emergency requests awaiting responder assistance."
                              : "Active verified emergency requests awaiting responder assistance."}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: "20px" }}>
                        {otherAvailableRequests.map((req) => renderCard(req, false))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* My Accepted Tasks Tab */
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: "20px" }}>
                  {filteredRequests.map((req) => renderCard(req, false))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Citizen & Emergency Details Modal */}
      {selectedDetailRequest && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
          }}
          onClick={() => setSelectedDetailRequest(null)}
        >
          <div
            style={{
              background: "#131a24",
              border: "1px solid #27384f",
              borderRadius: "14px",
              padding: "28px",
              maxWidth: "540px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "24px" }}>
                  {getCategoryIcon(selectedDetailRequest.category)}
                </span>
                <h3 style={{ margin: 0, color: "#fff", fontSize: "20px" }}>
                  Emergency Request Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedDetailRequest(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "22px",
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Badges */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "18px" }}>
              <span
                style={{
                  background:
                    selectedDetailRequest.status === "Accepted"
                      ? "rgba(16, 185, 129, 0.2)"
                      : selectedDetailRequest.status === "Completed"
                      ? "rgba(59, 130, 246, 0.2)"
                      : "rgba(245, 158, 11, 0.2)",
                  color:
                    selectedDetailRequest.status === "Accepted"
                      ? "#34d399"
                      : selectedDetailRequest.status === "Completed"
                      ? "#60a5fa"
                      : "#fbbf24",
                  border: `1px solid ${
                    selectedDetailRequest.status === "Accepted"
                      ? "#10b981"
                      : selectedDetailRequest.status === "Completed"
                      ? "#3b82f6"
                      : "#f59e0b"
                  }`,
                  padding: "4px 10px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: "700",
                }}
              >
                ● Status: {selectedDetailRequest.status}
              </span>
              {getUrgencyBadge(selectedDetailRequest.urgency)}
            </div>

            {/* Smart Match Recommendation in Modal */}
            {selectedDetailRequest.matchReason && (
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(30, 58, 138, 0.15))",
                  border: "1px solid rgba(245, 158, 11, 0.35)",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ color: "#fbbf24", fontWeight: "700", fontSize: "12.5px", display: "flex", alignItems: "center", gap: "6px" }}>
                    🎯 SMART MATCH RECOMMENDATION
                  </span>
                  <span style={{ background: "#fbbf24", color: "#000", fontWeight: "800", fontSize: "11px", padding: "2px 7px", borderRadius: "10px" }}>
                    {selectedDetailRequest.matchScore || 0} pts
                  </span>
                </div>
                <div style={{ color: "#fef3c7", fontSize: "13px", lineHeight: "1.4", marginBottom: selectedDetailRequest.matchedInterests?.length ? "8px" : "0" }}>
                  {selectedDetailRequest.matchReason}
                </div>
                {selectedDetailRequest.matchedInterests && selectedDetailRequest.matchedInterests.length > 0 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {selectedDetailRequest.matchedInterests.map((interest) => (
                      <span
                        key={interest}
                        style={{
                          background: "rgba(255, 255, 255, 0.1)",
                          border: "1px solid rgba(251, 191, 36, 0.3)",
                          color: "#fde68a",
                          fontSize: "11.5px",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontWeight: "600",
                        }}
                      >
                        ✓ {interest}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Section 1: CITIZEN DETAILS */}
            <div
              style={{
                background: "#0c131d",
                border: "1px solid #1f3148",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#a78bfa",
                  fontSize: "13px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "12px",
                  borderBottom: "1px solid #1a2738",
                  paddingBottom: "8px",
                }}
              >
                <span>👤</span> CITIZEN DETAILS
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
                <div>
                  <strong style={{ color: "#94a3b8" }}>Name: </strong>
                  <span style={{ color: "#fff", fontWeight: "600" }}>
                    {selectedDetailRequest.createdBy?.name || "Citizen / Requester"}
                  </span>
                </div>
                <div>
                  <strong style={{ color: "#94a3b8" }}>Phone: </strong>
                  {selectedDetailRequest.createdBy?.phone ? (
                    <a
                      href={`tel:${selectedDetailRequest.createdBy.phone}`}
                      style={{ color: "#34d399", fontWeight: "600", textDecoration: "underline" }}
                    >
                      📞 {selectedDetailRequest.createdBy.phone}
                    </a>
                  ) : (
                    <span style={{ color: "#64748b" }}>Not provided</span>
                  )}
                </div>
                <div>
                  <strong style={{ color: "#94a3b8" }}>Email: </strong>
                  {selectedDetailRequest.createdBy?.email ? (
                    <a
                      href={`mailto:${selectedDetailRequest.createdBy.email}`}
                      style={{ color: "#60a5fa", textDecoration: "underline" }}
                    >
                      ✉️ {selectedDetailRequest.createdBy.email}
                    </a>
                  ) : (
                    <span style={{ color: "#64748b" }}>Not provided</span>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: EMERGENCY DETAILS */}
            <div
              style={{
                background: "#0c131d",
                border: "1px solid #1f3148",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#f87171",
                  fontSize: "13px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "12px",
                  borderBottom: "1px solid #1a2738",
                  paddingBottom: "8px",
                }}
              >
                <span>🚨</span> EMERGENCY DETAILS
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px" }}>
                <div>
                  <strong style={{ color: "#94a3b8" }}>Emergency Type: </strong>
                  <span style={{ color: "#fff", fontWeight: "600" }}>
                    {getCategoryIcon(selectedDetailRequest.category)} {selectedDetailRequest.category}
                  </span>
                </div>
                <div>
                  <strong style={{ color: "#94a3b8" }}>Title: </strong>
                  <span style={{ color: "#fff", fontWeight: "600" }}>
                    {selectedDetailRequest.title}
                  </span>
                </div>
                <div>
                  <strong style={{ color: "#94a3b8" }}>Description:</strong>
                  <div
                    style={{
                      background: "#070b12",
                      border: "1px solid #162232",
                      borderRadius: "6px",
                      padding: "10px 12px",
                      marginTop: "6px",
                      color: "#cbd5e1",
                      lineHeight: "1.5",
                      fontSize: "13.5px",
                    }}
                  >
                    {selectedDetailRequest.description}
                  </div>
                </div>
                <div>
                  <strong style={{ color: "#94a3b8" }}>📍 Location: </strong>
                  <span style={{ color: "#60a5fa" }}>{selectedDetailRequest.location}</span>
                </div>
                <div>
                  <strong style={{ color: "#94a3b8" }}>🕒 Date & Time: </strong>
                  <span style={{ color: "#cbd5e1" }}>{formatDate(selectedDetailRequest.createdAt)}</span>
                </div>
                <div>
                  <strong style={{ color: "#94a3b8" }}>Current Status: </strong>
                  <span style={{ color: "#fbbf24", fontWeight: "600" }}>
                    {selectedDetailRequest.status}
                  </span>
                </div>

                {/* Evidence / Image */}
                {selectedDetailRequest.image && (
                  <div>
                    <strong style={{ color: "#94a3b8", display: "block", marginBottom: "6px" }}>
                      📷 Uploaded Evidence:
                    </strong>
                    <div
                      style={{
                        borderRadius: "8px",
                        overflow: "hidden",
                        border: "1px solid #27384f",
                        background: "#070b12",
                      }}
                    >
                      <img
                        src={selectedDetailRequest.image}
                        alt="Emergency evidence"
                        style={{
                          width: "100%",
                          maxHeight: "260px",
                          objectFit: "contain",
                          display: "block",
                          margin: "0 auto",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setSelectedDetailRequest(null)}
                style={{
                  padding: "9px 18px",
                  background: "transparent",
                  border: "1px solid #445163",
                  color: "#ccc",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Close
              </button>
              {activeTab === "available" && (
                <button
                  onClick={() => {
                    handleAcceptRequest(selectedDetailRequest._id);
                  }}
                  disabled={actionInProgress === selectedDetailRequest._id}
                  style={{
                    padding: "9px 20px",
                    background: "#1677ff",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    fontSize: "14px",
                    cursor: actionInProgress === selectedDetailRequest._id ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {actionInProgress === selectedDetailRequest._id
                    ? "Accepting..."
                    : "🤝 Accept Request"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

export default Volunteer;