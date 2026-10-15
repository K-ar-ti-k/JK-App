import { MenuRounded } from "@mui/icons-material";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

import Sidebar from "./components/Sidebar";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import ServiceDashboard from "./pages/ServiceDashboard";
import {
  createPortalSession,
  destroyPortalSession,
  GOOGLE_CLIENT_ID,
  restorePortalSession,
  savePortalServices,
} from "./services/portalApi";
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
  const restoring = auth.status === "restoring";

  return (
    <main className={`sign-in-page${restoring ? " sign-in-page--restoring" : ""}`}>
      <section aria-live="polite" className={`sign-in-card${restoring ? " sign-in-card--restoring" : ""}`}>
        <div className="brand-mark sign-in-mark"><span>JK</span></div>
        {restoring ? (
          <div className="session-restore-status" role="status">
            <span className="session-restore-spinner" />
            <span>Restoring your session…</span>
          </div>
        ) : (
          <>
            <div className="eyebrow"><span className="live-dot" /> POSTAL OPERATIONS</div>
            <h1>Welcome to JK Foundry</h1>
            <p>Sign in with Google to view your service dashboards.</p>
          </>
        )}
        {!restoring && (
          <div className="sign-in-action">
            {["loading", "signingOut"].includes(auth.status) && (
              <span className="sign-in-loading">
                {auth.status === "signingOut" ? "Signing out…" : "Signing in and loading dashboards…"}
              </span>
            )}
            <div className={`sign-in-google-button${["loading", "signingOut"].includes(auth.status) ? " sign-in-google-button--hidden" : ""}`}>
              <GoogleSignIn onCredential={onCredential} />
            </div>
          </div>
        )}
        {!restoring && auth.error && <div className="admin-error sign-in-error" role="alert">{auth.error}</div>}
        {!restoring && !GOOGLE_CLIENT_ID && (
          <p className="sign-in-setup-note">
            Setup is incomplete. Configure VITE_GOOGLE_CLIENT_ID in the deployment environment.
          </p>
        )}
        {!restoring && (
          <span className="sign-in-security">Your access is checked securely by the JK Foundry services API.</span>
        )}
      </section>
    </main>
  );
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [auth, setAuth] = useState({
    status: "restoring",
    error: "",
  });
  const location = useLocation();
  const services = auth.status === "signedIn" ? auth.services : [];
  const selectedServiceId = location.pathname.startsWith("/services/")
    ? decodeURIComponent(location.pathname.slice("/services/".length))
    : "";
  const selectedService = services.find((service) => service.id === selectedServiceId);
  const isAdminPage = location.pathname === "/admin";
  const pageTitle = isAdminPage ? "Manage services" : selectedService?.name || "Overview";

  useEffect(() => {
    let cancelled = false;
    restorePortalSession()
      .then((session) => {
        if (!cancelled) {
          setAuth({ status: "signedIn", ...session, error: "" });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAuth({
            status: "signedOut",
            error: error.message.includes("(401)")
              ? ""
              : error.message,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sidebarOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen]);

  const handleCredential = async (credential) => {
    setAuth({ status: "loading", error: "" });
    try {
      const session = await createPortalSession(credential);
      setAuth({ status: "signedIn", ...session, error: "" });
    } catch (error) {
      setAuth({ status: "error", error: error.message });
    }
  };

  const handleSaveServices = async (nextServices) => {
    if (auth.status !== "signedIn" || auth.role !== "admin") {
      throw new Error("Only an authorized administrator can manage services.");
    }
    const result = await savePortalServices(nextServices);
    setAuth((current) => ({
      ...current,
      services: result.services,
    }));
    return result.services;
  };

  const handleSignOut = async () => {
    window.google?.accounts?.id?.disableAutoSelect();
    setAuth({ status: "signingOut", error: "" });
    try {
      await destroyPortalSession();
      setAuth({ status: "signedOut", error: "" });
    } catch (error) {
      setAuth({ status: "signedOut", error: error.message });
    }
  };

  if (auth.status !== "signedIn") {
    return (
      <SignInPage
        auth={auth}
        onCredential={handleCredential}
      />
    );
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
            aria-controls="primary-navigation"
            aria-expanded={sidebarOpen}
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
