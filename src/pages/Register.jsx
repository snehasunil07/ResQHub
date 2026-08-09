import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/logreg.css";

function Register() {

  const [registered, setRegistered] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setRegistered(true);
  };

  return (
    <>
      <Navbar />

      <main className="page auth-page">

        <section className="auth-container">

          <div className="auth-card register-card">

            <div className="auth-icon">📝</div>

            <h1>Create Account</h1>

            <p className="auth-subtitle">
              Join the ResQHub community today
            </p>

            {!registered ? (

              <form onSubmit={handleSubmit}>

                <div className="input-group">
                  <label>Full Name</label>

                  <input
                    type="text"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Email Address</label>

                  <input
                    type="email"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Phone Number</label>

                  <input
                    type="tel"
                    placeholder="Enter your phone number"
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Password</label>

                  <input
                    type="password"
                    placeholder="Create a password"
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Confirm Password</label>

                  <input
                    type="password"
                    placeholder="Confirm your password"
                    required
                  />
                </div>

                <label className="terms">
                  <input type="checkbox" required />
                  I agree to the ResQHub terms and conditions.
                </label>

                <button className="primary-btn" type="submit">
                  📝 Create Account
                </button>

              </form>

            ) : (

              <div className="success-message">

                <div className="success-icon">✓</div>

                <h2>Account Created!</h2>

                <p>
                  Your ResQHub account has been created successfully.
                </p>

                <Link to="/login" className="primary-btn link-btn">
                  Go to Login
                </Link>

              </div>

            )}

            <div className="auth-divider">
              <span>OR</span>
            </div>

            <p className="auth-bottom">
              Already have an account?
              {" "}
              <Link to="/login">
                Login here
              </Link>
            </p>

          </div>

        </section>

      </main>

      <Footer />
    </>
  );
}

export default Register;