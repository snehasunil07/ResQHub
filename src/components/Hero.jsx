import "../styles/Home.css";
import { Link } from "react-router-dom";

function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">

        <h1>ResQHub</h1>

        <h2>Connecting Communities During Emergencies</h2>

        <p>
          Empowering communities with a fast, reliable, and collaborative
          emergency response platform. Report incidents instantly, connect
          nearby volunteers, and help save lives when every second counts.
        </p>

        <div className="hero-buttons">
          <Link to="/report" className="report-btn" style={{ textDecoration: "none" }}>
            🚨 Report Emergency
          </Link>

          <Link to="/volunteer" className="volunteer-btn" style={{ textDecoration: "none" }}>
            🤝 Become a Volunteer
          </Link>
        </div>

        <div className="hero-icons">
          <span>🚑</span>
          <span>🚒</span>
          <span>🚓</span>
          <span>🏥</span>
          <span>🤝</span>
        </div>

      </div>
    </section>
  );
}

export default Hero;