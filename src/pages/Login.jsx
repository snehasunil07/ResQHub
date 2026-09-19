import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import "../styles/logreg.css";

const DEMO_ACCOUNTS = [
  {
    role: "Admin",
    icon: "🛡️",
    email: "admin@resqhub.org",
    password: "Admin@ResQHub2026",
    label: "Admin Portal",
  },
  {
    role: "Volunteer",
    icon: "🤝",
    email: "volunteer@resqhub.org",
    password: "Volunteer@123",
    label: "Volunteer Desk",
  },
  {
    role: "Citizen",
    icon: "👤",
    email: "user@resqhub.org",
    password: "User@12345",
    label: "Citizen User",
  },
  {
    role: "Sneha",
    icon: "⭐",
    email: "snehasunil0707@gmail.com",
    password: "Password@123",
    label: "Sneha Sunil",
  },
];

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, logout, forgotPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [redirectPath, setRedirectPath] = useState("");

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmailInput, setForgotEmailInput] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotMsg, setForgotMsg] = useState({ text: "", isError: false });

  // Load remembered credentials on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("resqhub_remembered_email");
    const wasRemembered = localStorage.getItem("resqhub_remember_me") === "true";
    if (savedEmail && wasRemembered) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleDemoSelect = (demo) => {
    setEmail(demo.email);
    setPassword(demo.password);
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccessMsg("");

    if (!email.trim() || !password) {
      setFormError("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);

    const result = await login(email.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      // Manage Remember Me preference
      if (rememberMe) {
        localStorage.setItem("resqhub_remembered_email", email.trim());
        localStorage.setItem("resqhub_remember_me", "true");
      } else {
        localStorage.removeItem("resqhub_remembered_email");
        localStorage.removeItem("resqhub_remember_me");
      }

      // Determine smart role-based destination
      const role = result.user?.role;
      let target = "/dashboard";
      if (role === "admin") {
        target = "/admin";
      } else if (role === "volunteer") {
        target = "/volunteer";
      }

      // Respect intended return URL if present
      const from = location.state?.from?.pathname || target;
      setRedirectPath(from);
      setSuccessMsg(`Welcome back, ${result.user?.name || "User"}!`);

      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1100);
    } else {
      setFormError(result.message || "Invalid credentials. Please try again.");
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmailInput.trim()) {
      setForgotMsg({ text: "Please enter your email address.", isError: true });
      return;
    }

    setForgotSubmitting(true);
    setForgotMsg({ text: "", isError: false });

    const res = await forgotPassword(forgotEmailInput.trim());
    setForgotSubmitting(false);

    if (res.success) {
      setForgotMsg({
        text: res.message || "Password reset instructions have been dispatched to your email.",
        isError: false,
      });
    } else {
      setForgotMsg({
        text: res.message || "Unable to process password reset. Please verify your email.",
        isError: true,
      });
    }
  };

  return (
    <>
      <Navbar />

      <main className="page auth-page">
        <section className="auth-container">
          <div className="auth-card">
            <div className="auth-icon">🔐</div>

            <h1>Welcome Back</h1>

            <p className="auth-subtitle">
              Sign in to your ResQHub account
            </p>

            {/* Quick Demo Credentials Bar */}
            {!user && !successMsg && (
              <div className="demo-section">
                <div className="demo-header">
                  <span>🚀 1-Click Demo Accounts</span>
                </div>
                <div className="demo-chips">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      className={`demo-chip ${email === acc.email ? "active" : ""}`}
                      onClick={() => handleDemoSelect(acc)}
                      title={`Fill ${acc.label} credentials`}
                    >
                      <span>{acc.icon}</span>
                      <span>{acc.role}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {formError && (
              <div
                style={{
                  background: "rgba(229, 57, 53, 0.15)",
                  border: "1px solid #e53935",
                  color: "#ff8585",
                  padding: "12px 14px",
                  borderRadius: "9px",
                  fontSize: "13px",
                  marginBottom: "18px",
                  lineHeight: "1.4",
                  textAlign: "left",
                }}
              >
                ⚠️ {formError}
              </div>
            )}

            {user && !successMsg ? (
              <div className="success-message">
                <div className="success-icon small">👤</div>
                <h2>Already Logged In</h2>
                <p>
                  You are signed in as <strong>{user.name}</strong> ({user.role}).
                </p>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                  <button
                    className="primary-btn"
                    onClick={() => {
                      if (user.role === "admin") navigate("/admin");
                      else if (user.role === "volunteer") navigate("/volunteer");
                      else navigate("/dashboard");
                    }}
                    style={{ flex: 1 }}
                  >
                    Go to Dashboard
                  </button>
                  <button
                    className="primary-btn"
                    onClick={logout}
                    style={{
                      flex: 1,
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid #444",
                    }}
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : !successMsg ? (
              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label htmlFor="login-email">Email Address</label>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={isSubmitting}
                    autoComplete="email"
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="login-password">Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      disabled={isSubmitting}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      title={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? "👁️‍🗨️" : "👁️"}
                    </button>
                  </div>
                </div>

                <div className="form-options">
                  <label className="remember">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={isSubmitting}
                    />
                    Remember me
                  </label>

                  <button
                    type="button"
                    className="forgot"
                    onClick={() => {
                      setForgotEmailInput(email);
                      setForgotMsg({ text: "", isError: false });
                      setShowForgotModal(true);
                    }}
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  className="primary-btn"
                  type="submit"
                  disabled={isSubmitting}
                  style={{ opacity: isSubmitting ? 0.75 : 1 }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner"></span>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    "🔐 Login"
                  )}
                </button>
              </form>
            ) : (
              <div className="success-message">
                <div className="success-icon small">✓</div>
                <h2>Login Successful!</h2>
                <p>{successMsg}</p>
                <p style={{ fontSize: "12px", color: "#6e7c91" }}>
                  Navigating to {redirectPath}...
                </p>
              </div>
            )}

            <div className="auth-divider">
              <span>OR</span>
            </div>

            <p className="auth-bottom">
              Don't have an account?{" "}
              <Link to="/register">Create an account</Link>
            </p>
          </div>
        </section>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          className="auth-modal-overlay"
          onClick={() => setShowForgotModal(false)}
        >
          <div
            className="auth-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="auth-modal-close"
              onClick={() => setShowForgotModal(false)}
              aria-label="Close modal"
            >
              ✕
            </button>

            <h3>Reset Password</h3>
            <p>
              Enter the email address registered with your ResQHub account and
              we'll dispatch password recovery instructions.
            </p>

            {forgotMsg.text && (
              <div
                style={{
                  background: forgotMsg.isError
                    ? "rgba(229, 57, 53, 0.15)"
                    : "rgba(46, 125, 50, 0.18)",
                  border: `1px solid ${forgotMsg.isError ? "#e53935" : "#4caf50"}`,
                  color: forgotMsg.isError ? "#ff8585" : "#81c784",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  marginBottom: "16px",
                  lineHeight: "1.4",
                }}
              >
                {forgotMsg.isError ? "⚠️ " : "✓ "}
                {forgotMsg.text}
              </div>
            )}

            <form onSubmit={handleForgotSubmit}>
              <div className="input-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={forgotEmailInput}
                  onChange={(e) => setForgotEmailInput(e.target.value)}
                  placeholder="Enter registered email"
                  required
                  disabled={forgotSubmitting}
                  autoFocus
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => setShowForgotModal(false)}
                  style={{
                    flex: 1,
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid #444",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={forgotSubmitting}
                  style={{ flex: 1 }}
                >
                  {forgotSubmitting ? "Sending..." : "Send Instructions"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

export default Login;