import { MenuRounded, NotificationsNoneRounded, SearchRounded } from "@mui/icons-material";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useState } from "react";

import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import OrderStatus from "./pages/OrderStatus";
import "./App.css";

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isOrderStatus = location.pathname === "/order-status";

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-shell">
        <header className="topbar">
          <button
            aria-label="Open navigation"
            className="icon-button menu-button"
            onClick={() => setSidebarOpen(true)}
            type="button"
          >
            <MenuRounded />
          </button>
          <div className="breadcrumbs">
            <span>Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{isOrderStatus ? "Order status" : "Overview"}</strong>
          </div>
          <div className="topbar-actions">
            <button aria-label="Search" className="icon-button" type="button">
              <SearchRounded />
            </button>
            <button aria-label="Notifications" className="icon-button notification-button" type="button">
              <NotificationsNoneRounded />
              <span className="notification-dot" />
            </button>
            <div className="topbar-divider" />
            <div className="topbar-user">
              <span className="topbar-avatar">JK</span>
              <span className="topbar-user-name">JK Foundry</span>
            </div>
          </div>
        </header>

        <main className={isOrderStatus ? "page-content page-content--embed" : "page-content"}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/order-status" element={<OrderStatus />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
