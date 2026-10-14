import {
  AddRounded,
  DeleteOutlineRounded,
  EditOutlined,
  OpenInNewRounded,
} from "@mui/icons-material";
import { useState } from "react";

const EMPTY_FORM = { id: "", name: "", dashboardUrl: "" };

function validateDashboardUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function Admin({ services, onSaveServices, storageError }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = Boolean(form.id);

  const startEditing = (service) => {
    setForm(service);
    setFormError("");
    setNotice("");
  };

  const cancelEditing = () => {
    setForm(EMPTY_FORM);
    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    const dashboardUrl = form.dashboardUrl.trim();

    if (!name) {
      setFormError("Enter a service name.");
      return;
    }
    if (!validateDashboardUrl(dashboardUrl)) {
      setFormError("Enter a valid dashboard URL beginning with https://.");
      return;
    }

    const service = {
      id: form.id || `service-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      dashboardUrl,
    };
    const nextServices = isEditing
      ? services.map((item) => (item.id === form.id ? service : item))
      : [...services, service];

    setIsSaving(true);
    setFormError("");
    try {
      await onSaveServices(nextServices);
      setForm(EMPTY_FORM);
      setFormError("");
      setNotice(isEditing ? "Service updated in the shared services sheet." : "Service added to the shared services sheet.");
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (service) => {
    if (!window.confirm(`Remove "${service.name}" from the shared services sheet and all users' sidebars?`)) {
      return;
    }
    setIsSaving(true);
    setFormError("");
    try {
      await onSaveServices(services.filter((item) => item.id !== service.id));
      setNotice("Service removed from the shared services sheet.");
      if (form.id === service.id) {
        cancelEditing();
      }
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="admin-page">
      <div className="admin-heading">
        <div>
          <div className="eyebrow"><span className="live-dot" /> WORKSPACE SETTINGS</div>
          <h1>Manage services</h1>
          <p>Add a dashboard for each service. Services appear in your sidebar.</p>
        </div>
        <span className="service-count">{services.length} {services.length === 1 ? "service" : "services"}</span>
      </div>

      {storageError && <div className="admin-error" role="alert">{storageError}</div>}
      {formError && <div className="admin-error" role="alert">{formError}</div>}
      {notice && !storageError && <div className="admin-success" role="status">{notice}</div>}

      <div className="admin-layout">
        <form className="panel service-form" onSubmit={handleSubmit}>
          <div className="admin-panel-heading">
            <span className="admin-form-icon"><AddRounded /></span>
            <div>
              <h2>{isEditing ? "Edit service" : "Add a service"}</h2>
              <p>{isEditing ? "Update its name or dashboard link." : "Connect a dashboard to the shared workspace."}</p>
            </div>
          </div>

          <label className="admin-field">
            <span>Service name</span>
            <input
              autoComplete="off"
              maxLength={60}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="e.g. Order tracking"
              required
              value={form.name}
            />
          </label>

          <label className="admin-field">
            <span>Dashboard URL</span>
            <input
              autoComplete="url"
              onChange={(event) => setForm({ ...form, dashboardUrl: event.target.value })}
              placeholder="https://script.google.com/..."
              required
              type="url"
              value={form.dashboardUrl}
            />
            <small>Use the published HTTPS link for your Apps Script or dashboard.</small>
          </label>

          <div className="admin-form-actions">
            {isEditing && <button className="admin-secondary-button" disabled={isSaving} onClick={cancelEditing} type="button">Cancel</button>}
            <button className="admin-primary-button" disabled={isSaving || Boolean(storageError)} type="submit">
              {isSaving ? "Saving…" : isEditing ? "Save changes" : "Add service"}
            </button>
          </div>
        </form>

        <section className="panel service-list-panel">
          <div className="admin-panel-heading service-list-heading">
            <div>
              <h2>Your services</h2>
              <p>Dashboard links shared from the Web Master sheet.</p>
            </div>
          </div>
          {services.length === 0 ? (
            <div className="empty-services">
              <span className="empty-services-icon"><AddRounded /></span>
              <strong>No services added yet</strong>
              <span>Add a name and dashboard URL to get started.</span>
            </div>
          ) : (
            <div className="service-list">
              {services.map((service) => (
                <article className="service-list-item" key={service.id}>
                  <span className="service-list-icon">{service.name.slice(0, 1).toUpperCase()}</span>
                  <div className="service-list-copy">
                    <strong>{service.name}</strong>
                    <span title={service.dashboardUrl}>{service.dashboardUrl}</span>
                  </div>
                  <a
                    aria-label={`Open ${service.name} dashboard in a new tab`}
                    className="service-action-button"
                    href={service.dashboardUrl}
                    rel="noreferrer"
                    target="_blank"
                    title="Open dashboard"
                  >
                    <OpenInNewRounded />
                  </a>
                  <button
                    aria-label={`Edit ${service.name}`}
                    className="service-action-button"
                    disabled={isSaving}
                    onClick={() => startEditing(service)}
                    title="Edit service"
                    type="button"
                  >
                    <EditOutlined />
                  </button>
                  <button
                    aria-label={`Remove ${service.name}`}
                    className="service-action-button service-action-button--danger"
                    disabled={isSaving}
                    onClick={() => handleDelete(service)}
                    title="Remove service"
                    type="button"
                  >
                    <DeleteOutlineRounded />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

export default Admin;
