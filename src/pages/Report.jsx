import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/pages.css";

function Report() {
  const { user, token, isAuthenticated } = useAuth();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Medicine");
  const [urgency, setUrgency] = useState("High");
  const [contact, setContact] = useState(user?.phone || "");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [submittedRequest, setSubmittedRequest] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageFile(null);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const ext = "." + file.name.split(".").pop().toLowerCase();
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];

    if (!allowedTypes.includes(file.type.toLowerCase()) || !allowedExtensions.includes(ext)) {
      setFormError("Invalid file type. Only JPG, JPEG, PNG, and WEBP image files are allowed.");
      e.target.value = "";
      setImageFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError("File size exceeds the 5MB limit. Please choose a smaller image.");
      e.target.value = "";
      setImageFile(null);
      return;
    }

    setFormError("");
    setImageFile(file);
  };

  const handleUseLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(5);
          const lng = position.coords.longitude.toFixed(5);
          setLocation(`GPS Coordinates: ${lat}, ${lng}`);
        },
        (_error) => {
          setFormError("Unable to retrieve location automatically. Please enter your location manually.");
        }
      );
    } else {
      setFormError("Geolocation is not supported by your browser. Please enter your location manually.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!isAuthenticated) {
      setFormError("You must be logged in to submit an emergency request.");
      return;
    }

    if (!title.trim() || !category || !urgency || !location.trim() || !description.trim()) {
      setFormError("Please fill out all required fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("category", category);
      formData.append("urgency", urgency);
      formData.append("location", location.trim());
      formData.append("description", description.trim());
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setFormError(data.message || "Failed to submit emergency request. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSubmittedRequest(data.request);
      // Reset form fields
      setTitle("");
      setCategory("Medicine");
      setUrgency("High");
      setDescription("");
      setLocation("");
      setImageFile(null);
      const fileInput = document.getElementById("emergency-image");
      if (fileInput) fileInput.value = "";
    } catch (err) {
      console.error("[Report] Submission error:", err);
      setFormError("Network error: Could not reach the server. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="report-page">
        <div className="report-container">
          <section className="report-header">
            <div className="report-main-icon">🚨</div>
            <h1>
              Report an <span>Emergency</span>
            </h1>
            <p>
              Quickly report an emergency and help connect people with the right support.
            </p>
          </section>

          {!submittedRequest ? (
            <form className="report-card" onSubmit={handleSubmit}>
              {!isAuthenticated && (
                <div
                  style={{
                    background: "rgba(255, 152, 0, 0.15)",
                    border: "1px solid #ff9800",
                    color: "#ffb74d",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    marginBottom: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <span>⚠️ You are not logged in. An account is required to submit verified reports.</span>
                  <Link
                    to="/login"
                    style={{
                      padding: "6px 14px",
                      background: "#ff9800",
                      color: "#000",
                      borderRadius: "6px",
                      textDecoration: "none",
                      fontWeight: "bold",
                      fontSize: "13px",
                    }}
                  >
                    Log In Now
                  </Link>
                </div>
              )}

              {formError && (
                <div
                  style={{
                    background: "rgba(229, 57, 53, 0.18)",
                    border: "1px solid #e53935",
                    color: "#ff8585",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    marginBottom: "18px",
                  }}
                >
                  ⚠️ {formError}
                </div>
              )}

              <div className="form-section-title">
                <span>01</span>
                Emergency Details
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Emergency Title / Summary *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Critical Blood Need at General Hospital"
                    required
                    maxLength={150}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label>Emergency Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    disabled={isSubmitting}
                  >
                    <option value="Blood">Blood Donation / Requirement</option>
                    <option value="Food">Food & Ration Supply</option>
                    <option value="Medicine">Medicine & Medical Supplies</option>
                    <option value="Transport">Transport & Evacuation</option>
                    <option value="Rescue">Search & Rescue</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Urgency Level *</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    required
                    disabled={isSubmitting}
                  >
                    <option value="Low">Low - Informational / Planned</option>
                    <option value="Medium">Medium - Prompt Support Needed</option>
                    <option value="High">High - Urgent Assistance Required</option>
                    <option value="Critical">Critical - Life Threatening</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Contact Phone Number</label>
                  <input
                    type="tel"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Your phone number"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Emergency Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe the emergency, who is affected, and immediate needs..."
                  required
                  disabled={isSubmitting}
                ></textarea>
              </div>

              <div className="form-section-title">
                <span>02</span>
                Location & Evidence
              </div>

              <div className="form-row">
                <div className="location-box">
                  <div className="location-icon">📍</div>
                  <div style={{ flex: 1 }}>
                    <h3>Emergency Location *</h3>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Street address, landmark, or city"
                      required
                      disabled={isSubmitting}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        marginTop: "6px",
                        background: "#080d14",
                        border: "1px solid #334052",
                        borderRadius: "6px",
                        color: "#fff",
                        fontSize: "13px",
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleUseLocation}
                    className="location-btn"
                    disabled={isSubmitting}
                  >
                    GPS Location
                  </button>
                </div>

                <div className="upload-box">
                  <label htmlFor="emergency-image" className="upload-label">
                    <span>📷</span>
                    <div>
                      <strong>{imageFile ? imageFile.name : "Upload Image"}</strong>
                      <small>
                        {imageFile
                          ? `${(imageFile.size / 1024).toFixed(1)} KB (Click to change)`
                          : "Optional • JPG / PNG / WEBP"}
                      </small>
                    </div>
                  </label>
                  <input
                    id="emergency-image"
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <button
                className="emergency-btn"
                type="submit"
                disabled={isSubmitting}
                style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? "not-allowed" : "pointer" }}
              >
                {isSubmitting ? "⏳ Submitting Report to MongoDB..." : "🚨 Submit Emergency Report"}
              </button>

              <p className="emergency-note">
                ⚠️ For life-threatening emergencies, contact your local emergency services immediately.
              </p>
            </form>
          ) : (
            <section className="report-success">
              <div className="success-circle">✓</div>
              <h2>Emergency Report Submitted</h2>
              <p>
                Your report has been received and saved with <strong>Pending</strong> status.
                Nearby volunteers and administrators can now review and respond.
              </p>

              <div
                style={{
                  background: "#0c131d",
                  border: "1px solid #1f3148",
                  borderRadius: "10px",
                  padding: "16px 20px",
                  margin: "20px auto 25px",
                  maxWidth: "500px",
                  textAlign: "left",
                  fontSize: "13px",
                  color: "#d0d8e2",
                }}
              >
                <div style={{ marginBottom: "6px" }}>
                  <strong style={{ color: "#fff" }}>Title:</strong> {submittedRequest.title}
                </div>
                <div style={{ marginBottom: "6px" }}>
                  <strong style={{ color: "#fff" }}>Category:</strong> {submittedRequest.category} |{" "}
                  <strong style={{ color: "#fff" }}>Urgency:</strong> {submittedRequest.urgency}
                </div>
                <div style={{ marginBottom: "6px" }}>
                  <strong style={{ color: "#fff" }}>Location:</strong> {submittedRequest.location}
                </div>
                <div>
                  <strong style={{ color: "#fff" }}>Status:</strong>{" "}
                  <span
                    style={{
                      background: "rgba(255, 152, 0, 0.2)",
                      color: "#ffb74d",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    {submittedRequest.status}
                  </span>
                </div>
              </div>

              <button
                className="emergency-btn"
                onClick={() => setSubmittedRequest(null)}
              >
                Report Another Emergency
              </button>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

export default Report;