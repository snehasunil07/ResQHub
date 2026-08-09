import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/pages.css";

function Report() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      <Navbar />

      <main className="report-page">

        <div className="report-container">

          <section className="report-header">

            <div className="report-main-icon">
              🚨
            </div>

            <h1>
              Report an <span>Emergency</span>
            </h1>

            <p>
              Quickly report an emergency and help connect people
              with the right support.
            </p>

          </section>


          {!submitted ? (

            <form
              className="report-card"
              onSubmit={handleSubmit}
            >

              <div className="form-section-title">
                <span>01</span>
                Emergency Details
              </div>


              <div className="form-row">

                <div className="form-group">
                  <label>Emergency Type</label>

                  <select required>
                    <option value="">
                      Select type
                    </option>

                    <option>Medical Emergency</option>
                    <option>Fire</option>
                    <option>Accident</option>
                    <option>Natural Disaster</option>
                    <option>Missing Person</option>
                    <option>Other</option>
                  </select>
                </div>


                <div className="form-group">
                  <label>Contact Number</label>

                  <input
                    type="tel"
                    placeholder="Your phone number"
                    required
                  />
                </div>

              </div>


              <div className="form-group">
                <label>Emergency Description</label>

                <textarea
                  placeholder="Briefly describe what happened..."
                  required
                ></textarea>
              </div>


              <div className="form-section-title">
                <span>02</span>
                Location & Evidence
              </div>


              <div className="form-row">

                <div className="location-box">

                  <div className="location-icon">
                    📍
                  </div>

                  <div>
                    <h3>Emergency Location</h3>

                    <p>
                      Share your current location
                    </p>
                  </div>

                  <button
                    type="button"
                    className="location-btn"
                  >
                    Use Location
                  </button>

                </div>


                <div className="upload-box">

                  <label
                    htmlFor="emergency-image"
                    className="upload-label"
                  >

                    <span>📷</span>

                    <div>
                      <strong>Upload Image</strong>

                      <small>
                        Optional • JPG / PNG
                      </small>
                    </div>

                  </label>

                  <input
                    id="emergency-image"
                    type="file"
                    accept="image/*"
                  />

                </div>

              </div>


              <button
                className="emergency-btn"
                type="submit"
              >
                🚨 Submit Emergency Report
              </button>


              <p className="emergency-note">
                ⚠️ For life-threatening emergencies, contact
                your local emergency services immediately.
              </p>

            </form>

          ) : (

            <section className="report-success">

              <div className="success-circle">
                ✓
              </div>

              <h2>Emergency Report Submitted</h2>

              <p>
                Your report has been received successfully.
                Nearby volunteers can now respond.
              </p>

              <button
                className="emergency-btn"
                onClick={() => setSubmitted(false)}
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