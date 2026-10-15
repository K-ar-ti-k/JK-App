import {
  CalendarMonthRounded,
  Inventory2Outlined,
  LocalShippingOutlined,
  OpenInNewRounded,
  ScheduleRounded,
  TaskAltRounded,
  WarningAmberRounded,
} from "@mui/icons-material";

const metrics = [
  {
    label: "Open orders",
    detail: "Orders with pending quantity",
    icon: Inventory2Outlined,
  },
  {
    label: "Overdue orders",
    detail: "Past promised date and still open",
    icon: WarningAmberRounded,
  },
  {
    label: "Due in 7 days",
    detail: "Open orders due soon",
    icon: CalendarMonthRounded,
  },
  {
    label: "Pending weight",
    detail: "Total pending kg",
    icon: LocalShippingOutlined,
  },
  {
    label: "On-time delivery",
    detail: "Actual date vs promised date",
    icon: TaskAltRounded,
  },
];

function Dashboard({ services }) {
  const orderStatusService = services.find((service) => /order[\s-]*status/i.test(service.name));

  return (
    <div className="dashboard-page">
      <section className="welcome-row">
        <div>
          <div className="eyebrow"><span className="live-dot" /> OPERATIONS AT A GLANCE</div>
          <h1>Order overview</h1>
          <p>Key order and delivery indicators from the Order Status service.</p>
        </div>
        {orderStatusService && (
          <a
            className="external-link-button overview-service-link"
            href={orderStatusService.dashboardUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open Order Status <OpenInNewRounded />
          </a>
        )}
      </section>

      <section aria-label="Order metrics" className="overview-metrics-grid">
        {metrics.map(({ label, detail, icon: Icon }) => (
          <article className="overview-metric-card" key={label}>
            <span className="overview-metric-icon"><Icon /></span>
            <div className="overview-metric-heading">
              <h2>{label}</h2>
              <span className="overview-unavailable-badge">Unavailable</span>
            </div>
            <p className="overview-metric-value" aria-label={`${label}: data unavailable`}>—</p>
            <p className="overview-metric-detail">{detail}</p>
          </article>
        ))}
      </section>

      <section aria-live="polite" className="panel overview-data-notice" role="status">
        <span className="overview-notice-icon"><ScheduleRounded /></span>
        <div>
          <h2>Order data isn&apos;t connected yet</h2>
          <p>
            The Order Status dashboard currently provides a web page, not a data feed the portal can read.
            These metrics will remain unavailable until an authenticated data endpoint is connected.
          </p>
        </div>
        {orderStatusService ? (
          <a
            aria-label="Open Order Status dashboard in a new tab"
            className="overview-notice-link"
            href={orderStatusService.dashboardUrl}
            rel="noreferrer"
            target="_blank"
            title="Open Order Status dashboard"
          >
            <OpenInNewRounded />
          </a>
        ) : (
          <span className="overview-notice-missing">Order Status service not configured</span>
        )}
      </section>

      <section className="panel overview-orders-panel">
        <div className="panel-heading">
          <div>
            <h2>Order activity</h2>
            <p>Recent order records will appear here when the data feed is connected.</p>
          </div>
        </div>
        <div className="overview-empty-state">
          <Inventory2Outlined />
          <strong>No order records available</strong>
          <span>We haven&apos;t loaded any order data, so no sample records are shown.</span>
        </div>
      </section>

      <footer className="dashboard-footer">
        <span>Order Status data source: {orderStatusService ? orderStatusService.name : "not configured"}</span>
        <span>Live data not connected</span>
      </footer>
    </div>
  );
}

export default Dashboard;
