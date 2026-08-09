import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/logreg.css";

function Login() {

  const [loggedIn, setLoggedIn] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoggedIn(true);
  };

  return (
    <>
      <Navbar />

      <main className="page auth-page">

        <section className="auth-container">

          <div className="auth-card">

            <div className="auth-icon">🔐</div>

            <h1>Welcome Back</h1>

            <p className="auth-subtitle">
              Sign in to your ResQHub account
            </p>

            {!loggedIn ? (

              <form onSubmit={handleSubmit}>

                <div className="input-group">
                  <label>Email Address</label>

                  <input
                    type="email"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Password</label>

                  <input
                    type="password"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <div className="form-options">
                  <label className="remember">
                    <input type="checkbox" />
                    Remember me
                  </label>

                  <a href="#" className="forgot">
                    Forgot password?
                  </a>
                </div>

                <button className="primary-btn" type="submit">
                  🔐 Login
                </button>

              </form>

            ) : (

              <div className="success-message">

                <div className="success-icon small">✓</div>

                <h2>Login Successful!</h2>

                <p>
                  Welcome back to ResQHub.
                </p>

              </div>

            )}

            <div className="auth-divider">
              <span>OR</span>
            </div>

            <p className="auth-bottom">
              Don't have an account?
              {" "}
              <Link to="/register">
                Create an account
              </Link>
            </p>

          </div>

        </section>

      </main>

      <Footer />
    </>
  );
}

export default Login;