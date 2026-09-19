import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { apiUrl } from "../config/api";
import "../styles/pages.css";

const CATEGORIES = ["Blood", "Food", "Medicine", "Transport", "Rescue"];
const URGENCIES = ["Low", "Medium", "High", "Critical"];

function UserDashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Edit Modal State
  const [editingRequest, setEditingRequest] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: "",
    category: "Medicine",
    urgency: "Medium",
    location: "",
    description: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete Confirmation State
  const [deletingRequestId, setDeletingRequestId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch user's emergency requests
  const fetchRequests = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const response = await fetch(apiUrl("/api/requests"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate("/login");
          return;
        }
        setError(data.message || "Failed to load your emergency requests.");
        return;
      }

      setRequests(data.requests || []);
    } catch (err) {
      console.error("[UserDashboard] Fetch error:", err);
      setError("Network error: Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [token, logout, navigate]);

  useEffect(() => {
    let isMounted = true;
    const loadInitial = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(apiUrl("/api/requests"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (isMounted) {
          if (!response.ok) {
            if (response.status === 401) {
              logout();
              navigate("/login");
              return;
            }
            setError(data.message || "Failed to load your emergency requests.");
          } else {
            setRequests(data.requests || []);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("[UserDashboard] Fetch error:", err);
          setError("Network error: Unable to connect to the server.");
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
  }, [token, logout, navigate]);

  // Open Edit Modal
  const handleOpenEdit = (req) => {
    setEditingRequest(req);
    setEditFormData({
      title: req.title || "",
      category: req.category || "Medicine",
      urgency: req.urgency || "Medium",
      location: req.location || "",
      description: req.description || "",
    });
    setEditError("");
  };

  // Submit Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingRequest) return;

    setIsUpdating(true);
    setEditError("");

    try {
      const response = await fetch(apiUrl(`/api/requests/${editingRequest._id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editFormData),
      });

      const data = await response.json();

      if (!response.ok) {
        setEditError(data.message || "Failed to update emergency request.");
        setIsUpdating(false);
        return;
      }

      // Update state with updated request from MongoDB
      setRequests((prev) =>
        prev.map((r) => (r._id === editingRequest._id ? data.request : r))
      );

      setSuccessMessage("Emergency request updated successfully!");
      setEditingRequest(null);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      console.error("[UserDashboard] Update error:", err);
      setEditError("Network error: Could not reach the server.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Confirm and Execute Delete
  const handleDelete = async () => {
    if (!deletingRequestId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(apiUrl(`/api/requests/${deletingRequestId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to delete emergency request.");
        setDeletingRequestId(null);
        setIsDeleting(false);
        return;
      }

      setRequests((prev) => prev.filter((r) => r._id !== deletingRequestId));
      setSuccessMessage("Emergency request deleted successfully.");
      setDeletingRequestId(null);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      console.error("[UserDashboard] Delete error:", err);
      setError("Network error: Could not complete deletion.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Format Date
  const formatDate = (isoDate) => {
    if (!isoDate) return "N/A";
    const d = new Date(isoDate);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Badges styling helpers
  const getStatusBadge = (status) => {
    const config = {
      Pending: { bg: "rgba(245, 158, 11, 0.15)", border: "#f59e0b", color: "#fbbf24", icon: "⏳" },
      Verified: { bg: "rgba(59, 130, 246, 0.15)", border: "#3b82f6", color: "#60a5fa", icon: "✓" },
      Accepted: { bg: "rgba(6, 182, 212, 0.15)", border: "#06b6d4", color: "#22d3ee", icon: "🤝" },
      Completed: { bg: "rgba(16, 185, 129, 0.15)", border: "#10b981", color: "#34d399", icon: "🎉" },
      Cancelled: { bg: "rgba(100, 116, 139, 0.15)", border: "#64748b", color: "#94a3b8", icon: "✖" },
    };
    const current = config[status] || config.Pending;
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          background: current.bg,
          border: `1px solid ${current.border}`,
          color: current.color,
          padding: "3px 10px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: "600",
        }}
      >
        <span>{current.icon}</span>
        {status}
      </span>
    );
  };

  const getUrgencyBadge = (urgency) => {
    const config = {
      Low: { bg: "rgba(34, 197, 94, 0.15)", border: "#22c55e", color: "#4ade80" },
      Medium: { bg: "rgba(59, 130, 246, 0.15)", border: "#3b82f6", color: "#60a5fa" },
      High: { bg: "rgba(249, 115, 22, 0.15)", border: "#f97316", color: "#fb923c" },
      Critical: { bg: "rgba(239, 68, 68, 0.2)", border: "#ef4444", color: "#f87171" },
    };
    const current = config[urgency] || config.Medium;
    return (
      <span
        style={{
          display: "inline-block",
          background: current.bg,
          border: `1px solid ${current.border}`,
          color: current.color,
          padding: "2px 8px",
          borderRadius: "10px",
          fontSize: "11px",
          fontWeight: "700",
          textTransform: "uppercase",
        }}
      >
        {urgency} Urgency
      </span>
    );
  };

  const getCategoryIcon = (category) => {
    const icons = {
      Blood: "🩸",
      Food: "🍲",
      Medicine: "💊",
      Transport: "🚑",
      Rescue: "🛟",
    };
    return icons[category] || "🚨";
  };

  return (
    <>
      <Navbar />

      <main className="page" style={{ padding: "40px 20px 70px" }}>
        <div className="page-container" style={{ maxWidth: "1050px", margin: "auto" }}>
          {/* Header Banner */}
          <section
            style={{
              background: "linear-gradient(135deg, rgba(20, 30, 48, 0.8), rgba(36, 59, 85, 0.4))",
              border: "1px solid #1f3148",
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
                <span style={{ fontSize: "28px" }}>👤</span>
                <h1 style={{ margin: 0, fontSize: "26px", color: "#fff" }}>
                  My <span style={{ color: "#ff4d4d" }}>Dashboard</span>
                </h1>
                <span
                  style={{
                    fontSize: "11px",
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid #555",
                    color: "#ccc",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    textTransform: "capitalize",
                  }}
                >
                  {user?.role}
                </span>
              </div>
              <p style={{ color: "#9eabba", margin: 0, fontSize: "14px" }}>
                Welcome back, <strong>{user?.name}</strong>. Track, edit, and monitor your emergency assistance requests.
              </p>
            </div>

            <Link
              to="/report"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 22px",
                background: "#e53935",
                color: "#fff",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "bold",
                fontSize: "14px",
                boxShadow: "0 4px 15px rgba(229, 57, 53, 0.3)",
                transition: "0.2s ease",
              }}
            >
              🚨 Report Emergency
            </Link>
          </section>

          {/* Quick Metrics */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
              marginBottom: "28px",
            }}
          >
            <div
              style={{
                background: "#101622",
                border: "1px solid #202b3c",
                borderRadius: "12px",
                padding: "16px 20px",
              }}
            >
              <div style={{ fontSize: "12px", color: "#8b98a8", marginBottom: "4px" }}>Total Requests</div>
              <div style={{ fontSize: "26px", fontWeight: "bold", color: "#fff" }}>{requests.length}</div>
            </div>

            <div
              style={{
                background: "#101622",
                border: "1px solid #202b3c",
                borderRadius: "12px",
                padding: "16px 20px",
              }}
            >
              <div style={{ fontSize: "12px", color: "#8b98a8", marginBottom: "4px" }}>Pending Review</div>
              <div style={{ fontSize: "26px", fontWeight: "bold", color: "#fbbf24" }}>
                {requests.filter((r) => r.status === "Pending").length}
              </div>
            </div>

            <div
              style={{
                background: "#101622",
                border: "1px solid #202b3c",
                borderRadius: "12px",
                padding: "16px 20px",
              }}
            >
              <div style={{ fontSize: "12px", color: "#8b98a8", marginBottom: "4px" }}>Verified / Active</div>
              <div style={{ fontSize: "26px", fontWeight: "bold", color: "#60a5fa" }}>
                {requests.filter((r) => ["Verified", "Accepted"].includes(r.status)).length}
              </div>
            </div>

            <div
              style={{
                background: "#101622",
                border: "1px solid #202b3c",
                borderRadius: "12px",
                padding: "16px 20px",
              }}
            >
              <div style={{ fontSize: "12px", color: "#8b98a8", marginBottom: "4px" }}>Resolved</div>
              <div style={{ fontSize: "26px", fontWeight: "bold", color: "#34d399" }}>
                {requests.filter((r) => r.status === "Completed").length}
              </div>
            </div>
          </div>

          {/* Success / Error Alerts */}
          {successMessage && (
            <div
              style={{
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid #10b981",
                color: "#34d399",
                padding: "12px 16px",
                borderRadius: "8px",
                marginBottom: "20px",
                fontSize: "14px",
              }}
            >
              ✓ {successMessage}
            </div>
          )}

          {error && (
            <div
              style={{
                background: "rgba(229, 57, 53, 0.18)",
                border: "1px solid #e53935",
                color: "#ff8585",
                padding: "12px 16px",
                borderRadius: "8px",
                marginBottom: "20px",
                fontSize: "14px",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Section Heading */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "20px", margin: 0, color: "#fff" }}>
              My Emergency Requests ({requests.length})
            </h2>
            <button
              onClick={fetchRequests}
              style={{
                background: "transparent",
                border: "1px solid #263345",
                color: "#aeb9ca",
                padding: "6px 14px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              🔄 Refresh
            </button>
          </div>

          {/* Requests List or Empty State */}
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                background: "#0d131c",
                borderRadius: "12px",
                border: "1px solid #1b2636",
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
              <p style={{ color: "#aeb9ca", margin: 0 }}>Loading your emergency requests from MongoDB...</p>
            </div>
          ) : requests.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                background: "#0d131c",
                borderRadius: "14px",
                border: "1px solid #1b2636",
              }}
            >
              <div style={{ fontSize: "42px", marginBottom: "14px" }}>📋</div>
              <h3 style={{ margin: "0 0 8px", color: "#fff", fontSize: "18px" }}>
                No Emergency Requests Found
              </h3>
              <p style={{ color: "#8a96a7", fontSize: "14px", maxWidth: "450px", margin: "0 auto 20px" }}>
                You haven't submitted any emergency requests yet. If you need urgent assistance, submit a report now.
              </p>
              <Link
                to="/report"
                style={{
                  display: "inline-block",
                  padding: "10px 20px",
                  background: "#e53935",
                  color: "#fff",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                🚨 Create an Emergency Request
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {requests.map((req) => {
                const isPending = req.status === "Pending";

                return (
                  <article
                    key={req._id}
                    style={{
                      background: "linear-gradient(145deg, #101926, #0c121c)",
                      border: "1px solid #1e2c3f",
                      borderLeft: `4px solid ${
                        req.urgency === "Critical"
                          ? "#ef4444"
                          : req.urgency === "High"
                          ? "#f97316"
                          : "#3b82f6"
                      }`,
                      borderRadius: "12px",
                      padding: "20px 24px",
                      boxShadow: "0 6px 16px rgba(0, 0, 0, 0.25)",
                    }}
                  >
                    {/* Top Row: Title, Category, Urgency, Status */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "12px",
                        marginBottom: "12px",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: "260px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                          <span style={{ fontSize: "20px" }}>{getCategoryIcon(req.category)}</span>
                          <h3 style={{ margin: 0, fontSize: "18px", color: "#fff" }}>{req.title}</h3>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          <span style={{ color: "#9eabba", fontSize: "12px" }}>
                            Category: <strong style={{ color: "#d2dbe5" }}>{req.category}</strong>
                          </span>
                          <span style={{ color: "#475569" }}>•</span>
                          {getUrgencyBadge(req.urgency)}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {getStatusBadge(req.status)}
                      </div>
                    </div>

                    {/* Description */}
                    <p
                      style={{
                        color: "#c2cddb",
                        fontSize: "14px",
                        lineHeight: "1.6",
                        margin: "0 0 14px",
                        background: "rgba(0, 0, 0, 0.2)",
                        padding: "10px 14px",
                        borderRadius: "8px",
                      }}
                    >
                      {req.description}
                    </p>

                    {/* Bottom Row: Location, Date & Actions */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "12px",
                        borderTop: "1px solid #1a2533",
                        paddingTop: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#9eabba", fontSize: "13px" }}>
                          <span>📍</span>
                          <span>{req.location}</span>
                        </div>
                        <div style={{ color: "#64748b", fontSize: "12px" }}>
                          Reported on {formatDate(req.createdAt)}
                        </div>
                      </div>

                      {/* Request Action Buttons */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {isPending ? (
                          <>
                            <button
                              onClick={() => handleOpenEdit(req)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                background: "rgba(59, 130, 246, 0.15)",
                                border: "1px solid #3b82f6",
                                color: "#60a5fa",
                                padding: "6px 14px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "13px",
                                fontWeight: "600",
                              }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => setDeletingRequestId(req._id)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                background: "rgba(239, 68, 68, 0.15)",
                                border: "1px solid #ef4444",
                                color: "#f87171",
                                padding: "6px 14px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "13px",
                                fontWeight: "600",
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </>
                        ) : (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#8392a5",
                              background: "rgba(255, 255, 255, 0.05)",
                              padding: "4px 10px",
                              borderRadius: "6px",
                            }}
                          >
                            🔒 Locked ({req.status})
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Edit Request Modal */}
      {editingRequest && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#0f1622",
              border: "1px solid #223247",
              borderRadius: "14px",
              padding: "28px",
              maxWidth: "580px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: "#fff", fontSize: "20px" }}>✏️ Edit Pending Request</h3>
              <button
                onClick={() => setEditingRequest(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#999",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {editError && (
              <div
                style={{
                  background: "rgba(229, 57, 53, 0.2)",
                  border: "1px solid #e53935",
                  color: "#ff8585",
                  padding: "10px",
                  borderRadius: "6px",
                  marginBottom: "16px",
                  fontSize: "13px",
                }}
              >
                ⚠️ {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit}>
              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label style={{ color: "#c5d0de", fontSize: "13px", display: "block", marginBottom: "6px" }}>
                  Emergency Title *
                </label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  required
                  maxLength={150}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#080d14",
                    border: "1px solid #334052",
                    borderRadius: "6px",
                    color: "#fff",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ color: "#c5d0de", fontSize: "13px", display: "block", marginBottom: "6px" }}>
                    Category *
                  </label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: "#080d14",
                      border: "1px solid #334052",
                      borderRadius: "6px",
                      color: "#fff",
                    }}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ color: "#c5d0de", fontSize: "13px", display: "block", marginBottom: "6px" }}>
                    Urgency *
                  </label>
                  <select
                    value={editFormData.urgency}
                    onChange={(e) => setEditFormData({ ...editFormData, urgency: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: "#080d14",
                      border: "1px solid #334052",
                      borderRadius: "6px",
                      color: "#fff",
                    }}
                  >
                    {URGENCIES.map((urg) => (
                      <option key={urg} value={urg}>
                        {urg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label style={{ color: "#c5d0de", fontSize: "13px", display: "block", marginBottom: "6px" }}>
                  Location *
                </label>
                <input
                  type="text"
                  value={editFormData.location}
                  onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                  required
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#080d14",
                    border: "1px solid #334052",
                    borderRadius: "6px",
                    color: "#fff",
                  }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label style={{ color: "#c5d0de", fontSize: "13px", display: "block", marginBottom: "6px" }}>
                  Description *
                </label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  required
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#080d14",
                    border: "1px solid #334052",
                    borderRadius: "6px",
                    color: "#fff",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setEditingRequest(null)}
                  style={{
                    padding: "9px 16px",
                    background: "transparent",
                    border: "1px solid #445163",
                    color: "#ccc",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  style={{
                    padding: "9px 20px",
                    background: "#1677ff",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    cursor: isUpdating ? "not-allowed" : "pointer",
                  }}
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRequestId && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#131a24",
              border: "1px solid #ef4444",
              borderRadius: "14px",
              padding: "26px",
              maxWidth: "440px",
              width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 40px rgba(239, 68, 68, 0.2)",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>⚠️</div>
            <h3 style={{ margin: "0 0 10px", color: "#fff", fontSize: "20px" }}>Delete Emergency Request?</h3>
            <p style={{ color: "#aeb9ca", fontSize: "14px", lineHeight: "1.5", margin: "0 0 24px" }}>
              Are you sure you want to delete this pending emergency request? This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setDeletingRequestId(null)}
                disabled={isDeleting}
                style={{
                  padding: "9px 18px",
                  background: "transparent",
                  border: "1px solid #445163",
                  color: "#ccc",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                style={{
                  padding: "9px 20px",
                  background: "#e53935",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                }}
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

export default UserDashboard;
