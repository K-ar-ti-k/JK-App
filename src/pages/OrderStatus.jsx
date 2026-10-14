import { OpenInNewRounded } from "@mui/icons-material";

const orderStatusUrl =
  "https://script.google.com/macros/s/AKfycbyy9RXEOafUAVQRML2kpyRhxzBL6JHlEXijAhNcyxZe9eK0ehazbpc_a76pkOL9wkjF/exec";

export default function OrderStatus() {
  return (
    <section className="order-status-page">
      <div className="embed-heading">
        <div>
          <div className="eyebrow"><span className="live-dot" /> LIVE WORKSPACE</div>
          <h1>Order status</h1>
          <p>Track and manage your latest orders from one place.</p>
        </div>
        <a className="external-link-button" href={orderStatusUrl} rel="noreferrer" target="_blank">
          Open in new tab <OpenInNewRounded />
        </a>
      </div>
      <div className="embedded-dashboard">
        <iframe src={orderStatusUrl} title="JK Foundry order status dashboard" />
      </div>
    </section>
  );
}
