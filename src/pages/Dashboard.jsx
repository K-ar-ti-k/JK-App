import {
  ArrowUpwardRounded,
  ClearRounded,
  CloseRounded,
  EastRounded,
  MoreHorizRounded,
  NorthEastRounded,
  SearchRounded,
  ScheduleRounded,
  TaskAltRounded,
  TrendingUpRounded,
} from "@mui/icons-material";
import { useEffect, useMemo, useRef, useState } from "react";
import StatCard from "../components/StatCard";

const orders = [
  { id: "ORD-2481", client: "Murli Engineering", initials: "ME", color: "lavender", items: "200 pcs", date: "Today, 10:42 AM", status: "In transit" },
  { id: "ORD-2480", client: "Apex Industrial Co.", initials: "AI", color: "peach", items: "84 pcs", date: "Today, 09:18 AM", status: "Processing" },
  { id: "ORD-2479", client: "Northstar Components", initials: "NC", color: "mint", items: "156 pcs", date: "Yesterday, 04:36 PM", status: "Delivered" },
  { id: "ORD-2478", client: "Precision Works Ltd.", initials: "PW", color: "blue", items: "42 pcs", date: "Yesterday, 02:10 PM", status: "Delivered" },
  { id: "ORD-2477", client: "Summit Fabrication", initials: "SF", color: "lavender", items: "96 pcs", date: "Oct 12, 11:24 AM", status: "Processing" },
  { id: "ORD-2476", client: "Pioneer Machine Co.", initials: "PM", color: "peach", items: "128 pcs", date: "Oct 11, 03:05 PM", status: "In transit" },
  { id: "ORD-2475", client: "Atlas Components", initials: "AC", color: "mint", items: "64 pcs", date: "Oct 10, 01:42 PM", status: "Delivered" },
  { id: "ORD-2474", client: "Crestline Industries", initials: "CI", color: "blue", items: "32 pcs", date: "Oct 9, 09:16 AM", status: "Delivered" },
];

const periods = {
  "7": {
    label: "Last 7 days",
    comparison: "vs. previous 7 days",
    total: 316,
    inTransit: 82,
    delivered: 211,
    pending: 13,
    orderChange: "+5.2%",
    transitChange: "+3.8%",
    deliveredChange: "+6.1%",
    pendingChange: "-1.4%",
    onTime: "93.7",
    delayed: 14,
    inProgress: 82,
    deliveryChange: "2.1%",
    chart: [28, 38, 34, 46, 42, 57, 49, 63, 58, 70, 65, 78, 72, 85, 80, 94],
  },
  "30": {
    label: "Last 30 days",
    comparison: "vs. previous 30 days",
    total: 1284,
    inTransit: 346,
    delivered: 892,
    pending: 46,
    orderChange: "+12.8%",
    transitChange: "+8.2%",
    deliveredChange: "+2.4%",
    pendingChange: "-3.1%",
    onTime: "94.8",
    delayed: 38,
    inProgress: 354,
    deliveryChange: "4.8%",
    chart: [34, 42, 37, 53, 48, 59, 51, 66, 60, 72, 64, 82, 76, 88, 79, 96],
  },
  "90": {
    label: "Last 90 days",
    comparison: "vs. previous 90 days",
    total: 3872,
    inTransit: 1018,
    delivered: 2671,
    pending: 183,
    orderChange: "+9.6%",
    transitChange: "+6.4%",
    deliveredChange: "+11.2%",
    pendingChange: "-2.6%",
    onTime: "92.9",
    delayed: 119,
    inProgress: 1082,
    deliveryChange: "2.9%",
    chart: [29, 35, 42, 38, 49, 45, 56, 52, 61, 57, 69, 65, 74, 71, 86, 94],
  },
};

function downloadCsv(filename, headers, rows) {
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function Dashboard() {
  const [periodKey, setPeriodKey] = useState("30");
  const [openMenu, setOpenMenu] = useState("");
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderFilter, setOrderFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const orderDialogRef = useRef(null);
  const ordersSectionRef = useRef(null);
  const period = periods[periodKey];
  const chartPoints = period.chart
    .map((value, index) => `${(index * 720) / (period.chart.length - 1)},${128 - value}`)
    .join(" ");
  const chartDates = useMemo(() => {
    const today = new Date();
    const rangeInDays = Number(periodKey);
    return Array.from({ length: 5 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - Math.round((rangeInDays * (4 - index)) / 4));
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    });
  }, [periodKey]);
  const normalizedOrderSearch = orderSearch.trim().toLowerCase();
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = orderFilter === "all" || order.status === orderFilter;
    const matchesSearch = !normalizedOrderSearch || [order.id, order.client, order.items, order.date, order.status]
      .some((value) => value.toLowerCase().includes(normalizedOrderSearch));
    return matchesStatus && matchesSearch;
  });
  const displayedOrders = showAllOrders ? filteredOrders : filteredOrders.slice(0, 4);
  const isOrderFilterActive = orderFilter !== "all" || Boolean(normalizedOrderSearch);

  const selectOrderFilter = (filter) => {
    setOrderFilter(filter);
    if (filter === "all") {
      setOrderSearch("");
    }
    setShowAllOrders(true);
    ordersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clearOrderFilters = () => {
    setOrderFilter("all");
    setOrderSearch("");
    setShowAllOrders(false);
  };

  useEffect(() => {
    const dialog = orderDialogRef.current;
    if (selectedOrder && dialog && !dialog.open) {
      dialog.showModal();
    }
    return () => {
      if (dialog?.open) {
        dialog.close();
      }
    };
  }, [selectedOrder]);

  const downloadReport = () => {
    downloadCsv(
      `jk-foundry-${periodKey}-day-report.csv`,
      ["Period", "Total orders", "In transit", "Delivered", "Pending", "On-time delivery"],
      [[period.label, period.total, period.inTransit, period.delivered, period.pending, `${period.onTime}%`]],
    );
  };

  const downloadShipmentData = () => {
    downloadCsv(
      `jk-foundry-${periodKey}-day-shipments.csv`,
      ["Order", "Client", "Quantity", "Date", "Status"],
      orders.map((order) => [order.id, order.client, order.items, order.date, order.status]),
    );
    setOpenMenu("");
  };

  const toggleMenu = (menu) => {
    setOpenMenu((current) => (current === menu ? "" : menu));
  };

  return (
    <div className="dashboard-page">
      <section className="welcome-row">
        <div>
          <div className="eyebrow"><span className="live-dot" /> OPERATIONS AT A GLANCE</div>
          <h1>Good morning, team <span className="wave">✦</span></h1>
          <p>Here&apos;s what&apos;s happening across your postal operations today.</p>
        </div>
        <label className="date-button">
          <ScheduleRounded />
          <select
            aria-label="Dashboard reporting period"
            onChange={(event) => {
              setPeriodKey(event.target.value);
              setOpenMenu("");
            }}
            value={periodKey}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <span className="date-caret">⌄</span>
        </label>
      </section>

      <section aria-label="Key performance indicators" className="stats-grid">
        <StatCard
          active={orderFilter === "all" && !orderSearch.trim()}
          change={period.orderChange}
          changeDirection="up"
          icon="orders"
          label="Total orders"
          note={period.comparison}
          onClick={() => selectOrderFilter("all")}
          value={period.total.toLocaleString()}
        />
        <StatCard
          active={orderFilter === "In transit"}
          change={period.transitChange}
          changeDirection="up"
          icon="transit"
          label="In transit"
          note={period.comparison}
          onClick={() => selectOrderFilter("In transit")}
          value={period.inTransit.toLocaleString()}
        />
        <StatCard
          active={orderFilter === "Delivered"}
          change={period.deliveredChange}
          changeDirection="up"
          icon="delivered"
          label="Delivered"
          note={period.comparison}
          onClick={() => selectOrderFilter("Delivered")}
          value={period.delivered.toLocaleString()}
        />
        <StatCard
          active={orderFilter === "Processing"}
          change={period.pendingChange}
          changeDirection="down"
          icon="pending"
          label="Pending"
          note={period.comparison}
          onClick={() => selectOrderFilter("Processing")}
          value={period.pending.toLocaleString()}
        />
      </section>

      <section className="overview-grid">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Shipment overview</h2>
              <p>Order volume across {period.label.toLowerCase()}</p>
            </div>
            <div className="dashboard-menu-wrap">
              <button
                aria-expanded={openMenu === "chart"}
                aria-label="More chart options"
                className="subtle-icon-button"
                onClick={() => toggleMenu("chart")}
                type="button"
              ><MoreHorizRounded /></button>
              {openMenu === "chart" && (
                <div className="dashboard-popover" role="menu">
                  <button onClick={downloadShipmentData} role="menuitem" type="button">Download shipment data</button>
                </div>
              )}
            </div>
          </div>
          <div className="chart-legend">
            <span><i className="legend-dot legend-dot--blue" /> Shipments</span>
            <span className="chart-total">{period.total.toLocaleString()} <small>orders</small></span>
          </div>
          <div className="chart-wrap">
            <div className="chart-y-axis"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
            <div className="chart-plot">
              <div className="chart-grid-lines"><i /><i /><i /><i /><i /></div>
              <svg aria-label={`Shipment volume over ${period.label.toLowerCase()}`} className="shipment-chart" preserveAspectRatio="none" role="img" viewBox="0 0 720 140">
                <defs>
                  <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#5268e8" stopOpacity=".2" />
                    <stop offset="100%" stopColor="#5268e8" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon fill="url(#chartFill)" points={`0,140 ${chartPoints} 720,140`} />
                <polyline fill="none" points={chartPoints} stroke="#5268e8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                <circle cx="720" cy={128 - period.chart[period.chart.length - 1]} fill="#fff" r="5" stroke="#5268e8" strokeWidth="3" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="chart-x-axis">
                {chartDates.map((date) => <span key={date}>{date}</span>)}
              </div>
            </div>
          </div>
          <div className="chart-footer">
            <span><TrendingUpRounded /> <strong>{period.orderChange}</strong> <span>more shipments than the previous period</span></span>
            <button className="text-button" onClick={downloadReport} type="button">Download report <EastRounded /></button>
          </div>
        </article>

        <article className="panel delivery-panel">
          <div className="panel-heading">
            <div>
              <h2>Delivery performance</h2>
              <p>On-time delivery rate</p>
            </div>
            <div className="dashboard-menu-wrap">
              <button
                aria-expanded={openMenu === "delivery"}
                aria-label="More delivery options"
                className="subtle-icon-button"
                onClick={() => toggleMenu("delivery")}
                type="button"
              ><MoreHorizRounded /></button>
              {openMenu === "delivery" && (
                <div className="dashboard-popover delivery-popover" role="status">
                  <strong>Delivery breakdown</strong>
                  <span>{period.delivered.toLocaleString()} delivered in {period.label.toLowerCase()}</span>
                  <span>Goal: 90% on-time delivery</span>
                </div>
              )}
            </div>
          </div>
          <div className="delivery-score">
            <div className="progress-ring" aria-label={`${period.onTime} percent on-time delivery`}>
              <div className="progress-ring-inner">
                <strong>{period.onTime}<span>%</span></strong>
                <small>On time</small>
              </div>
            </div>
            <div className="delivery-details">
              <div><span className="status-indicator status-indicator--green" /><span>On time</span><strong>{period.delivered.toLocaleString()}</strong></div>
              <div><span className="status-indicator status-indicator--amber" /><span>Delayed</span><strong>{period.delayed}</strong></div>
              <div><span className="status-indicator status-indicator--grey" /><span>In progress</span><strong>{period.inProgress.toLocaleString()}</strong></div>
            </div>
          </div>
          <div className="performance-note">
            <span className="performance-icon"><TaskAltRounded /></span>
            <span>Great work! You&apos;re <strong>{period.deliveryChange}</strong> above your delivery goal.</span>
            <NorthEastRounded className="performance-arrow" />
          </div>
        </article>
      </section>

      <section className="panel orders-panel" ref={ordersSectionRef}>
        <div className="panel-heading orders-heading">
          <div>
            <h2>{orderFilter === "all" ? "Orders" : `${orderFilter === "Processing" ? "Pending" : orderFilter} orders`}</h2>
            <p aria-live="polite">
              {filteredOrders.length} sample {filteredOrders.length === 1 ? "order" : "orders"}
              {isOrderFilterActive ? " match your filters" : " shown"}
            </p>
          </div>
          <div className="orders-heading-actions">
            {filteredOrders.length > 4 && (
              <button
                aria-expanded={showAllOrders}
                className="text-button"
                onClick={() => setShowAllOrders((current) => !current)}
                type="button"
              >{showAllOrders ? "Show recent" : "View all"} <EastRounded /></button>
            )}
            {isOrderFilterActive && (
              <button className="text-button clear-filters-button" onClick={clearOrderFilters} type="button">
                Clear filters <ClearRounded />
              </button>
            )}
          </div>
        </div>
        <div className="orders-toolbar">
          <label className="orders-search">
            <SearchRounded />
            <input
              aria-label="Search orders by order number, client, quantity, date, or status"
              onChange={(event) => setOrderSearch(event.target.value)}
              placeholder="Search order or client"
              type="search"
              value={orderSearch}
            />
          </label>
          <label className="orders-status-filter">
            <span>Status</span>
            <select aria-label="Filter orders by status" onChange={(event) => setOrderFilter(event.target.value)} value={orderFilter}>
              <option value="all">All statuses</option>
              <option value="In transit">In transit</option>
              <option value="Processing">Pending</option>
              <option value="Delivered">Delivered</option>
            </select>
          </label>
        </div>
        <div className="table-scroll">
          <table className="orders-table">
            <thead>
              <tr><th>ORDER</th><th>CLIENT</th><th>QUANTITY</th><th>DATE</th><th>STATUS</th><th /></tr>
            </thead>
            <tbody>
              {displayedOrders.length > 0 ? displayedOrders.map((order) => (
                  <tr key={order.id}>
                    <td><span className="order-number">{order.id}</span></td>
                    <td><span className={`client-avatar client-avatar--${order.color}`}>{order.initials}</span><span className="client-name">{order.client}</span></td>
                    <td>{order.items}</td>
                    <td className="order-date">{order.date}</td>
                    <td><span className={`status-pill status-pill--${order.status.toLowerCase().replace(" ", "-")}`}><i />{order.status}</span></td>
                    <td><button aria-label={`View details for ${order.id}`} className="row-more" onClick={() => setSelectedOrder(order)} type="button"><MoreHorizRounded /></button></td>
                  </tr>
                )) : (
                <tr>
                  <td className="orders-empty-state" colSpan="6">No sample orders match. Try another search or clear the filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="dashboard-footer">
        <span>Showing sample dashboard data</span>
        <span>Period: {period.label} <ArrowUpwardRounded /></span>
      </footer>

      {selectedOrder && (
        <dialog
          aria-labelledby="order-details-title"
          aria-modal="true"
          className="order-details-dialog"
          onCancel={(event) => {
            event.preventDefault();
            setSelectedOrder(null);
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedOrder(null);
            }
          }}
          onClose={() => setSelectedOrder(null)}
          ref={orderDialogRef}
        >
          <section className="order-details-card">
            <div className="order-details-heading">
              <div>
                <span className="eyebrow">ORDER DETAILS</span>
                <h2 id="order-details-title">{selectedOrder.id}</h2>
              </div>
              <button aria-label="Close order details" className="subtle-icon-button" onClick={() => setSelectedOrder(null)} type="button">
                <CloseRounded />
              </button>
            </div>
            <dl>
              <div><dt>Client</dt><dd>{selectedOrder.client}</dd></div>
              <div><dt>Quantity</dt><dd>{selectedOrder.items}</dd></div>
              <div><dt>Last update</dt><dd>{selectedOrder.date}</dd></div>
              <div><dt>Status</dt><dd>{selectedOrder.status}</dd></div>
            </dl>
          </section>
        </dialog>
      )}
    </div>
  );
}

export default Dashboard;
