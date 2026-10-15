export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || "";

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      credentials: "same-origin",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    throw new Error(`Could not connect to the portal API: ${error.message}`, { cause: error });
  }

  let result;
  try {
    result = await response.json();
  } catch (error) {
    throw new Error("The portal API returned an invalid response.", { cause: error });
  }

  if (!response.ok) {
    const error = new Error(result?.error || `The portal API request failed (${response.status}).`);
    error.statusCode = response.status;
    throw error;
  }
  return result;
}

function validateUser(result) {
  if (
    !result?.email ||
    !["admin", "user"].includes(result.role) ||
    !Array.isArray(result.services)
  ) {
    throw new Error("The portal API returned an invalid session.");
  }
  return result;
}

export async function restorePortalSession() {
  return validateUser(await request("/api/auth/session"));
}

export async function createPortalSession(credential) {
  return validateUser(await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ credential }),
  }));
}

export async function destroyPortalSession() {
  await request("/api/auth/logout", { method: "POST" });
}

export async function savePortalServices(services) {
  const result = await request("/api/services", {
    method: "POST",
    body: JSON.stringify({ services }),
  });
  return validateUser(result);
}
