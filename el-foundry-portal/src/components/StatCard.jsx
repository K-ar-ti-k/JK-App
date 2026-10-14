import {
  ArrowDownwardRounded,
  ArrowUpwardRounded,
  Inventory2Outlined,
  LocalShippingOutlined,
  PendingActionsOutlined,
  TaskAltRounded,
} from "@mui/icons-material";

const icons = {
  orders: Inventory2Outlined,
  transit: LocalShippingOutlined,
  delivered: TaskAltRounded,
  pending: PendingActionsOutlined,
};

function StatCard({ label, value, change, changeDirection, note, icon }) {
  const Icon = icons[icon];
  const ChangeIcon = changeDirection === "down" ? ArrowDownwardRounded : ArrowUpwardRounded;

  return (
    <article className="stat-card">
      <div className={`stat-icon stat-icon--${icon}`}><Icon /></div>
      <div className="stat-label-row">
        <span>{label}</span>
        <span className="stat-dot-menu">···</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot">
        <span className={`stat-change${changeDirection === "down" ? " stat-change--down" : ""}`}>
          <ChangeIcon /> {change}
        </span>
        <span>{note}</span>
      </div>
    </article>
  );
}

export default StatCard;
