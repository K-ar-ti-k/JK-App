import {
  deleteSession,
  fail,
  readSession,
  requireMethod,
  requireSameOrigin,
  sendJson,
  setClearSessionCookie,
} from "../_lib/session.js";

export default async function handler(req, res) {
  if (!requireMethod(req, res, "POST") || !requireSameOrigin(req, res)) {
    return;
  }

  try {
    const session = await readSession(req);
    if (session) {
      await deleteSession(session.id);
    }
    setClearSessionCookie(res);
    sendJson(res, 200, { ok: true });
  } catch (error) {
    setClearSessionCookie(res);
    fail(res, error);
  }
}
