// Copy these functions into the Order Status Apps Script project.
// If it has no doPost(e), add the doPost(e) below. If it already has one,
// add the portalAction branch to that existing function instead.
// In its existing doGet(e), return jkfOrderStatusPublicGetResponse_(e)
// before any api=orders branch so public GET cannot expose records.

function doPost(e) {
  var parameters = e && e.parameter ? e.parameter : {};
  if (parameters.portalAction === "orders") {
    return jkfOrderStatusSignedResponse_(parameters);
  }
  return jkfOrderStatusJson_({
    error: "Unsupported Order Status API action.",
  });
}

function jkfOrderStatusPublicGetResponse_(event) {
  if (event && event.parameter && event.parameter.api === "orders") {
    return jkfOrderStatusJson_({
      error: "Order records are available only through the authenticated portal.",
    });
  }
  return null;
}

function jkfOrderStatusSignedResponse_(parameters) {
  try {
    jkfVerifyOrderStatusRequest_(parameters);

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet && spreadsheet.getSheetByName("Order Status");
    if (!sheet) {
      throw new Error('The "Order Status" sheet was not found.');
    }

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      throw new Error("The Order Status sheet does not contain its row 2 headers.");
    }

    var orders = data.slice(2).map(function (row) {
      return {
        orderNo: row[2],
        clientName: row[3],
        orderDate: jkfOrderStatusDate_(row[6]),
        itemPattern: row[7],
        quantity: row[8],
        totalWeight: row[10],
        promisedDate: jkfOrderStatusDate_(row[11]),
        actualDate: jkfOrderStatusDate_(row[12]),
        delayedDays: row[13],
        deliveryLate: row[14],
        dispatchPcs: row[15],
        dispatchedKg: row[16],
        pendingKg: row[17],
      };
    }).filter(function (order) {
      return order.orderNo !== null &&
        order.orderNo !== undefined &&
        String(order.orderNo).trim() !== "";
    });

    return jkfOrderStatusJson_(orders);
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jkfOrderStatusJson_({
      error: error && error.message
        ? error.message
        : "The Order Status request could not be completed.",
    });
  }
}

function jkfVerifyOrderStatusRequest_(parameters) {
  var action = String(parameters.portalAction || "");
  var email = String(parameters.portalEmail || "").trim().toLowerCase();
  var timestamp = String(parameters.portalTimestamp || "");
  var nonce = String(parameters.portalNonce || "");
  var services = String(parameters.portalServices || "");
  var signature = String(parameters.portalSignature || "");
  var secret = PropertiesService.getScriptProperties()
    .getProperty("PORTAL_SHARED_SECRET");
  var timestampNumber = Number(timestamp);

  if (
    action !== "orders" ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
    !/^\d{13}$/.test(timestamp) ||
    !Number.isFinite(timestampNumber) ||
    Math.abs(Date.now() - timestampNumber) > 5 * 60 * 1000 ||
    !/^[A-Za-z0-9_-]{20,40}$/.test(nonce) ||
    !/^[A-Za-z0-9_-]{40,50}$/.test(signature) ||
    services !== "" ||
    !secret ||
    secret.length < 32
  ) {
    throw new Error("The signed Order Status request is invalid.");
  }

  var message = [action, email, timestamp, nonce, services].join("\n");
  var expected = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(
      message,
      secret,
      Utilities.Charset.UTF_8,
    ),
  ).replace(/=+$/g, "");
  if (!jkfOrderStatusConstantTimeEquals_(signature, expected)) {
    throw new Error("The signed Order Status request could not be authenticated.");
  }

  var cache = CacheService.getScriptCache();
  var cacheKey = "jkf-orders-request:" + signature;
  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    if (cache.get(cacheKey)) {
      throw new Error("This Order Status request has already been used.");
    }
    cache.put(cacheKey, "1", 300);
  } finally {
    lock.releaseLock();
  }
}

function jkfOrderStatusConstantTimeEquals_(left, right) {
  if (left.length !== right.length) {
    return false;
  }
  var difference = 0;
  for (var index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function jkfOrderStatusDate_(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd",
    );
  }
  return value === null || value === undefined ? "" : value;
}

function jkfOrderStatusJson_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
