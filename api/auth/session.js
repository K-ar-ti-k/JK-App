import {
  callAppsScript,
  fail,
  readSession,
  requireMethod,
  sendJson,
  setClearSessionCookie,
} from "../_lib/session.js";

export default async function handler(req, res) {
  if (!requireMethod(req, res, "GET")) {
    return;
  }

  try {
    const session = await readSession(req);
    if (!session) {
      setClearSessionCookie(res);
      sendJson(res, 401, { error: "Sign in to continue." });
      return;
    }
    const user = await callAppsScript("read", session.email);
    if (user.role !== session.role) {
      const error = new Error("Your account permissions changed. Sign in again.");
      error.statusCode = 401;
      throw error;
    }
    sendJson(res, 200, user);
  } catch (error) {
    if (error.statusCode === 401) {
      setClearSessionCookie(res);
    }
    fail(res, error);
  }
}
