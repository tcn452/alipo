/// <reference path="../pb_data/types.d.ts" />

/**
 * WhatsApp Webhook for Alipo (Meta Cloud API)
 * Endpoint: GET/POST /api/whatsapp
 */

// Webhook verification endpoint (Meta GET)
routerAdd("GET", "/api/whatsapp", (c) => {
  const mode = c.queryParam("hub.mode");
  const token = c.queryParam("hub.verify_token");
  const challenge = c.queryParam("hub.challenge");

  const expectedToken = $os.getenv("WHATSAPP_VERIFY_TOKEN") || "alipo_secret_token_123";

  if (mode === "subscribe" && token === expectedToken) {
    return c.string(200, challenge);
  }

  return c.string(403, "Verification failed");
});

// Incoming message handler (Meta POST)
routerAdd("POST", "/api/whatsapp", (c) => {
  const data = $apis.requestInfo(c).data;

  try {
    const entry = data.entry && data.entry[0];
    const change = entry && entry.changes && entry.changes[0];
    const message = change && change.value && change.value.messages && change.value.messages[0];

    if (!message) {
      return c.json(200, { status: "no_message" });
    }

    const from = message.from;
    const body = (message.text ? message.text.body : "").trim().toLowerCase();

    // Simple keyword router
    // "1" or "fuel" -> list available
    // "report" -> reporting instruction
    let replyText = "";
    if (body.includes("fuel") || body === "1") {
      const stations = $app.dao().findRecordsByFilter(
        "stations",
        "latest_status = 'available'",
        "-updated",
        4
      );

      if (stations.length === 0) {
        replyText = "⚠️ Currently no verified stations are reporting fuel available. Visit https://alipo.mw for full map updates.";
      } else {
        replyText = "⛽ *Alipo Fuel Availability:*\n\n";
        for (let s of stations) {
          replyText += `📍 *${s.getString("name")}* (${s.getString("city")})\nQueue: ${s.getString("latest_queue") || "Normal"}\nUpdated: ${s.getString("updated")}\n\n`;
        }
        replyText += "Reply *REPORT* to submit a fuel update or visit https://alipo.mw";
      }
    } else if (body.includes("report") || body === "2") {
      replyText = "To report fuel at a station, visit our fast web form at https://alipo.mw or dial our USSD shortcode *384*265#.";
    } else {
      replyText = "Muli Bwanji! Welcome to *Alipo* (Malawi Fuel Tracker).\n\n" +
                  "Reply with:\n" +
                  "1️⃣ *FUEL* - Check stations with fuel\n" +
                  "2️⃣ *REPORT* - Submit station status\n" +
                  "🌐 Or visit https://alipo.mw for the live interactive map.";
    }

    // Return response JSON acknowledgment
    return c.json(200, { status: "processed", reply: replyText, to: from });
  } catch (err) {
    return c.json(200, { status: "error", message: err.message });
  }
});
