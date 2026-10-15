import { OpenInNewRounded, RefreshRounded } from "@mui/icons-material";
import { Link } from "react-router-dom";
import { useState } from "react";

function ServiceDashboard({ services, activeServiceId }) {
  const [refreshCounts, setRefreshCounts] = useState({});
  const activeService = services.find((item) => item.id === activeServiceId);

  return (
    <>
      {services.map((service) => {
      const isActive = service.id === activeServiceId;
      return (
        <section
          aria-hidden={!isActive}
          className="order-status-page service-dashboard"
          hidden={!isActive}
          key={service.id}
        >
          <div className="embed-heading">
            <div>
              <div className="eyebrow"><span className="live-dot" /> LIVE WORKSPACE</div>
              <h1>{service.name}</h1>
              <p>View and manage this service dashboard.</p>
            </div>
            <div className="embed-actions">
              <button
                aria-label={`Refresh ${service.name} dashboard`}
                className="external-link-button dashboard-refresh-button"
                onClick={() => setRefreshCounts((counts) => ({
                  ...counts,
                  [service.id]: (counts[service.id] || 0) + 1,
                }))}
                title={`Refresh ${service.name} dashboard`}
                type="button"
              >
                <RefreshRounded />
                Refresh
              </button>
              <a className="external-link-button" href={service.dashboardUrl} rel="noreferrer" target="_blank">
                Open in new tab <OpenInNewRounded />
              </a>
            </div>
          </div>
          <div className="embedded-dashboard">
            <iframe
              key={`${service.id}-${refreshCounts[service.id] || 0}`}
              src={service.dashboardUrl}
              title={`${service.name} dashboard`}
            />
          </div>
        </section>
      );
      })}
      {activeServiceId && !activeService && (
      <section className="service-not-found">
        <div className="eyebrow"><span className="live-dot" /> DASHBOARD NOT FOUND</div>
        <h1>This service is no longer available</h1>
        <p>It may have been removed from this browser&apos;s service list.</p>
        <Link className="text-button" to="/admin">Manage services</Link>
      </section>
      )}
    </>
  );
}

export default ServiceDashboard;
