import "../styles/Statistics.css";

function Statistics() {
  return (
    <section className="statistics">

      <div className="statistics-header">
        <h2>
          ResQHub <span>IMPACT</span>
        </h2>

        <p>
          Building stronger communities through fast and reliable emergency response.
        </p>
      </div>

      <div className="statistics-container">

        {/* Emergency Reports */}
        <div className="stat-card red">
          <div className="stat-icon">🚨</div>

          <h3>250+</h3>

          <p>Emergencies Reported</p>
        </div>


        {/* Volunteers */}
        <div className="stat-card">
          <div className="stat-icon">🤝</div>

          <h3>500+</h3>

          <p>Active Volunteers</p>
        </div>


        {/* Emergency Support */}
        <div className="stat-card">
          <div className="stat-icon">🕐</div>

          <h3>24/7</h3>

          <p>Emergency Support</p>
        </div>

      </div>

    </section>
  );
}

export default Statistics;