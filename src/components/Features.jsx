import "../styles/Features.css";

function Features() {
  return (
    <section className="services">

      <h2>Our Services</h2>
      <p className="subtitle">
        Everything you need during an emergency, all in one place.
      </p>

      <div className="service-container">

        <div className="service-card">
          <div className="icon">🚨</div>
          <h3>Report Emergency</h3>
          <p>
            Instantly report accidents, disasters or medical emergencies to
            nearby volunteers.
          </p>
        </div>

        <div className="service-card">
          <div className="icon">🤝</div>
          <h3>Volunteer Support</h3>
          <p>
            Join as a volunteer and help your community during emergencies.
          </p>
        </div>

        <div className="service-card">
          <div className="icon">📍</div>
          <h3>Live Location</h3>
          <p>
            Share your exact location for faster rescue and quicker response.
          </p>
        </div>

        <div className="service-card">
          <div className="icon">🏆</div>
          <h3>Leaderboard</h3>
          <p>
            Earn points for every completed rescue and become a top volunteer.
          </p>
        </div>

      </div>

    </section>
  );
}

export default Features;