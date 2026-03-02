import { NavLink } from "react-router-dom";
import { ROLE_ROUTES } from "../constants/roles";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const items = user ? ROLE_ROUTES[user.role] || [] : [];

  return (
    <aside className="sidebar card">
      <h3>Transport Console</h3>
      <p className="muted">{user?.email}</p>
      <nav className="menu">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} className="menu-link">
            {item.label}
          </NavLink>
        ))}
      </nav>
      {user && (
        <button className="btn danger" onClick={logout}>
          Logout
        </button>
      )}
    </aside>
  );
}
