const CONFIG = Object.freeze({
  spreadsheetId: "11AnmoJ25OENT_RCCEXz1O5OIy1m5BRRHyWYQ1gVI-mI",
  sheetName: "Web Master",
  googleClientId: "663193946347-fh58m5m6hsnf22fhncothuai77kgkh5m.apps.googleusercontent.com",
  adminEmails: ["mis@jkfoundries.com"],
});

function doGet(e) {
  const callback = e && e.parameter ? e.parameter.callback : "";

  try {
    const user = authenticate_(e && e.parameter ? e.parameter.credential : "");
    const services = readServices_();
    return jsonp_(
      callback,
      { ok: true, email: user.email, role: user.role, services: services },
    );
  } catch (error) {
    return jsonp_(callback, { ok: false, error: publicError_(error) });
  }
}

function doPost(e) {
  try {
    const parameters = e && e.parameter ? e.parameter : {};
    const user = authenticate_(parameters.credential);
    if (user.role !== "admin") {
      throw new Error("Only an authorized administrator can manage services.");
    }

    const services = JSON.parse(parameters.services || "");
    if (!Array.isArray(services)) {
      throw new Error("Services must be a list.");
    }

    const rows = validateServices_(services);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = getServicesSheet_();
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 3).clearContent();
      }
      if (rows.length) {
        sheet.getRange(2, 1, rows.length, 3).setNumberFormat("@");
        sheet.getRange(2, 1, rows.length, 3).setValues(
          rows.map(function (service, index) {
            return [String(index + 1), service.name, service.url];
          }),
        );
      }
    } finally {
      lock.releaseLock();
    }

    return json_({ ok: true, count: rows.length });
  } catch (error) {
    return json_({ ok: false, error: publicError_(error) });
  }
}

function authenticate_(credential) {
  if (!credential || CONFIG.googleClientId.indexOf("REPLACE_WITH_") === 0) {
    throw new Error("Google sign-in is not configured for this portal.");
  }

  const response = UrlFetchApp.fetch(
    "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(credential),
    { muteHttpExceptions: true },
  );
  if (response.getResponseCode() !== 200) {
    throw new Error("Google sign-in expired or could not be verified. Sign in again.");
  }

  const claims = JSON.parse(response.getContentText());
  const expiry = Number(claims.exp);
  if (
    claims.aud !== CONFIG.googleClientId ||
    String(claims.email_verified) !== "true" ||
    !claims.email ||
    !Number.isFinite(expiry) ||
    expiry * 1000 <= Date.now() ||
    (claims.iss !== "accounts.google.com" && claims.iss !== "https://accounts.google.com")
  ) {
    throw new Error("Google could not verify this account for the portal.");
  }

  const email = String(claims.email).toLowerCase();
  const isAdmin = CONFIG.adminEmails.some(function (adminEmail) {
    return adminEmail.toLowerCase() === email;
  });
  return { email: email, role: isAdmin ? "admin" : "user" };
}

function readServices_() {
  const sheet = getServicesSheet_();
  const values = sheet.getDataRange().getDisplayValues();
  if (!values.length) {
    throw new Error("The Web Master sheet is empty. Add its column headers in row 1.");
  }

  const headers = values[0].slice(0, 3).map(normalizeHeader_);
  if (headers[0] !== "srno" || headers[1] !== "systemname" || headers[2] !== "systemlink") {
    throw new Error(
      'Expected row 1 headers in columns A-C: "sr. no.", "system name", "system link".',
    );
  }

  return values.slice(1)
    .filter(function (row) {
      return row[1] && row[2];
    })
    .map(function (row) {
      const name = String(row[1]).trim();
      const url = validateHttpsUrl_(row[2]);
      return { id: serviceId_(url), name: name, dashboardUrl: url };
    });
}

function getServicesSheet_() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const sheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  if (!sheet) {
    throw new Error('The spreadsheet does not contain a "' + CONFIG.sheetName + '" tab.');
  }
  return sheet;
}

function validateServices_(services) {
  const seenNames = {};
  const seenUrls = {};
  return services.map(function (service) {
    const name = String(service && service.name ? service.name : "").trim();
    const url = validateHttpsUrl_(service && service.dashboardUrl);
    if (!name || name.length > 60) {
      throw new Error("Every service needs a name of 1 to 60 characters.");
    }

    const normalizedName = name.toLowerCase();
    if (seenNames[normalizedName]) {
      throw new Error('Each service name must be unique. "' + name + '" is repeated.');
    }
    if (seenUrls[url]) {
      throw new Error("Each dashboard link must be unique.");
    }
    seenNames[normalizedName] = true;
    seenUrls[url] = true;
    return { name: name, url: url };
  });
}

function validateHttpsUrl_(value) {
  const url = String(value || "").trim();
  if (
    url.length > 2048 ||
    !/^https:\/\/[^/\s?#]+(?:[/?#][^\s]*)?$/i.test(url)
  ) {
    throw new Error("Every dashboard link must be a valid HTTPS URL.");
  }
  return url;
}

function serviceId_(url) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    url,
    Utilities.Charset.UTF_8,
  );
  return "service-" + Utilities.base64EncodeWebSafe(digest).replace(/=+$/g, "").slice(0, 20);
}

function normalizeHeader_(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function jsonp_(callback, value) {
  const body = JSON.stringify(value);
  if (!callback) {
    return json_(value);
  }
  if (!/^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/.test(callback)) {
    return json_({ ok: false, error: "Invalid response callback." });
  }
  return ContentService.createTextOutput(callback + "(" + body + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function publicError_(error) {
  console.error(error && error.stack ? error.stack : error);
  return error && error.message ? error.message : "The request could not be completed.";
}
