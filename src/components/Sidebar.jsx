import {
  CloseRounded,
  DashboardRounded,
  DashboardCustomizeRounded,
  TuneRounded,
} from "@mui/icons-material";
import { NavLink } from "react-router-dom";

export default function Sidebar({ open, onClose, services, role }) {
  return (
    <>
      {open && (
        <button
          aria-label="Close menu"
          className="sidebar-backdrop"
          onClick={onClose}
          type="button"
        />
      )}
      <aside
        aria-label="Workspace sidebar"
        className={`sidebar${open ? " sidebar--open" : ""}`}
        id="primary-navigation"
      >
        <div className="sidebar-header">
          <NavLink className="brand" to="/" onClick={onClose}>
            <span className="brand-mark brand-mark--image">
              <img alt="" src="/app-icon-192.png" />
            </span>
            <span className="brand-copy">
              <strong>JK Foundry</strong>
              <small>POSTAL OPERATIONS</small>
            </span>
          </NavLink>
          <button
            aria-label="Close navigation"
            className="sidebar-close-button"
            onClick={onClose}
            type="button"
          >
            <CloseRounded />
          </button>
        </div>

        <div className="sidebar-section sidebar-workspace">
          <span className="sidebar-label">WORKSPACE</span>
          <nav className="sidebar-nav" aria-label="Main navigation">
            <NavLink
              className={({ isActive }) => `nav-link${isActive ? " nav-link--active" : ""}`}
              end
              onClick={onClose}
              to="/"
            >
              <DashboardRounded />
              <span>Overview</span>
            </NavLink>
            {services.map((service) => (
              <NavLink
                className={({ isActive }) => `nav-link${isActive ? " nav-link--active" : ""}`}
                key={service.id}
                onClick={onClose}
                to={`/services/${encodeURIComponent(service.id)}`}
              >
                <DashboardCustomizeRounded />
                <span>{service.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          {role === "admin" && (
            <div className="sidebar-admin">
              <span className="sidebar-label">ADMINISTRATION</span>
              <NavLink
                className={({ isActive }) => `nav-link${isActive ? " nav-link--active" : ""}`}
                onClick={onClose}
                to="/admin"
              >
                <TuneRounded />
                <span>Manage services</span>
              </NavLink>
            </div>
          )}
          <div className="sidebar-profile">
            <div className="profile-avatar">JK</div>
            <div className="profile-copy">
              <strong>JK Foundry</strong>
              <span>{role === "admin" ? "Administrator" : "Viewer"}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
