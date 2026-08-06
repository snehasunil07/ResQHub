import "../styles/Home.css";
function Hero() {
  return (
    <section className="hero">

      <h1>Connecting Communities During Emergencies</h1>

      <h2>Fast. Safe. Together.</h2>

      <p>
        ResQHub is a community-driven emergency response platform
        that connects citizens, volunteers, hospitals, and NGOs
        during emergencies.
      </p>

      <div className="hero-buttons">
        <button className="report-btn">
          🚨 Report Emergency
        </button>

        <button className="volunteer-btn">
          🤝 Become a Volunteer
        </button>
      </div>

    </section>
  );
}

export default Hero;