import { OpenInNewRounded } from "@mui/icons-material";
import { Link, useParams } from "react-router-dom";

function ServiceDashboard({ services }) {
  const { serviceId } = useParams();
  const service = services.find((item) => item.id === serviceId);

  if (!service) {
    return (
      <section className="service-not-found">
        <div className="eyebrow"><span className="live-dot" /> DASHBOARD NOT FOUND</div>
        <h1>This service is no longer available</h1>
        <p>It may have been removed from this browser&apos;s service list.</p>
        <Link className="text-button" to="/admin">Manage services</Link>
      </section>
    );
  }

  return (
    <section className="order-status-page">
      <div className="embed-heading">
        <div>
          <div className="eyebrow"><span className="live-dot" /> LIVE WORKSPACE</div>
          <h1>{service.name}</h1>
          <p>View and manage this service dashboard.</p>
        </div>
        <a className="external-link-button" href={service.dashboardUrl} rel="noreferrer" target="_blank">
          Open in new tab <OpenInNewRounded />
        </a>
      </div>
      <div className="embedded-dashboard">
        <iframe src={service.dashboardUrl} title={`${service.name} dashboard`} />
      </div>
    </section>
  );
}

export default ServiceDashboard;
