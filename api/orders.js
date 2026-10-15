import {
  fail,
  readSession,
  requireMethod,
  sendJson,
} from "./_lib/session.js";

const ORDER_STATUS_API_URL = "https://script.google.com/macros/s/AKfycbyy9RXEOafUAVQRML2kpyRhxzBL6JHlEXijAhNcyxZe9eK0ehazbpc_a76pkOL9wkjF/exec";
const ALLOWED_RESPONSE_HOSTS = new Set(["script.google.com", "script.googleusercontent.com"]);
const MAX_ORDER_RECORDS = 25000;

function unavailable(message) {
  const error = new Error(message);
  error.statusCode = 502;
  error.publicMessage = message;
  return error;
}

function textField(value, maxLength = 200) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim().slice(0, maxLength);
}

function sanitizeOrder(order) {
  if (!order || typeof order !== "object" || Array.isArray(order)) {
    throw unavailable("The Order Status API returned an invalid order record.");
  }
  return {
    orderNo: textField(order.orderNo, 100),
    clientName: textField(order.clientName, 200),
    orderDate: textField(order.orderDate),
    itemPattern: textField(order.itemPattern),
    quantity: order.quantity ?? null,
    totalWeight: order.totalWeight ?? null,
    promisedDate: textField(order.promisedDate),
    actualDate: textField(order.actualDate),
    delayedDays: order.delayedDays ?? null,
    deliveryLate: order.deliveryLate ?? null,
    dispatchPcs: order.dispatchPcs ?? null,
    dispatchedKg: order.dispatchedKg ?? null,
    pendingKg: order.pendingKg ?? null,
  };
}

export default async function handler(req, res) {
  if (!requireMethod(req, res, "GET")) {
    return;
  }

  try {
    const session = await readSession(req);
    if (!session) {
      sendJson(res, 401, { error: "Your session expired. Sign in again." });
      return;
    }

    const endpoint = new URL(ORDER_STATUS_API_URL);
    if (
      endpoint.protocol !== "https:" ||
      endpoint.hostname !== "script.google.com"
    ) {
      throw new Error("The configured Order Status API URL is invalid.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let response;
    try {
      response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
        redirect: "follow",
      });
    } catch (cause) {
      const error = new Error("The Order Status API could not be reached.", { cause });
      error.statusCode = 503;
      error.publicMessage = "Could not reach the Order Status service. Try again later.";
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw unavailable(`The Order Status API returned HTTP ${response.status}.`);
    }
    const finalUrl = new URL(response.url);
    if (finalUrl.protocol !== "https:" || !ALLOWED_RESPONSE_HOSTS.has(finalUrl.hostname)) {
      throw unavailable("The Order Status API redirected to an unexpected destination.");
    }

    let result;
    try {
      result = await response.json();
    } catch {
      throw unavailable("The Order Status URL returned a dashboard page instead of JSON data.");
    }
    if (!Array.isArray(result) || result.length > MAX_ORDER_RECORDS) {
      throw unavailable("The Order Status API must return a JSON array of order records.");
    }

    const orders = result.map(sanitizeOrder).filter((order) => order.orderNo);
    sendJson(res, 200, {
      orders,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    fail(res, error);
  }
}
