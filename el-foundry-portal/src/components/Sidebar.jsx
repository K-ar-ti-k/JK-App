import {
  AssessmentOutlined,
  DashboardRounded,
  HelpOutlineRounded,
  Inventory2Outlined,
  LocalShippingOutlined,
  SettingsOutlined,
} from "@mui/icons-material";
import { NavLink } from "react-router-dom";

const navigation = [
  { label: "Overview", path: "/", icon: DashboardRounded },
  { label: "Order status", path: "/order-status", icon: Inventory2Outlined },
];

const workspaceLinks = [
  { label: "Dispatch", icon: LocalShippingOutlined, badge: "8" },
  { label: "Reports", icon: AssessmentOutlined },
];

export default function Sidebar({ open, onClose }) {
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
            {navigation.map(({ label, path, icon: Icon }) => (
              <NavLink
                className={({ isActive }) => `nav-link${isActive ? " nav-link--active" : ""}`}
                end={path === "/"}
                key={path}
                onClick={onClose}
                to={path}
              >
                <Icon />
                <span>{label}</span>
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
