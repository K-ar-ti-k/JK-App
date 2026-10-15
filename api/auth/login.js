import {
  callAppsScript,
  createSession,
  fail,
  parseBody,
  requireMethod,
  requireSameOrigin,
  sendJson,
  setSessionCookie,
  verifyGoogleCredential,
} from "../_lib/session.js";

export default async function handler(req, res) {
  if (!requireMethod(req, res, "POST") || !requireSameOrigin(req, res)) {
    return;
  }

  try {
    const { credential } = parseBody(req);
    const email = await verifyGoogleCredential(credential);
    const user = await callAppsScript("read", email);
    const session = await createSession(user.email, user.role);
    setSessionCookie(res, session.id, session.ttl);
    sendJson(res, 200, user);
  } catch (error) {
    fail(res, error);
  }
}
