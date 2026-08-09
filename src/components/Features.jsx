import "../styles/Features.css";

function Features() {
  return (
    <section className="features">

      <div className="features-header">
        <h2>Our <span>Services</span></h2>

        <p>
          Everything you need during an emergency,all in one place.
        </p>
      </div>

      <div className="features-container">

        <div className="feature-card red">
          <div className="feature-icon">🚨</div>

          <h3>Report Emergency</h3>

          <p>
            Quickly report accidents, fires, floods and other emergencies.
          </p>
        </div>


        <div className="feature-card">
          <div className="feature-icon">🤝</div>

          <h3>Find Volunteers</h3>

          <p>
            Connect with nearby volunteers who are ready to provide help.
          </p>
        </div>


        <div className="feature-card">
          <div className="feature-icon">📍</div>

          <h3>Live Location</h3>

          <p>
            Share your location to help volunteers identify where assistance
            is needed.
          </p>
        </div>


        <div className="feature-card">
          <div className="feature-icon">🏆</div>

          <h3>Volunteer Leaderboard</h3>

          <p>
            Recognize active volunteers and encourage community participation
            through points and rankings.
          </p>
        </div>

      </div>

    </section>
  );
}

export default Features;