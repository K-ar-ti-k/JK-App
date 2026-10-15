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

function StatCard({ label, value, change, changeDirection, note, icon, active = false, onClick }) {
  const Icon = icons[icon];
  const ChangeIcon = changeDirection === "down" ? ArrowDownwardRounded : ArrowUpwardRounded;

  return (
    <button
      aria-pressed={active}
      className={`stat-card${active ? " stat-card--active" : ""}`}
      onClick={onClick}
      type="button"
    >
      <div className={`stat-icon stat-icon--${icon}`}><Icon /></div>
      <div className="stat-label-row">
        <span>{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot">
        <span className={`stat-change${changeDirection === "down" ? " stat-change--down" : ""}`}>
          <ChangeIcon /> {change}
        </span>
        <span>{note}</span>
      </div>
      <span className="stat-card-action">View matching orders</span>
    </button>
  );
}

export default StatCard;
