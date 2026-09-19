import { useState } from "react";
import "../styles/Home.css";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const closeMenu = () => setMobileMenuOpen(false);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="logo" onClick={closeMenu} style={{ textDecoration: "none" }}>
          🛡️ <span>ResQHub</span>
        </Link>
      </div>

      {/* Mobile Hamburger Toggle Button */}
      <button
        className="mobile-nav-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle navigation menu"
        style={{
          display: "none",
          background: "transparent",
          border: "none",
          color: "#fff",
          fontSize: "26px",
          cursor: "pointer",
          padding: "6px",
        }}
      >
        {mobileMenuOpen ? "✕" : "☰"}
      </button>

      <div className={`nav-collapse ${mobileMenuOpen ? "open" : ""}`}>
        <ul className="nav-links">
          <li>
            <Link to="/" onClick={closeMenu} className={isActive("/") ? "active-link" : ""}>
              Home
            </Link>
          </li>
          <li>
            <Link to="/about" onClick={closeMenu} className={isActive("/about") ? "active-link" : ""}>
              About
            </Link>
          </li>
          <li>
            <Link to="/leaderboard" onClick={closeMenu} className={isActive("/leaderboard") ? "active-link" : ""}>
              Leaderboard
            </Link>
          </li>

          {/* Dynamic role-based navigation */}
          {user?.role === "admin" && (
            <li>
              <Link to="/admin" onClick={closeMenu} className={isActive("/admin") ? "active-link" : ""}>
                Admin Dashboard
              </Link>
            </li>
          )}

          {user?.role === "volunteer" && (
            <li>
              <Link to="/volunteer" onClick={closeMenu} className={isActive("/volunteer") ? "active-link" : ""}>
                Volunteer Portal
              </Link>
            </li>
          )}

          {user?.role === "user" && (
            <>
              <li>
                <Link to="/report" onClick={closeMenu} className={isActive("/report") ? "active-link" : ""}>
                  Report Emergency
                </Link>
              </li>
              <li>
                <Link to="/dashboard" onClick={closeMenu} className={isActive("/dashboard") ? "active-link" : ""}>
                  My Dashboard
                </Link>
              </li>
            </>
          )}

          {!user && (
            <>
              <li>
                <Link to="/report" onClick={closeMenu} className={isActive("/report") ? "active-link" : ""}>
                  Report Emergency
                </Link>
              </li>
              <li>
                <Link to="/volunteer" onClick={closeMenu} className={isActive("/volunteer") ? "active-link" : ""}>
                  Volunteer
                </Link>
              </li>
            </>
          )}
        </ul>

        {/* Auth state: User info & Logout or Login & Register */}
        <div className="nav-buttons">
          {user ? (
            <div className="user-profile-bar" style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#e1e6ee",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                👤 {user.name}
                <span
                  style={{
                    fontSize: "10px",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    background:
                      user.role === "admin"
                        ? "rgba(229, 57, 53, 0.2)"
                        : user.role === "volunteer"
                        ? "rgba(22, 119, 255, 0.2)"
                        : "rgba(255, 255, 255, 0.1)",
                    border:
                      user.role === "admin"
                        ? "1px solid #ff4d4d"
                        : user.role === "volunteer"
                        ? "1px solid #1677ff"
                        : "1px solid #555",
                    color:
                      user.role === "admin"
                        ? "#ff6b6b"
                        : user.role === "volunteer"
                        ? "#4da3ff"
                        : "#ccc",
                    textTransform: "capitalize",
                  }}
                >
                  {user.role}
                </span>
              </span>

              <button
                onClick={() => {
                  logout();
                  closeMenu();
                }}
                className="login-btn"
                style={{
                  cursor: "pointer",
                  background: "rgba(229, 57, 53, 0.12)",
                  borderColor: "#e53935",
                  color: "#ff7070",
                }}
              >
                🚪 Logout
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <Link to="/login" onClick={closeMenu} className="login-btn">
                🔐 Login
              </Link>
              <Link to="/register" onClick={closeMenu} className="register-btn">
                📝 Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;