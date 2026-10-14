import {
  ArrowUpwardRounded,
  EastRounded,
  MoreHorizRounded,
  NorthEastRounded,
  ScheduleRounded,
  TaskAltRounded,
  TrendingUpRounded,
} from "@mui/icons-material";
import StatCard from "../components/StatCard";

const orders = [
  { id: "ORD-2481", client: "Murli Engineering", initials: "ME", color: "lavender", items: "200 pcs", date: "Today, 10:42 AM", status: "In transit" },
  { id: "ORD-2480", client: "Apex Industrial Co.", initials: "AI", color: "peach", items: "84 pcs", date: "Today, 09:18 AM", status: "Processing" },
  { id: "ORD-2479", client: "Northstar Components", initials: "NC", color: "mint", items: "156 pcs", date: "Yesterday, 04:36 PM", status: "Delivered" },
  { id: "ORD-2478", client: "Precision Works Ltd.", initials: "PW", color: "blue", items: "42 pcs", date: "Yesterday, 02:10 PM", status: "Delivered" },
];

const chartValues = [34, 42, 37, 53, 48, 59, 51, 66, 60, 72, 64, 82, 76, 88, 79, 96];
const chartPoints = chartValues.map((value, index) => `${index * 48},${128 - value}`).join(" ");

function Dashboard() {
  return (
    <div className="dashboard-page">
      <section className="welcome-row">
        <div>
          <div className="eyebrow"><span className="live-dot" /> OPERATIONS AT A GLANCE</div>
          <h1>Good morning, team <span className="wave">✦</span></h1>
          <p>Here&apos;s what&apos;s happening across your postal operations today.</p>
        </div>
        <button className="date-button" type="button">
          <ScheduleRounded />
          <span>Today, October 14</span>
          <span className="date-caret">⌄</span>
        </button>
      </section>

      <section aria-label="Key performance indicators" className="stats-grid">
        <StatCard
          change="+12.8%"
          changeDirection="up"
          icon="orders"
          label="Total orders"
          note="vs. last month"
          value="1,284"
        />
        <StatCard
          change="+8.2%"
          changeDirection="up"
          icon="transit"
          label="In transit"
          note="vs. last month"
          value="346"
        />
        <StatCard
          change="+2.4%"
          changeDirection="up"
          icon="delivered"
          label="Delivered"
          note="vs. last month"
          value="892"
        />
        <StatCard
          change="-3.1%"
          changeDirection="down"
          icon="pending"
          label="Pending"
          note="vs. last month"
          value="46"
        />
      </section>

      <section className="overview-grid">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Shipment overview</h2>
              <p>Order volume across the last 30 days</p>
            </div>
            <button aria-label="More chart options" className="subtle-icon-button" type="button">
              <MoreHorizRounded />
            </button>
          </div>
          <div className="chart-legend">
            <span><i className="legend-dot legend-dot--blue" /> Shipments</span>
            <span className="chart-total">1,284 <small>orders</small></span>
          </div>
          <div className="chart-wrap">
            <div className="chart-y-axis"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
            <div className="chart-plot">
              <div className="chart-grid-lines"><i /><i /><i /><i /><i /></div>
              <svg aria-label="Shipment volume trending upward over the last 30 days" className="shipment-chart" preserveAspectRatio="none" role="img" viewBox="0 0 720 140">
                <defs>
                  <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#5268e8" stopOpacity=".2" />
                    <stop offset="100%" stopColor="#5268e8" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon fill="url(#chartFill)" points={`0,140 ${chartPoints} 720,140`} />
                <polyline fill="none" points={chartPoints} stroke="#5268e8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                <circle cx="720" cy={128 - chartValues[chartValues.length - 1]} fill="#fff" r="5" stroke="#5268e8" strokeWidth="3" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="chart-x-axis"><span>Sep 15</span><span>Sep 20</span><span>Sep 25</span><span>Sep 30</span><span>Oct 5</span><span>Oct 10</span><span>Oct 14</span></div>
            </div>
          </div>
          <div className="chart-footer">
            <span><TrendingUpRounded /> <strong>18.6%</strong> <span>more shipments than last month</span></span>
            <button className="text-button" type="button">View report <EastRounded /></button>
          </div>
        </article>

        <article className="panel delivery-panel">
          <div className="panel-heading">
            <div>
              <h2>Delivery performance</h2>
              <p>On-time delivery rate</p>
            </div>
            <button aria-label="More delivery options" className="subtle-icon-button" type="button"><MoreHorizRounded /></button>
          </div>
          <div className="delivery-score">
            <div className="progress-ring" aria-label="94.8 percent on-time delivery">
              <div className="progress-ring-inner">
                <strong>94.8<span>%</span></strong>
                <small>On time</small>
              </div>
            </div>
            <div className="delivery-details">
              <div><span className="status-indicator status-indicator--green" /><span>On time</span><strong>892</strong></div>
              <div><span className="status-indicator status-indicator--amber" /><span>Delayed</span><strong>38</strong></div>
              <div><span className="status-indicator status-indicator--grey" /><span>In progress</span><strong>354</strong></div>
            </div>
          </div>
          <div className="performance-note">
            <span className="performance-icon"><TaskAltRounded /></span>
            <span>Great work! You&apos;re <strong>4.8%</strong> above your delivery goal.</span>
            <NorthEastRounded className="performance-arrow" />
          </div>
        </article>
      </section>

      <section className="panel orders-panel">
        <div className="panel-heading orders-heading">
          <div>
            <h2>Recent orders</h2>
            <p>A quick look at your latest shipments</p>
          </div>
          <button className="text-button" type="button">View all orders <EastRounded /></button>
        </div>
        <div className="table-scroll">
          <table className="orders-table">
            <thead>
              <tr><th>ORDER</th><th>CLIENT</th><th>QUANTITY</th><th>DATE</th><th>STATUS</th><th /></tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td><span className="order-number">{order.id}</span></td>
                  <td><span className={`client-avatar client-avatar--${order.color}`}>{order.initials}</span><span className="client-name">{order.client}</span></td>
                  <td>{order.items}</td>
                  <td className="order-date">{order.date}</td>
                  <td><span className={`status-pill status-pill--${order.status.toLowerCase().replace(" ", "-")}`}><i />{order.status}</span></td>
                  <td><button aria-label={`More actions for ${order.id}`} className="row-more" type="button"><MoreHorizRounded /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="dashboard-footer">
        <span>Showing sample dashboard data</span>
        <span>Last updated just now <ArrowUpwardRounded /></span>
      </footer>
    </div>
  );
}

export default Dashboard;
