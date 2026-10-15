import {
  CalendarMonthRounded,
  Inventory2Outlined,
  LocalShippingOutlined,
  OpenInNewRounded,
  RefreshRounded,
  ScheduleRounded,
  TaskAltRounded,
  WarningAmberRounded,
} from "@mui/icons-material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getPortalOrders } from "../services/portalApi";

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
    detail: "Known pending kg across open orders",
    icon: LocalShippingOutlined,
  },
  {
    label: "On-time delivery",
    detail: "Completed orders marked on-time by Order Status",
    icon: TaskAltRounded,
  },
];

function parseDate(value) {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
    if (dateOnly) {
      const [, year, month, day] = dateOnly;
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function numberValue(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const parsed = Number(String(value ?? "").replaceAll(",", "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function deliveryLateValue(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["y", "yes", "true", "1"].includes(normalized)) {
    return true;
  }
  if (["n", "no", "false", "0"].includes(normalized)) {
    return false;
  }
  return null;
}

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value) {
  const date = parseDate(value);
  return date
    ? date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "—";
}

function Dashboard({ services }) {
  const orderStatusService = services.find((service) => /order[\s-]*status/i.test(service.name));
  const [orders, setOrders] = useState([]);
  const [dataStatus, setDataStatus] = useState("loading");
  const [dataError, setDataError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  useEffect(() => {
    let cancelled = false;
    getPortalOrders()
      .then((result) => {
        if (!cancelled) {
          setOrders(result.orders);
          setUpdatedAt(result.updatedAt);
          setDataStatus("loaded");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setOrders([]);
          setDataError(error.message);
          setDataStatus("unavailable");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadOrders = useCallback(async () => {
    setDataStatus("loading");
    setDataError("");
    try {
      const result = await getPortalOrders();
      setOrders(result.orders);
      setUpdatedAt(result.updatedAt);
      setDataStatus("loaded");
    } catch (error) {
      setOrders([]);
      setDataError(error.message);
      setDataStatus("unavailable");
    }
  }, []);

  const orderSummary = useMemo(() => {
    const today = new Date();
    const todayKey = localDateKey(today);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndKey = localDateKey(weekEnd);

    const openOrders = orders.filter((order) => numberValue(order.pendingKg) > 0);
    const unknownPendingKgCount = orders.filter((order) => numberValue(order.pendingKg) === null).length;
    const overdueOrders = openOrders.filter((order) => {
      const promisedDate = parseDate(order.promisedDate);
      return promisedDate && localDateKey(promisedDate) < todayKey;
    });
    const dueSoonOrders = openOrders.filter((order) => {
      const promisedDate = parseDate(order.promisedDate);
      if (!promisedDate) {
        return false;
      }
      const promisedKey = localDateKey(promisedDate);
      return promisedKey >= todayKey && promisedKey <= weekEndKey;
    });
    const deliveryStatuses = orders
      .filter((order) => {
        const pendingKg = numberValue(order.pendingKg);
        return pendingKg !== null &&
          pendingKg <= 0 &&
          parseDate(order.actualDate) &&
          deliveryLateValue(order.deliveryLate) !== null;
      })
      .map((order) => deliveryLateValue(order.deliveryLate));
    const onTimeCount = deliveryStatuses.filter((isLate) => !isLate).length;
    const recentOrders = [...orders]
      .sort((left, right) => (
        (parseDate(right.orderDate)?.getTime() || 0) -
        (parseDate(left.orderDate)?.getTime() || 0)
      ))
      .slice(0, 8);

    return {
      openCount: openOrders.length,
      overdueCount: overdueOrders.length,
      dueSoonCount: dueSoonOrders.length,
      pendingWeight: openOrders.reduce((total, order) => total + numberValue(order.pendingKg), 0),
      unknownPendingKgCount,
      onTimeRate: deliveryStatuses.length
        ? Math.round((onTimeCount / deliveryStatuses.length) * 100)
        : null,
      recentOrders,
    };
  }, [orders]);
  const isLoaded = dataStatus === "loaded";
  const metricValues = [
    isLoaded ? orderSummary.openCount.toLocaleString() : "—",
    isLoaded ? orderSummary.overdueCount.toLocaleString() : "—",
    isLoaded ? orderSummary.dueSoonCount.toLocaleString() : "—",
    isLoaded ? `${orderSummary.pendingWeight.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg` : "—",
    isLoaded && orderSummary.onTimeRate !== null ? `${orderSummary.onTimeRate}%` : "—",
  ];

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
        {metrics.map(({ label, detail, icon: Icon }, index) => (
          <article className="overview-metric-card" key={label}>
            <span className="overview-metric-icon"><Icon /></span>
            <div className="overview-metric-heading">
              <h2>{label}</h2>
              <span className={`overview-unavailable-badge${isLoaded ? " overview-available-badge" : ""}`}>
                {isLoaded ? "Live" : dataStatus === "loading" ? "Loading" : "Unavailable"}
              </span>
            </div>
            <p className="overview-metric-value">{metricValues[index]}</p>
            <p className="overview-metric-detail">{detail}</p>
          </article>
        ))}
      </section>

      <section aria-live="polite" className={`panel overview-data-notice${dataStatus === "unavailable" ? " overview-data-notice--warning" : ""}`} role="status">
        <span className="overview-notice-icon">
          {dataStatus === "loaded" ? <TaskAltRounded /> : <ScheduleRounded />}
        </span>
        <div>
          <h2>
            {dataStatus === "loaded"
              ? "Order data loaded"
              : dataStatus === "loading"
                ? "Loading Order Status data…"
                : "Order data is unavailable"}
          </h2>
          <p>
            {dataStatus === "loaded"
              ? `${orders.length.toLocaleString()} order records loaded from the Order Status service.`
              : dataStatus === "loading"
                ? "Connecting securely to the Order Status service."
                : dataError || "The Order Status service did not return usable order data."}
          </p>
          {isLoaded && orderSummary.unknownPendingKgCount > 0 && (
            <p className="overview-data-quality-note">
              Pending kg is missing for {orderSummary.unknownPendingKgCount.toLocaleString()} record(s); those records are excluded from open-order and pending-weight totals.
            </p>
          )}
          {isLoaded && updatedAt && (
            <p className="overview-updated-at">
              Data fetched {new Date(updatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="overview-notice-actions">
          <button
            aria-label="Retry loading order data"
            className="overview-notice-link"
            disabled={dataStatus === "loading"}
            onClick={loadOrders}
            title="Retry"
            type="button"
          >
            <RefreshRounded />
          </button>
          {orderStatusService && (
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
          )}
        </div>
      </section>

      <section className="panel overview-orders-panel">
        <div className="panel-heading">
          <div>
            <h2>Order activity</h2>
            <p>Latest orders from the Order Status service.</p>
          </div>
        </div>
        {isLoaded && orderSummary.recentOrders.length > 0 ? (
          <div className="table-scroll">
            <table className="orders-table overview-order-table">
              <thead>
                <tr><th>ORDER</th><th>CLIENT</th><th>ORDER DATE</th><th>PROMISED</th><th>PENDING KG</th><th>STATUS</th></tr>
              </thead>
              <tbody>
                {orderSummary.recentOrders.map((order) => {
                  const pendingKg = numberValue(order.pendingKg);
                  const promisedDate = parseDate(order.promisedDate);
                  const isOverdue = pendingKg > 0 && promisedDate && localDateKey(promisedDate) < localDateKey(new Date());
                  const status = pendingKg === null
                    ? "Unknown"
                    : pendingKg <= 0
                      ? "Completed"
                      : isOverdue
                        ? "Overdue"
                        : "Open";
                  return (
                    <tr key={order.orderNo}>
                      <td><span className="order-number">{order.orderNo}</span></td>
                      <td><span className="client-name">{order.clientName || "—"}</span></td>
                      <td className="order-date">{formatDate(order.orderDate)}</td>
                      <td className="order-date">{formatDate(order.promisedDate)}</td>
                      <td>{pendingKg === null ? "—" : pendingKg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td><span className={`status-pill status-pill--${status.toLowerCase()}`}><i />{status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overview-empty-state">
            <Inventory2Outlined />
            <strong>
              {dataStatus === "loading"
                ? "Loading order records…"
                : isLoaded
                  ? "No order records returned"
                  : "No order records available"}
            </strong>
            <span>
              {isLoaded
                ? "The Order Status API returned no order records."
                : "Order records will appear here when the service provides valid JSON data."}
            </span>
          </div>
        )}
      </section>

      <footer className="dashboard-footer">
        <span>Order Status data source: {orderStatusService ? orderStatusService.name : "configured API"}</span>
        <span>{isLoaded ? `${orders.length.toLocaleString()} orders` : "Live data unavailable"}</span>
      </footer>
    </div>
  );
}

export default Dashboard;
