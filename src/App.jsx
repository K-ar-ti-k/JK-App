import { MenuRounded, NotificationsNoneRounded, SearchRounded } from "@mui/icons-material";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

import Sidebar from "./components/Sidebar";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import ServiceDashboard from "./pages/ServiceDashboard";
import { getPortalServices, savePortalServices } from "./services/dashboardServices";
import { APPS_SCRIPT_API_URL, GOOGLE_CLIENT_ID } from "./services/portalApi";
import "./App.css";

function GoogleSignIn({ onCredential }) {
  const buttonRef = useRef(null);
  const onCredentialRef = useRef(onCredential);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      return undefined;
    }

    let cancelled = false;
    let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    const renderButton = () => {
      if (cancelled || !buttonRef.current || !window.google?.accounts?.id) {
        return;
      }
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => onCredentialRef.current(response.credential),
      });
      buttonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: 280,
      });
    };

    if (window.google?.accounts?.id) {
      renderButton();
    } else {
      if (!script) {
        script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.head.append(script);
      }
      script.addEventListener("load", renderButton);
    }

    return () => {
      cancelled = true;
      script?.removeEventListener("load", renderButton);
    };
  }, []);

  return <div className="google-sign-in-button" ref={buttonRef} />;
}

function SignInPage({ auth, onCredential }) {
  return (
    <main className="sign-in-page">
      <section className="sign-in-card">
        <div className="brand-mark sign-in-mark"><span>JK</span></div>
        <div className="eyebrow"><span className="live-dot" /> POSTAL OPERATIONS</div>
        <h1>Welcome to JK Foundry</h1>
        <p>Sign in with Google to view your service dashboards.</p>
        <div className="sign-in-action">
          {auth.status === "loading" ? (
            <span className="sign-in-loading">Signing in and loading dashboards…</span>
          ) : (
            <GoogleSignIn onCredential={onCredential} />
          )}
        </div>
        {auth.error && <div className="admin-error sign-in-error" role="alert">{auth.error}</div>}
        {(!GOOGLE_CLIENT_ID || !APPS_SCRIPT_API_URL) && (
          <p className="sign-in-setup-note">
            Setup is incomplete. Configure the Google OAuth client ID and deployed Apps Script API
            URL in the Vercel project settings.
          </p>
        )}
        <span className="sign-in-security">Your access is checked securely by the JK Foundry services API.</span>
      </section>
    </main>
  );
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [auth, setAuth] = useState({ status: "signedOut", error: "" });
  const location = useLocation();
  const services = auth.status === "signedIn" ? auth.services : [];
  const selectedServiceId = location.pathname.startsWith("/services/")
    ? decodeURIComponent(location.pathname.slice("/services/".length))
    : "";
  const selectedService = services.find((service) => service.id === selectedServiceId);
  const isAdminPage = location.pathname === "/admin";
  const pageTitle = isAdminPage ? "Manage services" : selectedService?.name || "Overview";

  const handleCredential = async (credential) => {
    setAuth({ status: "loading", error: "" });
    try {
      const session = await getPortalServices(credential);
      setAuth({
        status: "signedIn",
        credential,
        email: session.email,
        role: session.role,
        services: session.services,
        error: "",
      });
    } catch (error) {
      setAuth({ status: "error", error: error.message });
    }
  };

  const handleSaveServices = async (nextServices) => {
    if (auth.status !== "signedIn" || auth.role !== "admin") {
      throw new Error("Only an authorized administrator can manage services.");
    }
    const result = await savePortalServices(auth.credential, nextServices);
    setAuth((current) => ({
      ...current,
      services: result.services,
    }));
    return result.services;
  };

  const handleSignOut = () => {
    window.google?.accounts?.id?.disableAutoSelect();
    setAuth({ status: "signedOut", error: "" });
  };

  if (auth.status !== "signedIn") {
    return <SignInPage auth={auth} onCredential={handleCredential} />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        role={auth.role}
        services={services}
      />
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
            <strong>{pageTitle}</strong>
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
              <span className="topbar-avatar">{auth.email.slice(0, 1).toUpperCase()}</span>
              <span className="topbar-user-name">{auth.email}</span>
              <span className={`role-badge role-badge--${auth.role}`}>{auth.role}</span>
              <button className="sign-out-button" onClick={handleSignOut} type="button">Sign out</button>
            </div>
          </div>
        </header>

        <main className={selectedService ? "page-content page-content--embed" : "page-content"}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route
              path="/admin"
              element={
                auth.role === "admin"
                  ? <Admin onSaveServices={handleSaveServices} services={services} />
                  : <Navigate replace to="/" />
              }
            />
            <Route path="/services/:serviceId" element={<ServiceDashboard services={services} />} />
            <Route path="/order-status" element={<Navigate replace to="/services/order-status" />} />
            <Route path="*" element={<Navigate replace to="/" />} />
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
