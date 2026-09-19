import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";
import Footer from "./Footer";

/**
 * Reusable Protected Route wrapper for authentication and role authorization
 * @param {Array<string>} allowedRoles - Optional array of roles permitted to view the route ('user', 'volunteer', 'admin')
 * @param {ReactNode} children - Child component to render when authorized
 */
function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading indicator while authenticating
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#070b12",
          color: "#fff",
          fontSize: "18px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "36px", marginBottom: "16px" }}>⏳</div>
          <p>Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login with return path
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If role is restricted and user does not have permission
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <>
        <Navbar />
        <main
          style={{
            minHeight: "calc(100vh - 180px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 20px",
            background: "#070b12",
            color: "#fff",
          }}
        >
          <div
            style={{
              maxWidth: "500px",
              width: "100%",
              background: "#171c25",
              border: "1px solid #ff3b3b",
              borderRadius: "16px",
              padding: "36px 28px",
              textAlign: "center",
              boxShadow: "0 15px 35px rgba(229, 57, 53, 0.15)",
            }}
          >
            <div
              style={{
                fontSize: "42px",
                marginBottom: "16px",
              }}
            >
              🚫
            </div>
            <h2 style={{ color: "#ff4d4d", margin: "0 0 12px", fontSize: "24px" }}>
              403 - Access Forbidden
            </h2>
            <p style={{ color: "#aeb9ca", fontSize: "14px", lineHeight: "1.6", margin: "0 0 24px" }}>
              Your account with role <strong>'{user.role}'</strong> does not have permission to
              access this page. This area requires:{" "}
              <strong>{allowedRoles.join(" or ")}</strong> privileges.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <a
                href="/"
                style={{
                  padding: "10px 20px",
                  background: "#0b3d91",
                  color: "#fff",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                Go to Home
              </a>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // User is authenticated and authorized
  return children;
}

export default ProtectedRoute;
