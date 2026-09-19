import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import "../styles/logreg.css";

const VOLUNTEER_AREAS_OF_INTEREST = [
  "Medical Emergency",
  "Fire & Rescue",
  "Accident Response",
  "Natural Disaster Relief",
  "Missing Person Search",
  "Food & Essential Supplies",
  "Blood Donation",
  "First Aid",
  "Transportation & Evacuation",
  "Shelter & Accommodation",
  "Other",
];

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("user");
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [registered, setRegistered] = useState(false);

  const handleInterestToggle = (area) => {
    setSelectedInterests((prev) =>
      prev.includes(area)
        ? prev.filter((item) => item !== area)
        : [...prev, area]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!termsAccepted) {
      setFormError("You must agree to the terms and conditions to proceed.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match. Please re-enter.");
      return;
    }

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }

    if (role === "volunteer" && selectedInterests.length === 0) {
      setFormError("Please select at least one area of interest.");
      return;
    }

    setIsSubmitting(true);

    const result = await register({
      name,
      email,
      phone,
      password,
      role,
      interests: role === "volunteer" ? selectedInterests : [],
    });

    setIsSubmitting(false);

    if (result.success) {
      setRegistered(true);
    } else {
      setFormError(result.message || "Registration failed. Please check your inputs.");
    }
  };

  return (
    <>
      <Navbar />

      <main className="page auth-page">
        <section className="auth-container">
          <div className="auth-card register-card">
            <div className="auth-icon">📝</div>

            <h1>Create Account</h1>

            <p className="auth-subtitle">
              Join the ResQHub community today
            </p>

            {formError && (
              <div
                style={{
                  background: "rgba(229, 57, 53, 0.15)",
                  border: "1px solid #e53935",
                  color: "#ff8585",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  marginBottom: "18px",
                  textAlign: "center",
                }}
              >
                ⚠️ {formError}
              </div>
            )}

            {!registered ? (
              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="input-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="input-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="input-group">
                  <label>I want to join as</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={isSubmitting}
                    style={{
                      width: "100%",
                      padding: "14px 15px",
                      background: "#0f141c",
                      color: "#ffffff",
                      border: "1px solid #354052",
                      borderRadius: "9px",
                      outline: "none",
                      fontSize: "15px",
                      cursor: "pointer",
                    }}
                  >
                    <option value="user">Citizen / Requester</option>
                    <option value="volunteer">Volunteer Responder</option>
                  </select>
                </div>

                {role === "volunteer" && (
                  <div className="input-group">
                    <label>
                      Areas of Interest <span style={{ color: "#e53935" }}>*</span>
                    </label>
                    <p
                      style={{
                        margin: "-2px 0 10px 0",
                        fontSize: "12.5px",
                        color: "#9ca6b5",
                        lineHeight: 1.4,
                      }}
                    >
                      Select one or more areas you can assist with:
                    </p>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))",
                        gap: "8px",
                        background: "#0f141c",
                        padding: "12px",
                        borderRadius: "9px",
                        border: "1px solid #354052",
                      }}
                    >
                      {VOLUNTEER_AREAS_OF_INTEREST.map((area) => {
                        const isChecked = selectedInterests.includes(area);
                        return (
                          <label
                            key={area}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "7px 10px",
                              borderRadius: "6px",
                              background: isChecked
                                ? "rgba(229, 57, 53, 0.12)"
                                : "rgba(255, 255, 255, 0.02)",
                              border: isChecked
                                ? "1px solid rgba(229, 57, 53, 0.4)"
                                : "1px solid rgba(255, 255, 255, 0.05)",
                              color: isChecked ? "#ffffff" : "#c4cdd8",
                              fontSize: "13px",
                              cursor: isSubmitting ? "not-allowed" : "pointer",
                              transition: "all 0.2s ease",
                              userSelect: "none",
                            }}
                          >
                            <input
                              type="checkbox"
                              value={area}
                              checked={isChecked}
                              disabled={isSubmitting}
                              onChange={() => handleInterestToggle(area)}
                              style={{
                                accentColor: "#e53935",
                                width: "16px",
                                height: "16px",
                                cursor: isSubmitting ? "not-allowed" : "pointer",
                                margin: 0,
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ lineHeight: 1.3 }}>{area}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="input-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password (min 6 characters)"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="input-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <label className="terms">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    required
                  />
                  I agree to the ResQHub terms and conditions.
                </label>

                <button
                  className="primary-btn"
                  type="submit"
                  disabled={isSubmitting}
                  style={{ opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? "⏳ Creating Account..." : "📝 Create Account"}
                </button>
              </form>
            ) : (
              <div className="success-message">
                <div className="success-icon">✓</div>

                <h2>Account Created!</h2>

                <p>
                  Welcome to ResQHub! Your account has been created successfully.
                </p>

                <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                  <button
                    onClick={() => navigate("/")}
                    className="primary-btn link-btn"
                    style={{ flex: 1, textDecoration: "none" }}
                  >
                    Go to Home
                  </button>
                  <Link
                    to="/login"
                    className="primary-btn link-btn"
                    style={{
                      flex: 1,
                      textDecoration: "none",
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid #444",
                    }}
                  >
                    Login Page
                  </Link>
                </div>
              </div>
            )}

            <div className="auth-divider">
              <span>OR</span>
            </div>

            <p className="auth-bottom">
              Already have an account?{" "}
              <Link to="/login">Login here</Link>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Register;