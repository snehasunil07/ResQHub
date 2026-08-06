import "../styles/Statistics.css";

function Statistics() {
  return (
    <section className="statistics">

      <h2>Trusted by Communities</h2>
      <p>
        Building a safer future through community collaboration.
      </p>

      <div className="stats-container">

        <div className="stat-card">
          <h1>400+</h1>
          <h3>Volunteers</h3>
        </div>

        <div className="stat-card">
          <h1>1000+</h1>
          <h3>Emergencies Reported</h3>
        </div>

        <div className="stat-card">
          <h1>20+</h1>
          <h3>Partner NGOs</h3>
        </div>

        <div className="stat-card">
          <h1>24/7</h1>
          <h3>Emergency Support</h3>
        </div>

      </div>

    </section>
  );
}

export default Statistics;