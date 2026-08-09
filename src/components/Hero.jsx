import "../styles/Home.css";

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
          <button className="report-btn">
            🚨 Report Emergency
          </button>

          <button className="volunteer-btn">
            🤝 Become a Volunteer
          </button>
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