import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        <span className="brand-mark">NSTLN</span>
        <span className="brand-name">Skill &amp; Tool Lending</span>
      </Link>

      <nav className="nav-links">
        <Link to="/">Browse</Link>
        {user && <Link to="/create">List an item</Link>}
        {user && <Link to="/my-listings">My listings</Link>}
        {user && <Link to="/requests">Requests</Link>}
      </nav>

      <div className="nav-auth">
        {user ? (
          <>
            <span className="nav-user">Hi, {user.name.split(' ')[0]}</span>
            <button className="btn btn-ghost" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link className="btn btn-ghost" to="/login">
              Log in
            </Link>
            <Link className="btn btn-primary" to="/register">
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}