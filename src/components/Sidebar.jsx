import {
  AssessmentOutlined,
  DashboardRounded,
  HelpOutlineRounded,
  LocalShippingOutlined,
  SettingsOutlined,
  TuneRounded,
} from "@mui/icons-material";
import { NavLink } from "react-router-dom";

const workspaceLinks = [
  { label: "Dispatch", icon: LocalShippingOutlined, badge: "8" },
  { label: "Reports", icon: AssessmentOutlined },
];

export default function Sidebar({ open, onClose, services, role }) {
  return (
    <>
      {open && <button className="sidebar-backdrop" aria-label="Close menu" onClick={onClose} />}
      <aside className={`sidebar${open ? " sidebar--open" : ""}`}>
        <NavLink className="brand" to="/" onClick={onClose}>
          <span className="brand-mark">
            <LocalShippingOutlined />
          </span>
          <span className="brand-copy">
            <strong>JK Foundry</strong>
            <small>POSTAL OPERATIONS</small>
          </span>
        </NavLink>

        <div className="sidebar-section">
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
                className={({ isActive }) => `nav-link${ isActive ? " nav-link--active" : ""}`}
                key={service.id}
                onClick={onClose}
                to={`/services/${encodeURIComponent(service.id)}`}
              >
                <LocalShippingOutlined />
                <span>{service.name}</span>
              </NavLink>
            ))}
            {workspaceLinks.map(({ label, icon: Icon, badge }) => (
              <button className="nav-link" key={label} onClick={onClose} type="button">
                <Icon />
                <span>{label}</span>
                {badge && <span className="nav-badge">{badge}</span>}
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-section">
            <span className="sidebar-label">PREFERENCES</span>
            <button className="nav-link" type="button">
              <SettingsOutlined />
              <span>Settings</span>
            </button>
            {role === "admin" && (
              <NavLink
                className={({ isActive }) => `nav-link${isActive ? " nav-link--active" : ""}`}
                onClick={onClose}
                to="/admin"
              >
                <TuneRounded />
                <span>Manage services</span>
              </NavLink>
            )}
            <button className="nav-link" type="button">
              <HelpOutlineRounded />
              <span>Help & support</span>
            </button>
          </div>
          <div className="sidebar-profile">
            <div className="profile-avatar">JK</div>
            <div className="profile-copy">
              <strong>JK Foundry</strong>
              <span>Operations team</span>
            </div>
            <span className="profile-menu">···</span>
          </div>
        </div>
      </aside>
    </>
  );
}
