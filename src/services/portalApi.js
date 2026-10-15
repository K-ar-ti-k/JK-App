export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || "";
export const APPS_SCRIPT_API_URL = import.meta.env.VITE_APPS_SCRIPT_API_URL?.trim() || "";

function requireConfiguration() {
  if (!GOOGLE_CLIENT_ID || !APPS_SCRIPT_API_URL) {
    throw new Error(
      "Portal sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID and VITE_APPS_SCRIPT_API_URL in the deployment environment.",
    );
  }

  let endpoint;
  try {
    endpoint = new URL(APPS_SCRIPT_API_URL);
  } catch {
    throw new Error("The Apps Script API URL is invalid.");
  }

  if (endpoint.protocol !== "https:" || endpoint.hostname !== "script.google.com") {
    throw new Error("The Apps Script API must be a deployed https://script.google.com URL.");
  }
}

export function getPortalServices(credential) {
  requireConfiguration();

  return new Promise((resolve, reject) => {
    const callbackName = `jkFoundryCallback${Date.now()}${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(
        new Error(
          "The Apps Script did not return an API response. In Google Apps Script, deploy a new Web app version with “Execute as: Me” and “Who has access: Anyone”, then update VITE_APPS_SCRIPT_API_URL in Vercel and redeploy. Confirm the URL ends with /exec.",
        ),
      );
    }, 20000);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (result) => {
      cleanup();
      if (!result?.ok) {
        reject(new Error(result?.error || "The services API returned an error."));
        return;
      }
      if (!Array.isArray(result.services) || !["admin", "user"].includes(result.role)) {
        reject(new Error("The services API returned an invalid response."));
        return;
      }
      resolve(result);
    };

    script.onerror = () => {
      cleanup();
      reject(
        new Error(
          "Google blocked the Apps Script API request. Set the Web app access to Anyone, set execution to Me, and use its deployed /exec URL in Vercel.",
        ),
      );
    };

    const endpoint = new URL(APPS_SCRIPT_API_URL);
    endpoint.searchParams.set("credential", credential);
    endpoint.searchParams.set("callback", callbackName);
    script.src = endpoint.toString();
    document.head.append(script);
  });
}

export async function savePortalServices(credential, services) {
  requireConfiguration();
  const body = new URLSearchParams({
    credential,
    services: JSON.stringify(
      services.map(({ name, dashboardUrl }) => ({ name, dashboardUrl })),
    ),
  });

  try {
    await fetch(APPS_SCRIPT_API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
    });
  } catch (error) {
    throw new Error(`Could not send the service update to Apps Script: ${error.message}`, {
      cause: error,
    });
  }

  const expected = services.map(({ name, dashboardUrl }) => ({ name, dashboardUrl }));
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
    }

    const result = await getPortalServices(credential);
    const actual = result.services.map(({ name, dashboardUrl }) => ({ name, dashboardUrl }));
    if (result.role !== "admin") {
      throw new Error("The signed-in Google account does not have admin access.");
    }
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
      return result;
    }
  }

  throw new Error(
    "The update could not be confirmed. Check the Web Master sheet headers and Apps Script execution log.",
  );
}
