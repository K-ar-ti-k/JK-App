import { createHmac, randomBytes } from "node:crypto";

const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const MAX_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function cookieSettings() {
  const secure = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  return {
    cookieName: secure ? "__Host-jkf_session" : "jkf_session",
    secure,
  };
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Server configuration is missing ${name}.`);
  }
  return value;
}

function sessionSettings() {
  const rawTtl = process.env.SESSION_TTL_SECONDS || String(DEFAULT_SESSION_TTL_SECONDS);
  const ttl = Number(rawTtl);
  if (!Number.isInteger(ttl) || ttl < 60 || ttl > MAX_SESSION_TTL_SECONDS) {
    throw new Error("SESSION_TTL_SECONDS must be between 60 and 2592000.");
  }
  return {
    ttl,
    ...cookieSettings(),
  };
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (typeof origin !== "string") {
    return false;
  }

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const forwardedProtocol = String(req.headers["x-forwarded-proto"] || "http")
    .split(",")[0]
    .trim();
  const protocol = process.env.VERCEL === "1" ? "https" : forwardedProtocol;
  try {
    return new URL(origin).origin === `${protocol}://${host}`;
  } catch {
    return false;
  }
}

export function requireMethod(req, res, method) {
  if (req.method !== method) {
    res.setHeader("Allow", method);
    sendJson(res, 405, { error: "Method not allowed." });
    return false;
  }
  return true;
}

export function requireSameOrigin(req, res) {
  if (isSameOrigin(req)) {
    return true;
  }
  sendJson(res, 403, { error: "Request origin could not be verified." });
  return false;
}

export function parseBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string") {
    return JSON.parse(req.body);
  }
  return {};
}

export function fail(res, error) {
  const status = error.statusCode || 500;
  if (status >= 500) {
    console.error("Portal API request failed:", error);
  }
  sendJson(res, status, {
    error: status >= 500 ? "The portal could not complete the request." : error.message,
  });
}

async function redisCommand(command) {
  const endpoint = new URL(requiredEnv("UPSTASH_REDIS_REST_URL"));
  if (endpoint.protocol !== "https:") {
    throw new Error("UPSTASH_REDIS_REST_URL must use HTTPS.");
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requiredEnv("UPSTASH_REDIS_REST_TOKEN")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  const result = await response.json();
  if (!response.ok || result.error) {
    throw new Error("The session store request failed.");
  }
  return result.result;
}

function sessionKey(id) {
  return `el-foundry:session:${id}`;
}

export async function createSession(email, role) {
  const { ttl } = sessionSettings();
  const id = randomBytes(32).toString("base64url");
  await redisCommand([
    "SET",
    sessionKey(id),
    JSON.stringify({ email, role }),
    "EX",
    String(ttl),
  ]);
  return { id, ttl };
}

export async function readSession(req) {
  const { cookieName } = sessionSettings();
  const cookieHeader = req.headers.cookie || "";
  const prefix = `${cookieName}=`;
  const cookie = cookieHeader.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!cookie) {
    return null;
  }
  const id = cookie.slice(prefix.length);
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(id)) {
    return null;
  }
  const value = await redisCommand(["GET", sessionKey(id)]);
  if (typeof value !== "string") {
    return null;
  }
  try {
    const session = JSON.parse(value);
    if (!session.email || !["admin", "user"].includes(session.role)) {
      return null;
    }
    return { id, ...session };
  } catch {
    return null;
  }
}

export async function deleteSession(id) {
  await redisCommand(["DEL", sessionKey(id)]);
}

export function setSessionCookie(res, id, maxAge) {
  const { cookieName, secure } = sessionSettings();
  const attributes = [
    `${cookieName}=${id || ""}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (secure) {
    attributes.push("Secure");
  }
  res.setHeader("Set-Cookie", attributes.join("; "));
}

export function setClearSessionCookie(res) {
  const { cookieName, secure } = cookieSettings();
  const attributes = [
    `${cookieName}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) {
    attributes.push("Secure");
  }
  res.setHeader("Set-Cookie", attributes.join("; "));
}

function appsScriptSecret() {
  const secret = requiredEnv("PORTAL_SHARED_SECRET");
  if (secret.length < 32) {
    throw new Error("PORTAL_SHARED_SECRET must be at least 32 characters.");
  }
  return secret;
}

function signedParameters(action, email, servicesJson = "") {
  const timestamp = String(Date.now());
  const nonce = randomBytes(18).toString("base64url");
  const message = [action, email, timestamp, nonce, servicesJson].join("\n");
  const signature = createHmac("sha256", appsScriptSecret())
    .update(message, "utf8")
    .digest("base64url");
  return new URLSearchParams({
    portalAction: action,
    portalEmail: email,
    portalTimestamp: timestamp,
    portalNonce: nonce,
    portalServices: servicesJson,
    portalSignature: signature,
  });
}

export async function callAppsScript(action, email, services = undefined) {
  const endpoint = new URL(requiredEnv("APPS_SCRIPT_API_URL"));
  if (endpoint.protocol !== "https:" || endpoint.hostname !== "script.google.com") {
    throw new Error("APPS_SCRIPT_API_URL must be a deployed HTTPS Apps Script URL.");
  }
  const servicesJson = services === undefined ? "" : JSON.stringify(services);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: signedParameters(action, email, servicesJson),
    redirect: "follow",
  });
  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error("Apps Script returned an invalid response.");
  }
  if (!response.ok || !result?.ok) {
    throw new Error(result?.error || "Apps Script could not complete the request.");
  }
  if (
    result.email !== email ||
    !["admin", "user"].includes(result.role) ||
    !Array.isArray(result.services)
  ) {
    throw new Error("Apps Script returned an invalid user or services response.");
  }
  return result;
}

export async function verifyGoogleCredential(credential) {
  if (typeof credential !== "string" || credential.length > 10000) {
    const error = new Error("Google did not provide a valid sign-in credential.");
    error.statusCode = 400;
    throw error;
  }
  const clientId = requiredEnv("GOOGLE_CLIENT_ID");
  const endpoint = new URL("https://oauth2.googleapis.com/tokeninfo");
  endpoint.searchParams.set("id_token", credential);
  const response = await fetch(endpoint);
  if (!response.ok) {
    const error = new Error("Google sign-in expired or could not be verified. Sign in again.");
    error.statusCode = 401;
    throw error;
  }
  const claims = await response.json();
  const expiry = Number(claims.exp);
  if (
    claims.aud !== clientId ||
    String(claims.email_verified) !== "true" ||
    typeof claims.email !== "string" ||
    !Number.isFinite(expiry) ||
    expiry * 1000 <= Date.now() ||
    (claims.iss !== "accounts.google.com" && claims.iss !== "https://accounts.google.com")
  ) {
    const error = new Error("Google could not verify this account for the portal.");
    error.statusCode = 401;
    throw error;
  }
  return claims.email.toLowerCase();
}

export function requireAdminRole(session, res) {
  if (session.role === "admin") {
    return true;
  }
  sendJson(res, 403, { error: "Only an authorized administrator can manage services." });
  return false;
}

export { sendJson };
