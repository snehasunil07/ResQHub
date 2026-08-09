import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/pages.css";

function Volunteer() {
  const [joined, setJoined] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setJoined(true);
  };

  return (
    <>
      <Navbar />

      <main className="volunteer-page">

        <div className="volunteer-container">

          <section className="volunteer-header">

            <div className="volunteer-main-icon">
              🤝
            </div>

            <h1>
              Become a <span>Volunteer</span>
            </h1>

            <p>
              Help your community when it needs you most.
            </p>

          </section>


          {!joined ? (

            <form
              className="volunteer-card"
              onSubmit={handleSubmit}
            >

              <div className="form-section-title blue">
                <span>01</span>
                Personal Information
              </div>


              <div className="form-row">

                <div className="form-group">
                  <label>Full Name</label>

                  <input
                    type="text"
                    placeholder="Your full name"
                    required
                  />
                </div>


                <div className="form-group">
                  <label>Phone Number</label>

                  <input
                    type="tel"
                    placeholder="Your phone number"
                    required
                  />
                </div>

              </div>


              <div className="form-group">
                <label>Email Address</label>

                <input
                  type="email"
                  placeholder="Your email address"
                  required
                />
              </div>


              <div className="form-section-title blue">
                <span>02</span>
                Availability & Skills
              </div>


              <div className="form-row">

                <div className="form-group">

                  <label>
                    When are you available?
                  </label>

                  <select required>

                    <option value="">
                      Select availability
                    </option>

                    <option>
                      Available Now
                    </option>

                    <option>
                      Available on Weekdays
                    </option>

                    <option>
                      Available on Weekends
                    </option>

                    <option>
                      Available Evenings
                    </option>

                    <option>
                      Available Occasionally
                    </option>

                  </select>

                </div>


                <div className="form-group">

                  <label>
                    Area of Interest
                  </label>

                  <select required>

                    <option value="">
                      Select an area
                    </option>

                    <option>
                      Medical Assistance
                    </option>

                    <option>
                      Search & Rescue
                    </option>

                    <option>
                      Transportation
                    </option>

                    <option>
                      General Support
                    </option>

                  </select>

                </div>

              </div>


              <button
                type="submit"
                className="volunteer-btn-page"
              >
                🤝 Join ResQHub Volunteers
              </button>

            </form>

          ) : (

            <section className="volunteer-success">

              <div className="volunteer-success-icon">
                ✓
              </div>

              <h2>Welcome to ResQHub!</h2>

              <p>
                You have successfully joined our volunteer
                community.
              </p>

              <div className="volunteer-success-badge">
                🤝 ResQHub Volunteer
              </div>

            </section>

          )}

        </div>

      </main>

      <Footer />
    </>
  );
}

export default Volunteer;