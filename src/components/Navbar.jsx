import "../styles/Home.css";
import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">

      <div className="logo">
        🛡️ <span>ResQHub</span>
      </div>

      <ul className="nav-links">

        <li>
          <Link to="/">Home</Link>
        </li>

        <li>
          <Link to="/about">About</Link>
        </li>

        <li>
          <Link to="/report">Report Emergency</Link>
        </li>

        <li>
          <Link to="/volunteer">Volunteer</Link>
        </li>

      </ul>

      {/* Login and Register buttons */}
      <div className="nav-buttons">

        <Link to="/login" className="login-btn">
          🔐 Login
        </Link>

        <Link to="/register" className="register-btn">
          📝 Register
        </Link>

      </div>

    </nav>
  );
}

export default Navbar;