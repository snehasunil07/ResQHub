import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/pages.css";

const STATUSES = ["All", "Pending", "Verified", "Accepted", "Completed", "Cancelled"];
const CATEGORIES = ["All", "Blood", "Food", "Medicine", "Transport", "Rescue"];

function AdminDashboard() {
  const { user, token } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // System Health
  const [healthData, setHealthData] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Action states
  const [actionInProgress, setActionInProgress] = useState(null);
  const [deletingRequestId, setDeletingRequestId] = useState(null);

  // Details Modal
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Fetch all requests
  const fetchAllData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      // Fetch emergency requests
      const reqRes = await fetch("/api/requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const reqData = await reqRes.json();
      if (reqRes.ok) {
        setRequests(reqData.requests || []);
      } else {
        setError(reqData.message || "Failed to load platform emergency requests.");
      }

      // Fetch system health
      const healthRes = await fetch("/api/health");
      const hData = await healthRes.json();
      if (healthRes.ok) {
        setHealthData(hData);
      }
    } catch (err) {
      console.error("[AdminDashboard] Fetch error:", err);
      setError("Network error: Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let isMounted = true;
    const loadInitial = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const [reqRes, healthRes] = await Promise.all([
          fetch("/api/requests", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/health"),
        ]);
        const reqData = await reqRes.json();
        const hData = await healthRes.json();
        if (isMounted) {
          if (reqRes.ok) {
            setRequests(reqData.requests || []);
          } else {
            setError(reqData.message || "Failed to load platform emergency requests.");
          }
          if (healthRes.ok) {
            setHealthData(hData);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("[AdminDashboard] Initial fetch error:", err);
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
  }, [token]);

  // Update Request Status
  const handleUpdateStatus = async (requestId, newStatus) => {
    setActionInProgress(requestId);
    setError("");
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || `Failed to update status to ${newStatus}.`);
        return;
      }

      setRequests((prev) =>
        prev.map((r) => (r._id === requestId ? data.request : r))
      );

      setSuccessMessage(`Emergency status updated to '${newStatus}' successfully!`);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      console.error("[AdminDashboard] Status update error:", err);
      setError("Network error: Could not update request status.");
    } finally {
      setActionInProgress(null);
    }
  };

  // Delete Request
  const handleDeleteRequest = async () => {
    if (!deletingRequestId) return;
    setActionInProgress(deletingRequestId);
    setError("");
    try {
      const res = await fetch(`/api/requests/${deletingRequestId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to delete emergency request.");
        setDeletingRequestId(null);
        return;
      }

      setRequests((prev) => prev.filter((r) => r._id !== deletingRequestId));
      setSuccessMessage("Emergency request record deleted from database.");
      setDeletingRequestId(null);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      console.error("[AdminDashboard] Delete error:", err);
      setError("Network error: Could not complete deletion.");
    } finally {
      setActionInProgress(null);
    }
  };

  // Badges & styling helpers
  const getCategoryIcon = (category) => {
    const icons = { Blood: "🩸", Food: "🍲", Medicine: "💊", Transport: "🚑", Rescue: "🛟" };
    return icons[category] || "🚨";
  };

  const getStatusBadge = (status) => {
    const config = {
      Pending: { bg: "rgba(245, 158, 11, 0.15)", border: "#f59e0b", color: "#fbbf24", icon: "⏳" },
      Verified: { bg: "rgba(59, 130, 246, 0.15)", border: "#3b82f6", color: "#60a5fa", icon: "✓" },
      Accepted: { bg: "rgba(6, 182, 212, 0.15)", border: "#06b6d4", color: "#22d3ee", icon: "🤝" },
      Completed: { bg: "rgba(16, 185, 129, 0.15)", border: "#10b981", color: "#34d399", icon: "🎉" },
      Cancelled: { bg: "rgba(100, 116, 139, 0.15)", border: "#64748b", color: "#94a3b8", icon: "✖" },
    };
    const c = config[status] || config.Pending;
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          background: c.bg,
          border: `1px solid ${c.border}`,
          color: c.color,
          padding: "3px 9px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: "600",
        }}
      >
        <span>{c.icon}</span> {status}
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
    const c = config[urgency] || config.Medium;
    return (
      <span
        style={{
          background: c.bg,
          border: `1px solid ${c.border}`,
          color: c.color,
          padding: "2px 8px",
          borderRadius: "8px",
          fontSize: "11px",
          fontWeight: "700",
          textTransform: "uppercase",
        }}
      >
        {urgency}
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

  // Metrics
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === "Pending").length;
  const verifiedCount = requests.filter((r) => r.status === "Verified").length;
  const acceptedCount = requests.filter((r) => r.status === "Accepted").length;
  const completedCount = requests.filter((r) => r.status === "Completed").length;

  // Filtered requests list
  const filteredRequests = requests.filter((req) => {
    const matchesStatus = statusFilter === "All" || req.status === statusFilter;
    const matchesCategory = categoryFilter === "All" || req.category === categoryFilter;
    const matchesSearch =
      searchQuery === "" ||
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.createdBy?.name && req.createdBy.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesCategory && matchesSearch;
  });

  return (
    <>
      <Navbar />

      <main className="page admin-page" style={{ padding: "40px 20px 80px" }}>
        <div className="page-container" style={{ maxWidth: "1200px", margin: "0 auto" }}>
          
          {/* Header Banner */}
          <section
            style={{
              background: "linear-gradient(135deg, rgba(229, 57, 53, 0.15), rgba(11, 61, 145, 0.2))",
              border: "1px solid #ff3b3b",
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
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span style={{ fontSize: "32px" }}>🛡️</span>
                <h1 style={{ margin: 0, fontSize: "28px", color: "#fff" }}>
                  Admin <span style={{ color: "#ff4d4d" }}>Dashboard</span>
                </h1>
                <span
                  style={{
                    fontSize: "11px",
                    background: "#e53935",
                    color: "#fff",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                  }}
                >
                  Authorized Admin
                </span>
              </div>
              <p style={{ color: "#aeb9ca", margin: 0, fontSize: "14px" }}>
                Welcome, <strong>{user?.name}</strong>. Manage incident verification, dispatch coordination,
                and platform metrics in real time.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                onClick={fetchAllData}
                disabled={loading}
                style={{
                  padding: "9px 16px",
                  background: "#162235",
                  border: "1px solid #294060",
                  color: "#e2e8f0",
                  borderRadius: "8px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                🔄 Refresh Data
              </button>
              <Link
                to="/report"
                style={{
                  padding: "9px 16px",
                  background: "#e53935",
                  color: "#fff",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
              >
                + Create Emergency
              </Link>
            </div>
          </section>

          {/* Quick Platform Metrics Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "18px",
              marginBottom: "30px",
            }}
          >
            <div
              style={{
                background: "#131b28",
                border: "1px solid #23354d",
                borderRadius: "12px",
                padding: "20px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "26px", marginBottom: "6px" }}>📊</div>
              <h3 style={{ margin: 0, color: "#fff", fontSize: "26px" }}>{totalCount}</h3>
              <p style={{ color: "#8e98a8", margin: "4px 0 0", fontSize: "13px" }}>Total Reports</p>
            </div>

            <div
              style={{
                background: "#131b28",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                borderRadius: "12px",
                padding: "20px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "26px", marginBottom: "6px" }}>⏳</div>
              <h3 style={{ margin: 0, color: "#fbbf24", fontSize: "26px" }}>{pendingCount}</h3>
              <p style={{ color: "#8e98a8", margin: "4px 0 0", fontSize: "13px" }}>Pending Verification</p>
            </div>

            <div
              style={{
                background: "#131b28",
                border: "1px solid rgba(59, 130, 246, 0.4)",
                borderRadius: "12px",
                padding: "20px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "26px", marginBottom: "6px" }}>✓</div>
              <h3 style={{ margin: 0, color: "#60a5fa", fontSize: "26px" }}>{verifiedCount}</h3>
              <p style={{ color: "#8e98a8", margin: "4px 0 0", fontSize: "13px" }}>Verified (Ready for Response)</p>
            </div>

            <div
              style={{
                background: "#131b28",
                border: "1px solid rgba(6, 182, 212, 0.4)",
                borderRadius: "12px",
                padding: "20px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "26px", marginBottom: "6px" }}>🤝</div>
              <h3 style={{ margin: 0, color: "#22d3ee", fontSize: "26px" }}>{acceptedCount}</h3>
              <p style={{ color: "#8e98a8", margin: "4px 0 0", fontSize: "13px" }}>Active Responder Missions</p>
            </div>

            <div
              style={{
                background: "#131b28",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                borderRadius: "12px",
                padding: "20px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "26px", marginBottom: "6px" }}>🎉</div>
              <h3 style={{ margin: 0, color: "#34d399", fontSize: "26px" }}>{completedCount}</h3>
              <p style={{ color: "#8e98a8", margin: "4px 0 0", fontSize: "13px" }}>Resolved Incidents</p>
            </div>
          </div>

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

          {/* Filter & Control Toolbar */}
          <div
            style={{
              background: "#101622",
              border: "1px solid #1e2e42",
              borderRadius: "12px",
              padding: "18px 20px",
              marginBottom: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            {/* Status Pills */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {STATUSES.map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "16px",
                    border: statusFilter === st ? "1px solid #ef4444" : "1px solid #25364d",
                    background: statusFilter === st ? "rgba(239, 68, 68, 0.2)" : "#16202e",
                    color: statusFilter === st ? "#fca5a5" : "#94a3b8",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Category Dropdown & Search */}
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  background: "#16202e",
                  border: "1px solid #25364d",
                  borderRadius: "8px",
                  color: "#cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    Category: {cat}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="🔍 Search title, caller, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "8px 14px",
                  background: "#16202e",
                  border: "1px solid #25364d",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "13px",
                  minWidth: "220px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Main Emergency Requests Management Table */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>⏳</div>
              <p>Loading database records...</p>
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
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📋</div>
              <h3 style={{ color: "#cbd5e1", margin: "0 0 8px" }}>No Matching Emergency Requests Found</h3>
              <p style={{ fontSize: "14px", margin: 0 }}>Try clearing search terms or changing the status filter.</p>
            </div>
          ) : (
            <div
              style={{
                background: "#101622",
                border: "1px solid #1e2e42",
                borderRadius: "14px",
                overflowX: "auto",
                boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                <thead>
                  <tr style={{ background: "#16202e", color: "#94a3b8", borderBottom: "1px solid #22344d" }}>
                    <th style={{ padding: "14px 18px" }}>Category & Title</th>
                    <th style={{ padding: "14px 18px" }}>Urgency</th>
                    <th style={{ padding: "14px 18px" }}>Status</th>
                    <th style={{ padding: "14px 18px" }}>Caller / Citizen</th>
                    <th style={{ padding: "14px 18px" }}>Location</th>
                    <th style={{ padding: "14px 18px" }}>Reported Time</th>
                    <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => {
                    const isProcessing = actionInProgress === req._id;

                    return (
                      <tr
                        key={req._id}
                        style={{
                          borderBottom: "1px solid #1a273a",
                          transition: "background 0.2s",
                        }}
                      >
                        {/* Title & Category */}
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "18px" }}>{getCategoryIcon(req.category)}</span>
                            <div>
                              <strong style={{ color: "#fff", display: "block" }}>{req.title}</strong>
                              <span style={{ fontSize: "12px", color: "#64748b" }}>{req.category}</span>
                            </div>
                          </div>
                        </td>

                        {/* Urgency */}
                        <td style={{ padding: "14px 18px" }}>{getUrgencyBadge(req.urgency)}</td>

                        {/* Status */}
                        <td style={{ padding: "14px 18px" }}>{getStatusBadge(req.status)}</td>

                        {/* Caller */}
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ color: "#e2e8f0" }}>{req.createdBy?.name || "N/A"}</div>
                          <div style={{ fontSize: "12px", color: "#34d399" }}>
                            {req.createdBy?.phone ? `📞 ${req.createdBy.phone}` : req.createdBy?.email}
                          </div>
                        </td>

                        {/* Location */}
                        <td style={{ padding: "14px 18px", maxWidth: "200px" }}>
                          <span
                            style={{
                              color: "#94a3b8",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              fontSize: "13px",
                            }}
                          >
                            📍 {req.location}
                          </span>
                        </td>

                        {/* Timestamp */}
                        <td style={{ padding: "14px 18px", color: "#64748b", fontSize: "13px", whiteSpace: "nowrap" }}>
                          {formatDate(req.createdAt)}
                        </td>

                        {/* Action buttons */}
                        <td style={{ padding: "14px 18px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                            {/* If Pending: One-click Verify */}
                            {req.status === "Pending" && (
                              <button
                                onClick={() => handleUpdateStatus(req._id, "Verified")}
                                disabled={isProcessing}
                                title="Verify incident and publish to volunteer response pool"
                                style={{
                                  padding: "6px 12px",
                                  background: "#1677ff",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "bold",
                                  cursor: isProcessing ? "not-allowed" : "pointer",
                                }}
                              >
                                ✓ Verify
                              </button>
                            )}

                            {/* Status Changer Dropdown */}
                            <select
                              value={req.status}
                              onChange={(e) => handleUpdateStatus(req._id, e.target.value)}
                              disabled={isProcessing}
                              style={{
                                padding: "6px 8px",
                                background: "#0a1018",
                                border: "1px solid #2a3c54",
                                borderRadius: "6px",
                                color: "#cbd5e1",
                                fontSize: "12px",
                                outline: "none",
                                cursor: isProcessing ? "not-allowed" : "pointer",
                              }}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Verified">Verified</option>
                              <option value="Accepted">Accepted</option>
                              <option value="Completed">Completed</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>

                            {/* Inspect Details */}
                            <button
                              onClick={() => setSelectedRequest(req)}
                              title="View full incident details"
                              style={{
                                padding: "6px 10px",
                                background: "rgba(255, 255, 255, 0.08)",
                                border: "1px solid #334155",
                                color: "#e2e8f0",
                                borderRadius: "6px",
                                fontSize: "12px",
                                cursor: "pointer",
                              }}
                            >
                              👁️
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => setDeletingRequestId(req._id)}
                              disabled={isProcessing}
                              title="Delete record permanently"
                              style={{
                                padding: "6px 10px",
                                background: "rgba(239, 68, 68, 0.12)",
                                border: "1px solid #ef4444",
                                color: "#f87171",
                                borderRadius: "6px",
                                fontSize: "12px",
                                cursor: isProcessing ? "not-allowed" : "pointer",
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* System Health Status Footer Banner */}
          {healthData && (
            <div
              style={{
                marginTop: "30px",
                background: "#0c121c",
                border: "1px solid #1c2b3d",
                borderRadius: "12px",
                padding: "16px 22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
                fontSize: "13px",
                color: "#8e98a8",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: healthData.database?.status === "connected" ? "#10b981" : "#f59e0b" }}>●</span>
                <span>
                  Database: <strong>MongoDB ({healthData.database?.status})</strong>
                </span>
                <span style={{ margin: "0 6px" }}>|</span>
                <span>
                  Host: <code>{healthData.database?.host || "localhost"}</code>
                </span>
              </div>
              <div>
                <span>Uptime: {Math.floor(healthData.uptimeSeconds / 60)} minutes</span>
                <span style={{ margin: "0 6px" }}>|</span>
                <span>Environment: <strong>{healthData.environment}</strong></span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Details Modal */}
      {selectedRequest && (
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
              border: "1px solid #293d56",
              borderRadius: "14px",
              padding: "28px",
              maxWidth: "540px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "24px" }}>{getCategoryIcon(selectedRequest.category)}</span>
                <h3 style={{ margin: 0, color: "#fff", fontSize: "20px" }}>Emergency Incident Details</h3>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
              {getStatusBadge(selectedRequest.status)}
              {getUrgencyBadge(selectedRequest.urgency)}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px", color: "#cbd5e1" }}>
              <div>
                <strong style={{ color: "#fff" }}>Title:</strong> {selectedRequest.title}
              </div>
              <div>
                <strong style={{ color: "#fff" }}>Description:</strong>
                <p style={{ background: "#0a0f18", padding: "10px", borderRadius: "6px", margin: "6px 0 0", color: "#94a3b8" }}>
                  {selectedRequest.description}
                </p>
              </div>
              <div>
                <strong style={{ color: "#fff" }}>📍 Location:</strong> {selectedRequest.location}
              </div>
              <div>
                <strong style={{ color: "#fff" }}>👤 Created By:</strong> {selectedRequest.createdBy?.name || "N/A"} (
                {selectedRequest.createdBy?.email})
                {selectedRequest.createdBy?.phone && (
                  <div>
                    <strong style={{ color: "#fff" }}>📞 Contact:</strong> {selectedRequest.createdBy.phone}
                  </div>
                )}
              </div>
              {selectedRequest.acceptedBy && (
                <div>
                  <strong style={{ color: "#38bdf8" }}>🤝 Assigned Volunteer:</strong> {selectedRequest.acceptedBy.name} (
                  {selectedRequest.acceptedBy.email} - {selectedRequest.acceptedBy.phone})
                </div>
              )}
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                Created: {formatDate(selectedRequest.createdAt)} | Updated: {formatDate(selectedRequest.updatedAt)}
              </div>
            </div>

            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setSelectedRequest(null)}
                style={{
                  padding: "8px 18px",
                  background: "#1677ff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Close
              </button>
            </div>
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
              maxWidth: "420px",
              width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 40px rgba(239, 68, 68, 0.2)",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "10px" }}>⚠️</div>
            <h3 style={{ margin: "0 0 10px", color: "#fff", fontSize: "20px" }}>Delete Emergency Record?</h3>
            <p style={{ color: "#aeb9ca", fontSize: "14px", lineHeight: "1.5", margin: "0 0 20px" }}>
              As an administrator, this will permanently remove this emergency request record from the database.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
              <button
                onClick={() => setDeletingRequestId(null)}
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
                onClick={handleDeleteRequest}
                style={{
                  padding: "9px 20px",
                  background: "#e53935",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

export default AdminDashboard;
