import {
  callAppsScript,
  fail,
  parseBody,
  readSession,
  requireAdminRole,
  requireSameOrigin,
  sendJson,
} from "./_lib/session.js";

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }
  if (req.method === "POST" && !requireSameOrigin(req, res)) {
    return;
  }

  try {
    const session = await readSession(req);
    if (!session) {
      sendJson(res, 401, { error: "Your session expired. Sign in again." });
      return;
    }

    if (req.method === "GET") {
      sendJson(res, 200, await callAppsScript("read", session.email));
      return;
    }

    const currentUser = await callAppsScript("read", session.email);
    if (!requireAdminRole(currentUser, res)) {
      return;
    }
    const { services } = parseBody(req);
    if (!Array.isArray(services) || services.length > 100) {
      sendJson(res, 400, { error: "Services must be a list of at most 100 entries." });
      return;
    }
    const result = await callAppsScript("write", session.email, services);
    sendJson(res, 200, result);
  } catch (error) {
    fail(res, error);
  }
}
