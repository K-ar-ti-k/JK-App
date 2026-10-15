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
    if (parameters.portalAction) {
      return json_(handlePortalRequest_(parameters));
    }

    const user = authenticate_(parameters.credential);
    if (user.role !== "admin") {
      throw new Error("Only an authorized administrator can manage services.");
    }

    const services = JSON.parse(parameters.services || "");
    if (!Array.isArray(services)) {
      throw new Error("Services must be a list.");
    }

    const rows = validateServices_(services);
    writeServices_(rows);
    return json_({ ok: true, count: rows.length });
  } catch (error) {
    return json_({ ok: false, error: publicError_(error) });
  }
}

function handlePortalRequest_(parameters) {
  const user = authenticatePortalRequest_(parameters);
  const action = parameters.portalAction;
  if (action === "read") {
    return {
      ok: true,
      email: user.email,
      role: user.role,
      services: readServices_(),
    };
  }
  if (action !== "write") {
    throw new Error("Unsupported portal API action.");
  }
  if (user.role !== "admin") {
    throw new Error("Only an authorized administrator can manage services.");
  }

  let services;
  try {
    services = JSON.parse(parameters.portalServices || "");
  } catch {
    throw new Error("Services must be a valid JSON list.");
  }
  if (!Array.isArray(services)) {
    throw new Error("Services must be a list.");
  }
  const rows = validateServices_(services);
  writeServices_(rows);
  return {
    ok: true,
    email: user.email,
    role: user.role,
    services: readServices_(),
  };
}

function authenticatePortalRequest_(parameters) {
  const email = String(parameters.portalEmail || "").trim().toLowerCase();
  const timestamp = String(parameters.portalTimestamp || "");
  const nonce = String(parameters.portalNonce || "");
  const action = String(parameters.portalAction || "");
  const services = String(parameters.portalServices || "");
  const signature = String(parameters.portalSignature || "");
  const sharedSecret = PropertiesService.getScriptProperties()
    .getProperty("PORTAL_SHARED_SECRET");
  const timestampNumber = Number(timestamp);

  if (
    !sharedSecret ||
    sharedSecret.length < 32 ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
    !/^\d{13}$/.test(timestamp) ||
    !Number.isFinite(timestampNumber) ||
    Math.abs(Date.now() - timestampNumber) > 5 * 60 * 1000 ||
    !/^[A-Za-z0-9_-]{20,40}$/.test(nonce) ||
    !/^[A-Za-z0-9_-]{40,50}$/.test(signature) ||
    (action !== "read" && action !== "write") ||
    (action === "read" && services !== "")
  ) {
    throw new Error("The portal request could not be authenticated.");
  }

  const message = [action, email, timestamp, nonce, services].join("\n");
  const expected = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(
      message,
      sharedSecret,
      Utilities.Charset.UTF_8,
    ),
  ).replace(/=+$/g, "");
  if (!constantTimeEquals_(signature, expected)) {
    throw new Error("The portal request could not be authenticated.");
  }

  const cache = CacheService.getScriptCache();
  const cacheKey = "portal-request:" + signature;
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    if (cache.get(cacheKey)) {
      throw new Error("This portal request has already been used.");
    }
    cache.put(cacheKey, "1", 300);
  } finally {
    lock.releaseLock();
  }

  const isAdmin = CONFIG.adminEmails.some(function (adminEmail) {
    return adminEmail.toLowerCase() === email;
  });
  return { email: email, role: isAdmin ? "admin" : "user" };
}

function constantTimeEquals_(left, right) {
  if (left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function writeServices_(rows) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getServicesSheet_();
    const values = sheet.getDataRange().getDisplayValues();
    const headers = findHeaders_(values);
    const lastRow = sheet.getLastRow();
    const firstDataRow = headers.rowIndex + 2;
    const rowsToClear = lastRow - firstDataRow + 1;
    if (rowsToClear > 0) {
      headers.columns.forEach(function (columnIndex) {
        sheet.getRange(firstDataRow, columnIndex + 1, rowsToClear, 1).clearContent();
      });
    }
    if (rows.length) {
      const valuesByColumn = [
        rows.map(function (_, index) { return [String(index + 1)]; }),
        rows.map(function (service) { return [service.name]; }),
        rows.map(function (service) { return [service.url]; }),
      ];
      headers.columns.forEach(function (columnIndex, position) {
        const columnRange = sheet.getRange(firstDataRow, columnIndex + 1, rows.length, 1);
        columnRange.setNumberFormat("@");
        columnRange.setValues(valuesByColumn[position]);
      });
    }
  } finally {
    lock.releaseLock();
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
    throw new Error('The "Web Master" tab is empty. Add headers: sr. no., system name, system link.');
  }

  const headers = findHeaders_(values);
  const serialColumn = headers.columns[0];
  const nameColumn = headers.columns[1];
  const urlColumn = headers.columns[2];

  return values.slice(headers.rowIndex + 1)
    .filter(function (row) {
      return row[nameColumn] && row[urlColumn];
    })
    .map(function (row) {
      const name = String(row[nameColumn]).trim();
      const rawUrl = String(row[urlColumn]).trim();
      try {
        const url = validateHttpsUrl_(rawUrl);
        return { id: serviceId_(url), name: name, dashboardUrl: url };
      } catch (error) {
        const serial = row[serialColumn] ? ' (row ' + row[serialColumn] + ')' : "";
        throw new Error(
          'Invalid dashboard link in the "Web Master" tab' + serial +
            ' for "' + name + '": ' + error.message,
        );
      }
    });
}

function findHeaders_(values) {
  const headerNames = {
    serial: ["srno", "serialno", "serialnumber"],
    name: ["systemname"],
    url: ["systemlink"],
  };
  const maxRowsToCheck = Math.min(values.length, 20);

  for (let rowIndex = 0; rowIndex < maxRowsToCheck; rowIndex += 1) {
    const rowHeaders = values[rowIndex].map(normalizeHeader_);
    const columns = [
      findHeaderColumn_(rowHeaders, headerNames.serial),
      findHeaderColumn_(rowHeaders, headerNames.name),
      findHeaderColumn_(rowHeaders, headerNames.url),
    ];
    if (columns.every(function (column) { return column !== -1; })) {
      return { rowIndex: rowIndex, columns: columns };
    }
  }

  const preview = values.slice(0, maxRowsToCheck).map(function (row, index) {
    const cells = row.map(function (value, columnIndex) {
      return value
        ? String.fromCharCode(65 + columnIndex) + ': "' + String(value).trim().slice(0, 60) + '"'
        : "";
    }).filter(Boolean);
    return cells.length ? "row " + (index + 1) + " [" + cells.join(", ") + "]" : "";
  }).filter(Boolean);

  throw new Error(
    'Could not find the "sr. no.", "system name", and "system link" headers on the "Web Master" tab. ' +
      (preview.length ? "Found: " + preview.join("; ") : "The first 20 rows are empty."),
  );
}

function findHeaderColumn_(rowHeaders, acceptedNames) {
  for (let columnIndex = 0; columnIndex < rowHeaders.length; columnIndex += 1) {
    if (acceptedNames.indexOf(rowHeaders[columnIndex]) !== -1) {
      return columnIndex;
    }
  }
  return -1;
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
