import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/pages.css";

function About() {
  return (
    <>
      <Navbar />

      <main className="about-page">

        {/* HERO */}
        <section className="about-hero">
          <h1>
            About <span>ResQHub</span>
          </h1>

          <p>
            A smart community-driven platform designed to connect people,
            volunteers and emergency support when every second matters.
          </p>
        </section>


        <div className="about-container">

          {/* INTRO */}
          <section className="about-intro">
            <h2>🚨 What is ResQHub?</h2>

            <p>
              ResQHub is a community emergency response platform that helps
              people report emergencies quickly and connect with nearby
              volunteers who can provide immediate assistance.
            </p>
          </section>


          {/* MISSION & VISION */}
          <section className="about-grid">

            <div className="about-card">
              <div className="about-card-icon">
                🎯
              </div>

              <h2>Our Mission</h2>

              <p>
                To make emergency assistance faster, simpler and accessible
                by connecting people in need with volunteers and support
                services.
              </p>
            </div>


            <div className="about-card red">
              <div className="about-card-icon">
                👁️
              </div>

              <h2>Our Vision</h2>

              <p>
                To build stronger and safer communities where people can
                support each other during emergencies.
              </p>
            </div>

          </section>


          {/* SERVICES */}
          <section className="about-services">

            <h2>
              What <span>ResQHub</span> Offers
            </h2>

            <div className="services-grid">

              <div className="service-item">
                <div className="service-icon">🚨</div>

                <div>
                  <h3>Emergency Reporting</h3>
                  <p>
                    Report emergencies quickly with important details.
                  </p>
                </div>
              </div>


              <div className="service-item">
                <div className="service-icon">🤝</div>

                <div>
                  <h3>Volunteer Support</h3>
                  <p>
                    Connect people with volunteers ready to help.
                  </p>
                </div>
              </div>


              <div className="service-item">
                <div className="service-icon">📍</div>

                <div>
                  <h3>Live Location</h3>
                  <p>
                    Help responders understand where assistance is needed.
                  </p>
                </div>
              </div>


              <div className="service-item">
                <div className="service-icon">🏆</div>

                <div>
                  <h3>Volunteer Leaderboard</h3>
                  <p>
                    Recognize volunteers for their valuable contributions.
                  </p>
                </div>
              </div>

            </div>

          </section>


          {/* WHY RESQHUB */}
          <section className="why-resqhub">

            <h2>Why ResQHub?</h2>

            <p>
              Emergencies require quick communication and coordinated
              action. ResQHub brings communities together so that help can
              reach people faster.
            </p>

            <div className="about-highlight">
              Fast. Safe. Together. 🚨
            </div>

          </section>

        </div>

      </main>

      <Footer />
    </>
  );
}

export default About;