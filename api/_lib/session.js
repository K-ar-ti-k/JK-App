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
    const error = new Error(`Server configuration is missing ${name}.`);
    error.statusCode = 503;
    error.publicMessage = `Server setup is incomplete: Vercel is missing the ${name} environment variable.`;
    throw error;
  }
  return value;
}

function requiredEnvFrom(names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }
  const namesText = names.map((name) => `\`${name}\``).join(" or ");
  const error = new Error(`Server configuration is missing ${namesText}.`);
  error.statusCode = 503;
  error.publicMessage = `Server setup is incomplete: add ${namesText} to the Vercel project environment variables.`;
  throw error;
}

function sessionSettings() {
  const rawTtl = process.env.SESSION_TTL_SECONDS || String(DEFAULT_SESSION_TTL_SECONDS);
  const ttl = Number(rawTtl);
  if (!Number.isInteger(ttl) || ttl < 60 || ttl > MAX_SESSION_TTL_SECONDS) {
    const error = new Error("SESSION_TTL_SECONDS must be between 60 and 2592000.");
    error.statusCode = 503;
    error.publicMessage = "SESSION_TTL_SECONDS must be between 60 seconds and 30 days (2592000).";
    throw error;
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
    error: error.publicMessage || (status >= 500
      ? "The portal could not complete the request. Check the Vercel Function logs for details."
      : error.message),
  });
}

async function redisCommand(command) {
  const endpoint = new URL(requiredEnvFrom([
    "UPSTASH_REDIS_REST_URL",
    "KV_REST_API_URL",
  ]));
  if (endpoint.protocol !== "https:") {
    throw new Error("The Redis REST URL must use HTTPS.");
  }
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requiredEnvFrom([
          "UPSTASH_REDIS_REST_TOKEN",
          "KV_REST_API_TOKEN",
        ])}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });
  } catch (cause) {
    const error = new Error("The Upstash Redis request could not be reached.", { cause });
    error.statusCode = 503;
    error.publicMessage = "The session store could not be reached. Check the Upstash URL and Vercel network settings.";
    throw error;
  }
  let result;
  try {
    result = await response.json();
  } catch (cause) {
    const error = new Error("Upstash returned an invalid response.", { cause });
    error.statusCode = 502;
    error.publicMessage = "Upstash returned an invalid response. Check the Redis integration settings.";
    throw error;
  }
  if (!response.ok || result.error) {
    const error = new Error(`Upstash Redis rejected a session command (${response.status}).`);
    error.statusCode = 503;
    error.publicMessage = "Upstash rejected the session request. Verify the Redis REST URL, token, and database status.";
    throw error;
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
    const error = new Error("PORTAL_SHARED_SECRET must be at least 32 characters.");
    error.statusCode = 503;
    error.publicMessage = "PORTAL_SHARED_SECRET must contain at least 32 characters and match the Apps Script Script Property.";
    throw error;
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
    const error = new Error("APPS_SCRIPT_API_URL must be a deployed HTTPS Apps Script URL.");
    error.statusCode = 503;
    error.publicMessage = "Vercel's APPS_SCRIPT_API_URL must be the deployed HTTPS Apps Script /exec URL.";
    throw error;
  }
  const servicesJson = services === undefined ? "" : JSON.stringify(services);
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: signedParameters(action, email, servicesJson),
      redirect: "follow",
    });
  } catch (cause) {
    const error = new Error("The Apps Script endpoint could not be reached.", { cause });
    error.statusCode = 502;
    error.publicMessage = "The Apps Script endpoint could not be reached. Check the deployed /exec URL and deployment availability.";
    throw error;
  }
  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch (cause) {
    const error = new Error(`Apps Script returned a non-JSON response (${response.status}).`, { cause });
    error.statusCode = 502;
    error.publicMessage = "Apps Script did not return JSON. Deploy the latest Code.gs as a Web app with access set to Anyone, then check APPS_SCRIPT_API_URL.";
    throw error;
  }
  if (!response.ok || !result?.ok) {
    const error = new Error(result?.error || `Apps Script request failed (${response.status}).`);
    error.statusCode = 502;
    error.publicMessage = result?.error
      ? `Apps Script rejected the request: ${result.error}`
      : `Apps Script request failed (${response.status}). Check its deployment and execution log.`;
    throw error;
  }
  if (
    result.email !== email ||
    !["admin", "user"].includes(result.role) ||
    !Array.isArray(result.services)
  ) {
    const error = new Error("Apps Script returned an invalid user or services response.");
    error.statusCode = 502;
    error.publicMessage = "Apps Script returned an unexpected response. Confirm the latest Code.gs version is deployed.";
    throw error;
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
  let response;
  try {
    response = await fetch(endpoint);
  } catch (cause) {
    const error = new Error("Google token verification could not be reached.", { cause });
    error.statusCode = 502;
    error.publicMessage = "Google could not be reached to verify sign-in. Please retry in a moment.";
    throw error;
  }
  if (!response.ok) {
    const error = new Error("Google sign-in expired or could not be verified. Sign in again.");
    error.statusCode = 401;
    error.publicMessage = error.message;
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
    error.publicMessage = error.message;
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
