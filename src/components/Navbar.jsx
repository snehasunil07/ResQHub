import "../styles/Home.css";
function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo">
        🛡️<span>ResQHub</span>
      </div>

      <ul className="nav-links">
        <li><a href="#">Home</a></li>
        <li><a href="#">About</a></li>
        <li><a href="#">Login</a></li>
        <li><a href="#">Register</a></li>
      </ul>
    </nav>
  );
}

export default Navbar;